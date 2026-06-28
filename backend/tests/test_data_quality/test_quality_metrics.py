"""
Tests for raw quality metric computation.

Covers: missing counts, unique counts, duplicate detection,
outlier detection, constant column detection, dataset-level stats.

No database needed — pure function tests.
"""

import pandas as pd
import pytest
from app.services.data_quality import analyze_dataframe_quality


# ─────────────────────────────────────────────────────────────────────────────
# EDGE CASES
# ─────────────────────────────────────────────────────────────────────────────

def test_empty_dataframe_does_not_crash():
    """Empty dataframe should return safe zero-shaped report."""
    df = pd.DataFrame()
    metrics, insights = analyze_dataframe_quality(df)

    assert metrics["total_rows"] == 0
    assert metrics["total_columns"] == 0
    assert metrics["dataset_health_score"] == 0.0
    assert insights == []


def test_single_row_dataframe():
    """Single row should not crash — minimal viable dataset."""
    df = pd.DataFrame({"name": ["Alice"], "age": [30]})
    metrics, insights = analyze_dataframe_quality(df)

    assert metrics["total_rows"] == 1
    assert metrics["total_columns"] == 2


def test_single_column_dataframe():
    """Single column should profile correctly."""
    df = pd.DataFrame({"value": [1, 2, 3, 4, 5]})
    metrics, insights = analyze_dataframe_quality(df)

    assert metrics["total_columns"] == 1
    assert "value" in metrics["column_health_score"]


def test_all_null_column():
    """Column with all nulls — should not crash, missing% = 100."""
    df = pd.DataFrame({
        "broken": [None, None, None, None, None],
        "good":   [1, 2, 3, 4, 5],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["missing_percent_by_column"]["broken"] == 100.0
    assert metrics["missing_by_column"]["broken"] == 5


def test_mixed_types_in_column_handled_gracefully():
    """Columns with mixed types should not crash the profiler."""
    df = pd.DataFrame({
        "mixed": [1, "text", None, 3.14, True],
    })
    metrics, insights = analyze_dataframe_quality(df)

    assert "mixed" in metrics["column_health_score"]


# ─────────────────────────────────────────────────────────────────────────────
# MISSING VALUES
# ─────────────────────────────────────────────────────────────────────────────

def test_missing_count_accurate():
    """Missing count per column should be exact."""
    df = pd.DataFrame({
        "col_a": [1, None, 3, None, 5],
        "col_b": [None, 2, 3, 4, 5],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["missing_by_column"]["col_a"] == 2
    assert metrics["missing_by_column"]["col_b"] == 1


def test_missing_percent_accurate():
    """Missing percent = (missing_count / total_rows) * 100."""
    df = pd.DataFrame({
        "col": [None, None, 3, 4, 5, 6, 7, 8, 9, 10],  # 2/10 = 20%
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["missing_percent_by_column"]["col"] == 20.0


def test_dataset_missing_percent_is_across_all_cells():
    """Dataset missing % = total missing cells / total cells."""
    df = pd.DataFrame({
        "a": [None, 2, 3, 4, 5],   # 1 missing
        "b": [1, 2, None, 4, None], # 2 missing
    })
    metrics, _ = analyze_dataframe_quality(df)

    # 3 missing out of 10 total cells = 30%
    assert metrics["dataset_missing_percent"] == 30.0


def test_zero_missing_dataset_percent():
    """No missing values → dataset_missing_percent = 0.0"""
    df = pd.DataFrame({
        "a": [1, 2, 3],
        "b": ["x", "y", "z"],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["dataset_missing_percent"] == 0.0


# ─────────────────────────────────────────────────────────────────────────────
# UNIQUE VALUES
# ─────────────────────────────────────────────────────────────────────────────

def test_unique_count_excludes_nulls():
    """unique_count uses dropna=True — nulls not counted as unique values."""
    df = pd.DataFrame({
        "col": [None, "A", "B", "A", None],
    })
    metrics, _ = analyze_dataframe_quality(df)

    # 2 unique non-null values: A, B
    assert metrics["unique_count_by_column"]["col"] == 2


def test_unique_percent_calculated_correctly():
    """unique_percent = (unique_count / total_rows) * 100."""
    df = pd.DataFrame({
        "col": ["A", "B", "C", "A", "B"],  # 3 unique out of 5 = 60%
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["unique_percent_by_column"]["col"] == 60.0


def test_fully_unique_column():
    """Column where every value is unique → unique_percent = 100%"""
    df = pd.DataFrame({
        "user_id": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["unique_percent_by_column"]["user_id"] == 100.0


# ─────────────────────────────────────────────────────────────────────────────
# DUPLICATE ROWS
# ─────────────────────────────────────────────────────────────────────────────

def test_duplicate_rows_detected_correctly():
    """Exact duplicate rows should be counted accurately."""
    df = pd.DataFrame({
        "name":   ["Alice", "Bob", "Alice", "Bob"],
        "age":    [25, 30, 25, 30],
    })
    metrics, _ = analyze_dataframe_quality(df)

    # Rows 0+2 are duplicates, rows 1+3 are duplicates
    # df.duplicated() marks the second occurrence → 2 duplicate rows
    assert metrics["duplicate_rows"] == 2


def test_no_duplicates_returns_zero():
    """Unique rows → duplicate_rows = 0"""
    df = pd.DataFrame({
        "name": ["Alice", "Bob", "Charlie"],
        "age":  [25, 30, 35],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["duplicate_rows"] == 0
    assert metrics["duplicate_percent"] == 0.0


def test_duplicate_percent_calculated_correctly():
    """duplicate_percent = (duplicate_rows / total_rows) * 100"""
    df = pd.DataFrame({
        "val": [1, 2, 1, 2, 3],  # rows 0+2, 1+3 are duplicates → 2 duplicates / 5 rows = 40%
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["duplicate_rows"] == 2
    assert metrics["duplicate_percent"] == 40.0


def test_all_identical_rows():
    """All rows identical → all but first are duplicates."""
    df = pd.DataFrame({
        "a": [1, 1, 1, 1, 1],
        "b": ["x", "x", "x", "x", "x"],
    })
    metrics, _ = analyze_dataframe_quality(df)

    # df.duplicated() marks rows 1-4 as duplicates (keeps first)
    assert metrics["duplicate_rows"] == 4
    assert metrics["duplicate_percent"] == 80.0


# ─────────────────────────────────────────────────────────────────────────────
# CONSTANT COLUMNS
# ─────────────────────────────────────────────────────────────────────────────

def test_constant_column_detected():
    """Column with single unique value → in constant_columns list."""
    df = pd.DataFrame({
        "status": ["active"] * 10,
        "age":    [25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert "status" in metrics["constant_columns"]
    assert "age" not in metrics["constant_columns"]


def test_all_null_column_not_in_constant_columns():
    """
    All-null column is NOT constant — it has no non-null values.
    Constant = unique_count == 1 AND has at least one non-null value.
    """
    df = pd.DataFrame({
        "broken": [None, None, None, None, None],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert "broken" not in metrics["constant_columns"]


def test_two_unique_values_not_constant():
    """Two distinct values → NOT a constant column."""
    df = pd.DataFrame({
        "flag": ["yes", "no", "yes", "no", "yes"],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert "flag" not in metrics["constant_columns"]


# ─────────────────────────────────────────────────────────────────────────────
# OUTLIER DETECTION
# IQR method: values outside Q1 - 1.5*IQR or Q3 + 1.5*IQR
# ─────────────────────────────────────────────────────────────────────────────

def test_outlier_detected_in_numeric_column():
    """One extreme value should be detected as outlier."""
    df = pd.DataFrame({
        "salary": [50000, 52000, 51000, 49000, 53000,
                   50500, 51500, 52500, 49500, 9_999_999],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["outliers_by_column"]["salary"] >= 1


def test_no_outliers_in_uniform_data():
    """Uniformly distributed data should have zero outliers."""
    df = pd.DataFrame({
        "value": list(range(1, 21)),  # 1 to 20, perfectly uniform
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["outliers_by_column"]["value"] == 0


def test_non_numeric_column_excluded_from_outlier_detection():
    """Outlier detection only runs on numeric columns."""
    df = pd.DataFrame({
        "country": ["India", "USA", "UK", "Germany", "France",
                    "Japan", "China", "Brazil", "Canada", "Australia"],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["outliers_by_column"].get("country", 0) == 0


def test_small_column_skips_outlier_detection():
    """
    Columns with fewer than 10 non-null values skip outlier detection.
    Should return 0 — not crash.
    """
    df = pd.DataFrame({
        "tiny": [1, 2, 3, 4, 5],  # only 5 values
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["outliers_by_column"]["tiny"] == 0


# ─────────────────────────────────────────────────────────────────────────────
# COLUMN GROUPINGS
# ─────────────────────────────────────────────────────────────────────────────

def test_numeric_and_categorical_columns_classified_correctly():
    """Numeric and string columns should be grouped correctly."""
    df = pd.DataFrame({
        "age":    [25, 30, 35],
        "salary": [50000, 60000, 70000],
        "name":   ["Alice", "Bob", "Charlie"],
        "status": ["active", "inactive", "active"],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert "age" in metrics["numeric_columns"]
    assert "salary" in metrics["numeric_columns"]
    assert "name" in metrics["categorical_columns"]
    assert "status" in metrics["categorical_columns"]


def test_total_rows_and_columns_accurate():
    """total_rows and total_columns should match the dataframe shape."""
    df = pd.DataFrame({
        "a": [1, 2, 3, 4, 5],
        "b": [6, 7, 8, 9, 10],
        "c": ["x", "y", "z", "w", "v"],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["total_rows"] == 5
    assert metrics["total_columns"] == 3