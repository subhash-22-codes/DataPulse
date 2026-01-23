from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple

import pandas as pd


def _looks_like_id_column_name(col: str) -> bool:
    c = col.lower().strip()
    # good signals
    has_id_keyword = any(k in c for k in ["id", "uuid", "guid", "key"])
    # bad signals (unique but not an ID column)
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


def _top_missing_columns(missing_percent_by_column: Dict[str, float], top_n: int = 5) -> List[Tuple[str, float]]:
    return sorted(missing_percent_by_column.items(), key=lambda x: x[1], reverse=True)[:top_n]


def analyze_dataframe_quality(
    df: pd.DataFrame,
    max_insights: int = 10,
) -> Tuple[Dict[str, Any], List[Dict[str, str]]]:
    """
    Returns:
      quality_report: machine-friendly numbers
      insights: human-friendly messages (rule-based, no ML)
    """

    quality_report: Dict[str, Any] = {
        "missing_by_column": {},
        "missing_percent_by_column": {},
        "unique_count_by_column": {},
        "unique_percent_by_column": {},
        "duplicate_rows": 0,
        "outliers_by_column": {},
        "numeric_columns": [],
        "categorical_columns": [],
    }

    total_rows = int(len(df))

    # classify columns (helps UX + insights)
    num_cols = list(df.select_dtypes(include="number").columns)
    cat_cols = [c for c in df.columns if c not in num_cols]

    quality_report["numeric_columns"] = num_cols
    quality_report["categorical_columns"] = cat_cols

    # Missing + Unique stats
    for col in df.columns:
        s = df[col]

        missing_count = int(s.isna().sum())
        quality_report["missing_by_column"][col] = missing_count
        quality_report["missing_percent_by_column"][col] = (
            round((missing_count / total_rows) * 100, 2) if total_rows > 0 else 0.0
        )

        unique_count = int(s.nunique(dropna=True))
        quality_report["unique_count_by_column"][col] = unique_count
        quality_report["unique_percent_by_column"][col] = (
            round((unique_count / total_rows) * 100, 2) if total_rows > 0 else 0.0
        )

    # Duplicate rows
    try:
        quality_report["duplicate_rows"] = int(df.duplicated().sum())
    except Exception:
        quality_report["duplicate_rows"] = 0

    # Outliers for numeric columns (IQR)
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

    # -------------------------------
    # Insights (human readable)
    # -------------------------------
    insights: List[Dict[str, str]] = []

    # Dataset clean summary
    total_missing_pct = sum(quality_report["missing_percent_by_column"].values())
    dup_rows = quality_report["duplicate_rows"]

    if total_rows > 0 and total_missing_pct == 0 and dup_rows == 0:
        insights.append({
            "type": "DATASET_CLEAN",
            "severity": "low",
            "message": "Dataset looks clean: no missing values and no duplicate rows detected."
        })

    # Missing value insights (only top few)
    top_missing = _top_missing_columns(quality_report["missing_percent_by_column"], top_n=5)
    for col, pct in top_missing:
        if pct >= 30:
            insights.append({"type": "MISSING_VALUES", "severity": "high", "message": f"Column '{col}' has {pct}% missing values."})
        elif pct >= 10:
            insights.append({"type": "MISSING_VALUES", "severity": "medium", "message": f"Column '{col}' has {pct}% missing values."})

    # Duplicate rows insight
    if dup_rows > 0:
        insights.append({
            "type": "DUPLICATES",
            "severity": "medium" if dup_rows < 50 else "high",
            "message": f"Detected {dup_rows} duplicate rows in this dataset."
        })

    # Outlier insights (only highest 3)
    outliers_sorted = sorted(
        quality_report["outliers_by_column"].items(),
        key=lambda x: x[1],
        reverse=True
    )[:3]
    for col, out_cnt in outliers_sorted:
        if out_cnt >= 10:
            insights.append({"type": "OUTLIERS", "severity": "high", "message": f"Column '{col}' has {out_cnt} potential outliers."})
        elif out_cnt >= 1:
            insights.append({"type": "OUTLIERS", "severity": "medium", "message": f"Column '{col}' has {out_cnt} potential outliers."})

    # Numeric columns insight
    chartable_num_cols = [c for c in num_cols if not _looks_like_id_column_name(c)]

    if len(chartable_num_cols) > 0:
        insights.append({
            "type": "NUMERIC_COLUMNS_FOUND",
            "severity": "low",
            "message": f"Detected {len(chartable_num_cols)} numeric columns you can chart: {', '.join(chartable_num_cols[:5])}{'...' if len(chartable_num_cols) > 5 else ''}"
        })


    # Possible ID column (avoid noise like Name/Email/Location)
    if total_rows >= 50:
        for col, upct in quality_report["unique_percent_by_column"].items():
            if upct < 95:
                continue

            s = df[col]

            # skip obvious cases
            if _looks_like_email_series(s) or _looks_like_name_series(s):
                continue

            if _looks_like_id_column_name(col):
                insights.append({
                    "type": "POSSIBLE_ID_COLUMN",
                    "severity": "low",
                    "message": f"Column '{col}' looks like an identifier ({upct}% unique)."
                })

    # cap insights
    return quality_report, insights[:max_insights]
