from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple

import pandas as pd
import numpy as np

MAX_ROWS_ANALYSIS = 100_000

# ─────────────────────────────────────────────────────────────────────────────
# HEURISTIC HELPERS
# ─────────────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
# CARDINALITY HEURISTICS
# Determines whether a column is expected to have high or low uniqueness.
# Used to exempt columns from the low-uniqueness penalty in health scoring.
#
# Design principles:
# - Column name check runs first (cheap, O(1))
# - Data content check runs second (more expensive, samples 30 rows)
# - When in doubt, do NOT exempt — penalize low uniqueness
# - All checks are additive — first match wins
# ─────────────────────────────────────────────────────────────────────────────

# Column name keywords that strongly suggest HIGH cardinality
# (unique per row by design)
_HIGH_CARDINALITY_NAME_KEYWORDS: frozenset[str] = frozenset({
    # Identity
    "id", "uuid", "guid", "uid", "oid", "pk",
    # Keys & references
    "key", "token", "hash", "checksum", "fingerprint", "signature",
    # Codes that are unique
    "serial", "barcode", "sku", "isbn", "iban", "ssn",
    "passport", "license", "registration", "tracking",
    # Personal name identifiers  ← ADDED
    "name", "firstname", "lastname", "fullname",
    "surname", "username", "nickname", "alias",
    # Contact (high cardinality per person)
    "email", "phone", "mobile", "fax", "url", "website", "link",
    # Address (high cardinality)
    "address", "street", "postcode", "zipcode", "zip",
    # Free text
    "description", "comment", "note", "remark", "bio",
    "summary", "detail", "message", "content", "body", "text",
    # Timestamps & versions (often unique)
    "timestamp", "datetime", "created_at", "updated_at",
    "transaction", "order", "invoice", "receipt",
})

# Column name keywords that strongly suggest LOW cardinality
# (few distinct values by design)
_LOW_CARDINALITY_NAME_KEYWORDS: frozenset[str] = frozenset({
    # Geography (bounded sets)
    "country", "nation", "continent", "region", "territory",
    "state", "province", "county", "district", "zone",
    # Classification
    "status", "state", "stage", "phase", "step",
    "type", "kind", "category", "class", "group", "tier", "level",
    "tag", "label", "flag", "mode", "format",
    # Demographics
    "gender", "sex", "marital", "education", "degree",
    "nationality", "language", "currency",
    # Organisation
    "department", "division", "team", "unit", "branch",
    "role", "title", "rank", "grade", "band",
    # Boolean-like
    "is_", "has_", "can_", "active", "enabled", "verified",
    "approved", "deleted", "archived", "published",
    # Priority / severity
    "priority", "severity", "urgency", "impact",
    "rating", "score_band", "quality",
})


def _col_name_suggests_high_cardinality(col: str) -> bool:
    """
    Returns True if the column name contains a keyword associated with
    high-cardinality data (IDs, emails, free text, timestamps, etc.).
    """
    c = col.lower().strip()
    return any(kw in c for kw in _HIGH_CARDINALITY_NAME_KEYWORDS)


def _col_name_suggests_low_cardinality(col: str) -> bool:
    """
    Returns True if the column name contains a keyword associated with
    low-cardinality data (status, type, country, department, etc.).
    These columns should NOT be exempt from the uniqueness penalty.
    """
    c = col.lower().strip()
    return any(kw in c for kw in _LOW_CARDINALITY_NAME_KEYWORDS)


def _looks_like_email_series(s: pd.Series) -> bool:
    """Detects email columns by scanning data content."""
    sample = s.dropna().astype(str).head(30)
    if sample.empty:
        return False
    hits = sum(bool(re.search(r"@.+\.", v)) for v in sample)
    return (hits / len(sample)) >= 0.6


def _looks_like_url_series(s: pd.Series) -> bool:
    """Detects URL/link columns by scanning data content."""
    sample = s.dropna().astype(str).head(30)
    if sample.empty:
        return False
    hits = sum(
        bool(re.match(r"https?://|www\.", v.strip(), re.IGNORECASE))
        for v in sample
    )
    return (hits / len(sample)) >= 0.5


def _looks_like_phone_series(s: pd.Series) -> bool:
    """Detects phone number columns by scanning data content."""
    sample = s.dropna().astype(str).head(30)
    if sample.empty:
        return False
    hits = sum(
        bool(re.search(r"[\+\-\(\)\s\d]{7,15}", v.strip()))
        for v in sample
    )
    return (hits / len(sample)) >= 0.6


def _looks_like_free_text_series(s: pd.Series) -> bool:
    """
    Detects free-text columns by checking average string length.
    Long strings (avg > 40 chars) are almost certainly free text —
    descriptions, comments, notes — and are expected to be unique.
    """
    sample = s.dropna().astype(str).head(50)
    if sample.empty:
        return False
    avg_len = sample.str.len().mean()
    return avg_len > 40


def _looks_like_name_series(s: pd.Series) -> bool:
    """
    Detects personal name columns by scanning data content.
    Matches single-word names (First_Name, Last_Name) and
    full names (John Smith) alike.

    Safe to use without space requirement because
    _col_name_suggests_low_cardinality runs first and blocks
    country/city/status columns from reaching this check.
    """
    sample = s.dropna().astype(str).head(30)
    if sample.empty:
        return False

    hits = sum(
        1 for v in sample
        if 2 <= len(v.strip()) <= 40
        and re.fullmatch(r"[A-Za-z\s\.\-']+", v.strip())
    )
    return (hits / len(sample)) >= 0.5


def _is_high_cardinality_expected(col: str, s: pd.Series) -> bool:
    """
    Master function. Returns True if this column is expected to have
    high uniqueness by nature — and should be EXEMPT from the
    low-uniqueness penalty in health scoring.

    Decision order (first match wins):
    1. Column name → known LOW cardinality keywords  → NOT exempt
    2. Column name → known HIGH cardinality keywords → exempt
    3. Data content → emails                         → exempt
    4. Data content → URLs                           → exempt
    5. Data content → phone numbers                  → exempt
    6. Data content → free text (avg len > 40)       → exempt
    7. Data content → personal names                 → exempt
    8. Default                                       → NOT exempt
    """
    # ── Step 1: Low-cardinality name check (blocks exemption early) ───────────
    # If the column name clearly suggests low cardinality, skip all content
    # checks. This prevents "Country", "Status", "Department" etc. from
    # being wrongly exempted by the name content heuristics below.
    if _col_name_suggests_low_cardinality(col):
        return False

    # ── Step 2: High-cardinality name check ───────────────────────────────────
    # Column name strongly suggests unique-per-row data.
    if _col_name_suggests_high_cardinality(col):
        return True

    # ── Step 3–7: Data content checks ─────────────────────────────────────────
    # Only run if column name gave no signal.
    # Each check samples a small number of rows — cheap enough for production.
    if _looks_like_email_series(s):
        return True

    if _looks_like_url_series(s):
        return True

    if _looks_like_phone_series(s):
        return True

    if _looks_like_free_text_series(s):
        return True

    if _looks_like_name_series(s):
        return True

    # ── Default: do NOT exempt ─────────────────────────────────────────────────
    return False


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH SCORE ENGINE
# Industry-standard scoring modelled after Monte Carlo, Alteryx, Great Expectations
# ─────────────────────────────────────────────────────────────────────────────

def _compute_column_health_score(
    col: str,
    s: pd.Series,
    missing_percent: float,
    unique_count: int,
    total_rows: int,
    outlier_count: int,
    duplicate_rows: int,
    is_numeric: bool,
) -> tuple[float, list[str]]:
    """
    Computes a 0–100 health score for a single column.
    Returns (score, list of penalty reasons for transparency).

    Penalty model:
    ┌─────────────────────────┬──────────────┬────────────────────────────────┐
    │ Factor                  │ Max Penalty  │ Logic                          │
    ├─────────────────────────┼──────────────┼────────────────────────────────┤
    │ Missing values          │ -50 pts      │ Linear: 1% missing = -0.5 pts  │
    │ Constant column         │ -40 pts flat │ unique_count == 1              │
    │ Low uniqueness          │ -20 pts      │ Stepped: <1% / <5% / <20%     │
    │ Outliers (numeric only) │ -15 pts      │ Proportional to outlier %      │
    │ Duplicate rows          │ -10 pts      │ Proportional to duplicate %    │
    └─────────────────────────┴──────────────┴────────────────────────────────┘
    """
    score = 100.0
    reasons: list[str] = []

    if total_rows == 0:
        return 0.0, ["No data"]

    # ── PENALTY 1: MISSING VALUES (up to -50) ─────────────────────────────────
    # 1% missing = -0.5 pts. 100% missing = -50 pts.
    if missing_percent > 0:
        missing_penalty = min(missing_percent * 0.5, 50.0)
        score -= missing_penalty
        reasons.append(f"Missing values: {missing_percent:.1f}% (-{missing_penalty:.1f}pts)")

    # ── PENALTY 2: CONSTANT COLUMN (-40 flat) ────────────────────────────────
    # A column where every non-null value is identical.
    # This is the most severe non-missing penalty — the column carries zero information.
    non_null_count = total_rows - int(s.isna().sum())
    if unique_count == 1 and non_null_count > 0:
        score -= 40.0
        reasons.append("Constant column: same value in every row (-40pts)")

    # ── PENALTY 3: LOW UNIQUENESS (up to -20) ────────────────────────────────
    # Skip if column is expected to be high cardinality (IDs, emails, names)
    # Skip if already flagged as constant (don't double-penalize)
    elif unique_count > 1 and not _is_high_cardinality_expected(col, s):
        unique_pct = (unique_count / total_rows) * 100

        if unique_pct < 1.0:
            # Extremely low variety — almost constant
            uniqueness_penalty = 20.0
            reasons.append(f"Extremely low uniqueness: {unique_pct:.2f}% (-20pts)")
        elif unique_pct < 5.0:
            # Very repetitive
            uniqueness_penalty = 12.0
            reasons.append(f"Very low uniqueness: {unique_pct:.2f}% (-12pts)")
        elif unique_pct < 20.0:
            # Somewhat repetitive — light signal
            uniqueness_penalty = 5.0
            reasons.append(f"Low uniqueness: {unique_pct:.2f}% (-5pts)")
        else:
            uniqueness_penalty = 0.0

        score -= uniqueness_penalty

    # ── PENALTY 4: OUTLIERS (numeric only, up to -15) ────────────────────────
    # Proportional to the % of rows that are outliers.
    # Capped at 15 pts — outliers are a signal, not always a defect.
    if is_numeric and outlier_count > 0 and total_rows > 0:
        outlier_pct = (outlier_count / total_rows) * 100
        outlier_penalty = min(outlier_pct * 0.75, 15.0)
        score -= outlier_penalty
        reasons.append(f"Outliers: {outlier_count} rows ({outlier_pct:.1f}%) (-{outlier_penalty:.1f}pts)")

    # ── PENALTY 5: DUPLICATE ROWS (up to -10) ────────────────────────────────
    # Duplicate rows affect every column equally.
    # Proportional: 10% duplicate rows = -1 pt. 100% = -10 pts.
    if duplicate_rows > 0 and total_rows > 0:
        dup_pct = (duplicate_rows / total_rows) * 100
        dup_penalty = min(dup_pct * 0.1, 10.0)
        score -= dup_penalty
        reasons.append(f"Duplicate rows: {duplicate_rows} ({dup_pct:.1f}%) (-{dup_penalty:.1f}pts)")

    # ── FLOOR ─────────────────────────────────────────────────────────────────
    score = max(round(score, 2), 0.0)
    return score, reasons


# ─────────────────────────────────────────────────────────────────────────────
# CORE METRIC COMPUTATION
# ─────────────────────────────────────────────────────────────────────────────

def _compute_quality_metrics(df: pd.DataFrame) -> Dict[str, Any]:
    total_rows = int(len(df))

    quality_report: Dict[str, Any] = {
        "total_rows": total_rows,
        "total_columns": int(len(df.columns)),
        "dataset_missing_percent": 0.0,
        "missing_by_column": {},
        "missing_percent_by_column": {},
        "unique_count_by_column": {},
        "unique_percent_by_column": {},
        "duplicate_rows": 0,
        "duplicate_percent": 0.0,
        "outliers_by_column": {},
        "numeric_columns": [],
        "categorical_columns": [],
        "constant_columns": [],
        "column_health_score": {},
        "column_health_reasons": {},  # transparency — why did a column score X?
        "dataset_health_score": 0.0,  # overall dataset score
    }

    if total_rows == 0:
        return quality_report

    # ── COLUMN CLASSIFICATION ─────────────────────────────────────────────────
    num_cols = list(df.select_dtypes(include="number").columns)
    cat_cols = [c for c in df.columns if c not in num_cols]
    quality_report["numeric_columns"] = num_cols
    quality_report["categorical_columns"] = cat_cols

    # ── MISSING + UNIQUE STATS ────────────────────────────────────────────────
    total_missing_cells = 0
    total_cells = total_rows * len(df.columns)

    for col in df.columns:
        s = df[col]
        missing_count = int(s.isna().sum())
        total_missing_cells += missing_count

        missing_percent = round((missing_count / total_rows) * 100, 2)
        unique_count = int(s.nunique(dropna=True))
        unique_percent = round((unique_count / total_rows) * 100, 2)

        quality_report["missing_by_column"][col] = missing_count
        quality_report["missing_percent_by_column"][col] = missing_percent
        quality_report["unique_count_by_column"][col] = unique_count
        quality_report["unique_percent_by_column"][col] = unique_percent

    quality_report["dataset_missing_percent"] = (
        round((total_missing_cells / total_cells) * 100, 2)
        if total_cells > 0 else 0.0
    )

    # ── DUPLICATE ROWS ────────────────────────────────────────────────────────
    try:
        dup_count = int(df.duplicated().sum())
        quality_report["duplicate_rows"] = dup_count
        quality_report["duplicate_percent"] = round(
            (dup_count / total_rows) * 100, 2
        ) if total_rows > 0 else 0.0
    except Exception:
        quality_report["duplicate_rows"] = 0
        quality_report["duplicate_percent"] = 0.0

    # ── CONSTANT COLUMNS ─────────────────────────────────────────────────────
    quality_report["constant_columns"] = [
        col for col in df.columns
        if quality_report["unique_count_by_column"][col] == 1
    ]

    # ── OUTLIERS (IQR method, numeric only) ───────────────────────────────────
    for col in num_cols:
        s = df[col].dropna()
        if len(s) < 10:
            quality_report["outliers_by_column"][col] = 0
            continue

        q1 = s.quantile(0.25)
        q3 = s.quantile(0.75)
        iqr = q3 - q1

        if iqr == 0:
            quality_report["outliers_by_column"][col] = 0
            continue

        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        quality_report["outliers_by_column"][col] = int(((s < lower) | (s > upper)).sum())

    # ── COLUMN HEALTH SCORES ──────────────────────────────────────────────────
    for col in df.columns:
        score, reasons = _compute_column_health_score(
            col=col,
            s=df[col],
            missing_percent=quality_report["missing_percent_by_column"][col],
            unique_count=quality_report["unique_count_by_column"][col],
            total_rows=total_rows,
            outlier_count=quality_report["outliers_by_column"].get(col, 0),
            duplicate_rows=quality_report["duplicate_rows"],
            is_numeric=col in num_cols,
        )
        quality_report["column_health_score"][col] = score
        quality_report["column_health_reasons"][col] = reasons

    # ── DATASET HEALTH SCORE ──────────────────────────────────────────────────
    # Average of all column scores — one number to represent overall dataset quality
    if quality_report["column_health_score"]:
        scores = list(quality_report["column_health_score"].values())
        quality_report["dataset_health_score"] = round(
            sum(scores) / len(scores), 2
        )

    return quality_report


# ─────────────────────────────────────────────────────────────────────────────
# INSIGHT GENERATION
# ─────────────────────────────────────────────────────────────────────────────

def _generate_quality_insights(
    df: pd.DataFrame,
    metrics: Dict[str, Any],
    max_insights: int,
) -> List[Dict[str, str]]:

    insights: List[Dict[str, str]] = []
    total_rows = metrics["total_rows"]
    dataset_missing_pct = metrics["dataset_missing_percent"]
    dup_rows = metrics["duplicate_rows"]
    dup_pct = metrics.get("duplicate_percent", 0.0)

    # ── CLEAN DATASET ─────────────────────────────────────────────────────────
    # Only celebrate if truly clean — no missing, no duplicates, no constants
    if (
        total_rows > 0
        and dataset_missing_pct == 0
        and dup_rows == 0
        and not metrics.get("constant_columns")
    ):
        insights.append({
            "type": "DATASET_CLEAN",
            "severity": "low",
            "message": "Dataset looks clean: no missing values, no duplicates, and no constant columns detected."
        })

    # ── DATASET HEALTH SCORE SUMMARY ─────────────────────────────────────────
    dataset_score = metrics.get("dataset_health_score", 100.0)
    if dataset_score < 50:
        insights.append({
            "type": "LOW_DATASET_HEALTH",
            "severity": "high",
            "message": (
                f"Overall dataset health is low ({dataset_score}/100). "
                "Multiple quality issues detected — do not use this data in production without review."
            )
        })
    elif dataset_score < 75:
        insights.append({
            "type": "MEDIUM_DATASET_HEALTH",
            "severity": "medium",
            "message": (
                f"Dataset health is moderate ({dataset_score}/100). "
                "Review flagged columns before using this data in production."
            )
        })

    # ── CONSTANT COLUMNS ─────────────────────────────────────────────────────
    # Constant columns carry zero analytical value — always high severity
    for col in metrics.get("constant_columns", []):
        insights.append({
            "type": "CONSTANT_COLUMN",
            "severity": "high",
            "message": (
                f"Column '{col}' contains the same value in every row. "
                "It carries no analytical value and should be reviewed or dropped."
            )
        })

    # ── MISSING VALUES ────────────────────────────────────────────────────────
    # Industry standard (Monte Carlo, Great Expectations):
    # ≥20% missing = high (data is significantly incomplete)
    # ≥5%  missing = medium (meaningful gap, needs attention)
    # >0%  missing = low (minor, worth monitoring)
    #
    # Note: We report top 5 worst columns only to avoid insight spam
    top_missing = sorted(
        metrics["missing_percent_by_column"].items(),
        key=lambda x: x[1],
        reverse=True,
    )[:5]

    for col, pct in top_missing:
        if pct <= 0:
            continue

        if pct >= 50:
            insights.append({
                "type": "MISSING_VALUES",
                "severity": "high",
                "message": (
                    f"Column '{col}' is more than half empty ({pct}% missing). "
                    "This column is likely unreliable and may indicate a broken upstream source."
                )
            })
        elif pct >= 20:
            insights.append({
                "type": "MISSING_VALUES",
                "severity": "high",
                "message": (
                    f"Column '{col}' has significant missing data ({pct}%). "
                    "Investigate upstream data sources before using this column in analysis."
                )
            })
        elif pct >= 5:
            insights.append({
                "type": "MISSING_VALUES",
                "severity": "medium",
                "message": (
                    f"Column '{col}' has {pct}% missing values. "
                    "Consider imputation or flagging affected rows."
                )
            })
        else:
            insights.append({
                "type": "MISSING_VALUES",
                "severity": "low",
                "message": (
                    f"Column '{col}' has minor missing data ({pct}%). "
                    "Worth monitoring across future uploads."
                )
            })

    # ── DUPLICATES ────────────────────────────────────────────────────────────
    # Judge by PERCENTAGE not raw count.
    # 50 duplicates in 100 rows = 50% = catastrophic
    # 50 duplicates in 1,000,000 rows = 0.005% = negligible
    if dup_rows > 0:
        if dup_pct >= 10:
            insights.append({
                "type": "DUPLICATES",
                "severity": "high",
                "message": (
                    f"Detected {dup_rows} duplicate rows ({dup_pct}% of dataset). "
                    "This level of duplication likely indicates a pipeline or ingestion issue."
                )
            })
        elif dup_pct >= 1:
            insights.append({
                "type": "DUPLICATES",
                "severity": "medium",
                "message": (
                    f"Detected {dup_rows} duplicate rows ({dup_pct}% of dataset). "
                    "Review deduplication logic in your data pipeline."
                )
            })
        else:
            insights.append({
                "type": "DUPLICATES",
                "severity": "low",
                "message": (
                    f"Detected {dup_rows} duplicate rows ({dup_pct}% of dataset). "
                    "Minor — monitor across future uploads."
                )
            })

    # ── LOW UNIQUENESS ────────────────────────────────────────────────────────
    # Only flag when uniqueness is extremely low AND column is not
    # expected to be high cardinality (IDs, emails, names)
    for col, unique_pct in metrics["unique_percent_by_column"].items():
        unique_count = metrics["unique_count_by_column"][col]
        if unique_count <= 1:
            continue  # already flagged as constant above
        if unique_pct < 1.0 and not _is_high_cardinality_expected(col, df[col]):
            insights.append({
                "type": "LOW_UNIQUENESS",
                "severity": "medium",
                "message": (
                    f"Column '{col}' has extremely low uniqueness ({unique_pct:.2f}% unique values). "
                    "It may be over-categorized or contain encoding errors."
                )
            })

    # ── OUTLIERS ──────────────────────────────────────────────────────────────
    # Judge by percentage not raw count.
    # >10% outliers = data corruption signal
    # >2%  outliers = worth investigating
    # >0   outliers = low, informational
    # Report top 3 worst numeric columns only
    outliers_sorted = sorted(
        metrics["outliers_by_column"].items(),
        key=lambda x: x[1],
        reverse=True,
    )[:3]

    for col, out_cnt in outliers_sorted:
        if out_cnt == 0:
            continue

        out_pct = round((out_cnt / total_rows) * 100, 1) if total_rows > 0 else 0

        if out_pct >= 10:
            insights.append({
                "type": "OUTLIERS",
                "severity": "high",
                "message": (
                    f"Column '{col}' has {out_cnt} outliers ({out_pct}% of rows). "
                    "This level is unusually high and may indicate data corruption or a schema mismatch."
                )
            })
        elif out_pct >= 2:
            insights.append({
                "type": "OUTLIERS",
                "severity": "medium",
                "message": (
                    f"Column '{col}' has {out_cnt} outliers ({out_pct}% of rows). "
                    "Review extreme values before using this column in models or reports."
                )
            })
        else:
            insights.append({
                "type": "OUTLIERS",
                "severity": "low",
                "message": (
                    f"Column '{col}' has {out_cnt} potential outlier(s) ({out_pct}%). "
                    "Minor — worth a quick check."
                )
            })

    # ── NUMERIC COLUMNS READY FOR CHARTING ───────────────────────────────────
    # Informational — helps users know what they can visualize
    chartable_num_cols = [
        c for c in metrics["numeric_columns"]
        if not _col_name_suggests_high_cardinality(c)
    ]
    if chartable_num_cols:
        insights.append({
            "type": "NUMERIC_COLUMNS_FOUND",
            "severity": "low",
            "message": (
                f"Found {len(chartable_num_cols)} numeric column(s) ready for charting: "
                f"{', '.join(chartable_num_cols[:5])}"
                f"{'...' if len(chartable_num_cols) > 5 else '.'}"
            )
        })

    return insights[:max_insights]

# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def analyze_dataframe_quality(
    df: pd.DataFrame,
    max_insights: int = 10,
) -> Tuple[Dict[str, Any], List[Dict[str, str]]]:
    """
    Main entry point. Returns (quality_report, insights).
    Called by tasks.py → _compute_analysis().
    """
    if len(df) > MAX_ROWS_ANALYSIS:
        df = df.sample(n=MAX_ROWS_ANALYSIS, random_state=42)

    metrics = _compute_quality_metrics(df)
    insights = _generate_quality_insights(df, metrics, max_insights)

    return metrics, insights