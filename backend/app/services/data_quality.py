from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple

import pandas as pd


MAX_ROWS_ANALYSIS = 100_000


# Heuristic Helpers

def _looks_like_id_column_name(col: str) -> bool:
    c = col.lower().strip()
    has_id_keyword = any(k in c for k in ["id", "uuid", "guid", "key"])
    is_bad = any(k in c for k in ["email", "name", "location", "address", "city"])
    return has_id_keyword and not is_bad


def _looks_like_email_series(s: pd.Series) -> bool:
    sample = s.dropna().astype(str).head(30)
    if sample.empty:
        return False
    hits = sum(bool(re.search(r"@.+\.", v)) for v in sample)
    return (hits / len(sample)) >= 0.6


def _looks_like_name_series(s: pd.Series) -> bool:
    sample = s.dropna().astype(str).head(30)
    if sample.empty:
        return False

    hits = 0
    for v in sample:
        v = v.strip()
        if 2 <= len(v) <= 40 and re.fullmatch(r"[A-Za-z\s\.\-']+", v):
            hits += 1

    return (hits / len(sample)) >= 0.6


# Core Metric Computation

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
        "outliers_by_column": {},
        "numeric_columns": [],
        "categorical_columns": [],
        "column_health_score": {},
    }

    if total_rows == 0:
        return quality_report

    # Column classification
    num_cols = list(df.select_dtypes(include="number").columns)
    cat_cols = [c for c in df.columns if c not in num_cols]

    quality_report["numeric_columns"] = num_cols
    quality_report["categorical_columns"] = cat_cols

    # Missing + Unique stats
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

    # Dataset-level missing %
    quality_report["dataset_missing_percent"] = (
        round((total_missing_cells / total_cells) * 100, 2)
        if total_cells > 0 else 0.0
    )

    # Duplicate rows
    try:
        quality_report["duplicate_rows"] = int(df.duplicated().sum())
    except Exception:
        quality_report["duplicate_rows"] = 0

    # Outliers (IQR method)
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

        outlier_count = int(((s < lower) | (s > upper)).sum())
        quality_report["outliers_by_column"][col] = outlier_count

    # Column health score
    for col in df.columns:
        score = 100

        score -= quality_report["missing_percent_by_column"][col]

        if col in quality_report["outliers_by_column"] and total_rows > 0:
            outliers = quality_report["outliers_by_column"][col]
            outlier_percent = (outliers / total_rows) * 100
            score -= min(outlier_percent, 20)

        score = max(round(score, 2), 0)
        quality_report["column_health_score"][col] = score

    return quality_report

# Insight Generation

def _generate_quality_insights(
    df: pd.DataFrame,
    metrics: Dict[str, Any],
    max_insights: int
) -> List[Dict[str, str]]:

    insights: List[Dict[str, str]] = []

    total_rows = metrics["total_rows"]
    dataset_missing_pct = metrics["dataset_missing_percent"]
    dup_rows = metrics["duplicate_rows"]

    if total_rows > 0 and dataset_missing_pct == 0 and dup_rows == 0:
        insights.append({
            "type": "DATASET_CLEAN",
            "severity": "low",
            "message": "Dataset looks clean: no missing values and no duplicate rows detected."
        })

    # Missing insights (top 5)
    top_missing = sorted(
        metrics["missing_percent_by_column"].items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]

    for col, pct in top_missing:
        if pct >= 30:
            insights.append({
                "type": "MISSING_VALUES",
                "severity": "high",
                "message": f"Column '{col}' has {pct}% missing values."
            })
        elif pct >= 10:
            insights.append({
                "type": "MISSING_VALUES",
                "severity": "medium",
                "message": f"Column '{col}' has {pct}% missing values."
            })

    # Constant column detection
    for col, unique_count in metrics["unique_count_by_column"].items():
        if unique_count == 1 and total_rows > 0:
            insights.append({
                "type": "CONSTANT_COLUMN",
                "severity": "medium",
                "message": f"Column '{col}' contains the same value across all rows."
            })

    # Duplicate insight
    if dup_rows > 0:
        insights.append({
            "type": "DUPLICATES",
            "severity": "medium" if dup_rows < 50 else "high",
            "message": f"Detected {dup_rows} duplicate rows in this dataset."
        })

    # Outlier insights (top 3)
    outliers_sorted = sorted(
        metrics["outliers_by_column"].items(),
        key=lambda x: x[1],
        reverse=True
    )[:3]

    for col, out_cnt in outliers_sorted:
        if out_cnt >= 10:
            insights.append({
                "type": "OUTLIERS",
                "severity": "high",
                "message": f"Column '{col}' has {out_cnt} potential outliers."
            })
        elif out_cnt >= 1:
            insights.append({
                "type": "OUTLIERS",
                "severity": "medium",
                "message": f"Column '{col}' has {out_cnt} potential outliers."
            })

    # Numeric column suggestion
    chartable_num_cols = [
        c for c in metrics["numeric_columns"]
        if not _looks_like_id_column_name(c)
    ]

    if chartable_num_cols:
        insights.append({
            "type": "NUMERIC_COLUMNS_FOUND",
            "severity": "low",
            "message": (
                f"Detected {len(chartable_num_cols)} numeric columns you can chart: "
                f"{', '.join(chartable_num_cols[:5])}"
                f"{'...' if len(chartable_num_cols) > 5 else ''}"
            )
        })

    return insights[:max_insights]



# Public API

def analyze_dataframe_quality(
    df: pd.DataFrame,
    max_insights: int = 10,
) -> Tuple[Dict[str, Any], List[Dict[str, str]]]:

    # Performance guard for free-tier infra
    if len(df) > MAX_ROWS_ANALYSIS:
        df = df.sample(n=MAX_ROWS_ANALYSIS, random_state=42)

    metrics = _compute_quality_metrics(df)
    insights = _generate_quality_insights(df, metrics, max_insights)

    return metrics, insights
