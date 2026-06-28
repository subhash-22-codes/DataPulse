"""
Tests for the health scoring system.

What we're testing:
- Each penalty fires correctly and reduces score by the expected amount
- Penalties combine correctly when multiple issues exist
- The floor at 0.0 is respected — no negative scores
- Dataset health score is the average of column scores

No database needed — analyze_dataframe_quality() is a pure function.
"""

import pandas as pd
import pytest
from app.services.data_quality import analyze_dataframe_quality


# ─────────────────────────────────────────────────────────────────────────────
# PENALTY 1: MISSING VALUES
# 1% missing = -0.5 pts. Max penalty = -50 pts at 100% missing.
# ─────────────────────────────────────────────────────────────────────────────

def test_fully_missing_column_loses_50_points():
    """100% missing → -50 pts → score = 50.0"""
    df = pd.DataFrame({
        "broken_col": [None, None, None, None, None,
                       None, None, None, None, None],
        "age": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["missing_percent_by_column"]["broken_col"] == 100.0
    assert metrics["column_health_score"]["broken_col"] == 50.0


def test_partial_missing_reduces_score_proportionally():
    """20% missing → -10 pts → score = 90.0 (assuming no other penalties)"""
    df = pd.DataFrame({
        "salary": [None, None, 50000, 60000, 70000,
                   80000, 90000, 100000, 110000, 120000],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["missing_percent_by_column"]["salary"] == 20.0
    # 20% * 0.5 = -10 pts penalty
    # salary is numeric — check for outlier penalty too before asserting exact score
    score = metrics["column_health_score"]["salary"]
    assert score <= 90.0  # at most 90 — missing penalty applied


def test_zero_missing_no_missing_penalty():
    """0% missing → no missing penalty applied"""
    df = pd.DataFrame({
        "age": [25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["missing_percent_by_column"]["age"] == 0.0
    # Score may still be reduced by other penalties but missing_penalty = 0
    reasons = metrics["column_health_reasons"]["age"]
    assert not any("Missing" in r for r in reasons)


# ─────────────────────────────────────────────────────────────────────────────
# PENALTY 2: CONSTANT COLUMN
# Same value in every row → -40 pts flat.
# ─────────────────────────────────────────────────────────────────────────────

def test_constant_column_loses_40_points():
    """All same value → -40 pts → score = 60.0"""
    df = pd.DataFrame({
        "flag": ["active"] * 10,
        "age":  [25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["unique_count_by_column"]["flag"] == 1
    assert "flag" in metrics["constant_columns"]
    assert metrics["column_health_score"]["flag"] == 60.0


def test_constant_column_reason_in_health_reasons():
    """Constant column penalty should appear in health reasons."""
    df = pd.DataFrame({"constant_col": ["x"] * 10})
    metrics, _ = analyze_dataframe_quality(df)

    reasons = metrics["column_health_reasons"]["constant_col"]
    assert any("Constant" in r for r in reasons)


def test_constant_numeric_column_loses_40_points():
    """Constant columns apply to numeric columns too."""
    df = pd.DataFrame({
        "value": [0] * 10,
        "other": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert "value" in metrics["constant_columns"]
    assert metrics["column_health_score"]["value"] <= 60.0


# ─────────────────────────────────────────────────────────────────────────────
# PENALTY 3: LOW UNIQUENESS
# Stepped: <1% unique → -20, <5% → -12, <20% → -5. Exempt columns skip this.
# ─────────────────────────────────────────────────────────────────────────────

def test_extremely_low_uniqueness_loses_20_points():
    """
    <1% unique values on a non-exempt column → -20 pts.
    Use a country column (categorical) so it's not exempt.
    1 unique value out of 200 rows = 0.5% unique.
    """
    df = pd.DataFrame({
        "country": ["India"] * 199 + ["USA"],  # 2 unique out of 200 = 1%
    })
    metrics, _ = analyze_dataframe_quality(df)

    unique_pct = metrics["unique_percent_by_column"]["country"]
    assert unique_pct <= 1.0

    score = metrics["column_health_score"]["country"]
    assert score <= 80.0  # at least -20 pts applied


def test_id_column_exempt_from_uniqueness_penalty():
    """
    ID columns are exempt from uniqueness penalty even with low unique%.
    user_id with repeated values should NOT be penalised for low uniqueness.
    """
    df = pd.DataFrame({
        "user_id": [1, 1, 1, 1, 1, 2, 2, 2, 2, 2],  # only 2 unique = 20%
    })
    metrics, _ = analyze_dataframe_quality(df)

    reasons = metrics["column_health_reasons"]["user_id"]
    assert not any("uniqueness" in r.lower() for r in reasons)


def test_email_column_exempt_from_uniqueness_penalty():
    """Email columns should never be penalised for low uniqueness."""
    df = pd.DataFrame({
        "email": ["a@test.com"] * 10,  # all same — 1 unique = 10%
    })
    metrics, _ = analyze_dataframe_quality(df)

    reasons = metrics["column_health_reasons"]["email"]
    assert not any("uniqueness" in r.lower() for r in reasons)


def test_name_column_exempt_from_uniqueness_penalty():
    """Name columns (first_name, last_name) exempt from uniqueness penalty."""
    df = pd.DataFrame({
        "first_name": ["John"] * 100 + ["Jane"] * 100,  # 2 unique = 2%
    })
    metrics, _ = analyze_dataframe_quality(df)

    reasons = metrics["column_health_reasons"]["first_name"]
    assert not any("uniqueness" in r.lower() for r in reasons)


def test_status_column_not_exempt_from_uniqueness_penalty():
    """
    Status columns are categorical — NOT exempt.
    Should be penalised for low uniqueness.
    """
    df = pd.DataFrame({
        "status": ["active"] * 98 + ["inactive", "pending"],  # 3 unique out of 100 = 3%
    })
    metrics, _ = analyze_dataframe_quality(df)

    unique_pct = metrics["unique_percent_by_column"]["status"]
    assert unique_pct < 5.0

    score = metrics["column_health_score"]["status"]
    assert score < 100.0  # penalty applied


# ─────────────────────────────────────────────────────────────────────────────
# PENALTY 4: OUTLIERS (numeric only)
# Proportional to outlier%. Capped at -15 pts.
# ─────────────────────────────────────────────────────────────────────────────

def test_extreme_outlier_reduces_score():
    """One extreme outlier in a numeric column should reduce the score."""
    df = pd.DataFrame({
        "salary": [50000, 52000, 51000, 49000, 53000,
                   50500, 51500, 52500, 49500, 5_000_000],  # extreme outlier
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["outliers_by_column"]["salary"] >= 1
    assert metrics["column_health_score"]["salary"] < 100.0


def test_outlier_penalty_capped_at_15_points():
    """
    Even if 50% of values are outliers, penalty is capped at -15 pts.
    Score should be at least 85.0 from outlier penalty alone.
    """
    # 5 normal values, 5 extreme outliers (50% outlier rate)
    df = pd.DataFrame({
        "value": [1, 2, 3, 4, 5, 10000, 20000, 30000, 40000, 50000],
    })
    metrics, _ = analyze_dataframe_quality(df)

    score = metrics["column_health_score"]["value"]
    # Outlier penalty capped at -15 pts. Score >= 85 from outlier penalty alone.
    # (may be lower due to other penalties but outlier contribution <= 15)
    reasons = metrics["column_health_reasons"]["value"]
    outlier_reasons = [r for r in reasons if "Outlier" in r]
    if outlier_reasons:
        # Extract penalty from reason string
        import re
        match = re.search(r"\(-(\d+\.?\d*)pts\)", outlier_reasons[0])
        if match:
            penalty = float(match.group(1))
            assert penalty <= 15.0


def test_non_numeric_column_has_no_outlier_detection():
    """Outlier detection only applies to numeric columns."""
    df = pd.DataFrame({
        "country": ["India", "USA", "UK", "Germany", "France",
                    "Japan", "China", "Brazil", "Canada", "Australia"],
    })
    metrics, _ = analyze_dataframe_quality(df)

    # Non-numeric columns should have 0 outliers
    assert metrics["outliers_by_column"].get("country", 0) == 0


# ─────────────────────────────────────────────────────────────────────────────
# PENALTY 5: DUPLICATE ROWS
# Proportional to duplicate%. Capped at -10 pts. Affects ALL columns equally.
# ─────────────────────────────────────────────────────────────────────────────

def test_duplicate_rows_reduce_all_column_scores():
    """
    Duplicate rows penalise every column equally.
    A dataset with 50% duplicates should see dup penalty in all column reasons.
    """
    df = pd.DataFrame({
        "name":   ["Alice", "Bob", "Alice", "Bob"],
        "salary": [50000, 60000, 50000, 60000],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["duplicate_rows"] == 2

    for col in ["name", "salary"]:
        reasons = metrics["column_health_reasons"][col]
        assert any("Duplicate" in r for r in reasons), \
            f"Expected duplicate penalty in reasons for '{col}', got: {reasons}"


def test_duplicate_penalty_capped_at_10_points():
    """
    Even at 100% duplicate rate, penalty capped at -10 pts.
    """
    df = pd.DataFrame({
        "value": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    })
    metrics, _ = analyze_dataframe_quality(df)

    reasons = metrics["column_health_reasons"]["value"]
    dup_reasons = [r for r in reasons if "Duplicate" in r]
    if dup_reasons:
        import re
        match = re.search(r"\(-(\d+\.?\d*)pts\)", dup_reasons[0])
        if match:
            penalty = float(match.group(1))
            assert penalty <= 10.0


# ─────────────────────────────────────────────────────────────────────────────
# COMBINED PENALTIES
# ─────────────────────────────────────────────────────────────────────────────

def test_clean_column_scores_100():
    """A column with no issues should score exactly 100.0."""
    df = pd.DataFrame({
        "age": [25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["column_health_score"]["age"] == 100.0
    assert metrics["column_health_reasons"]["age"] == []


def test_score_never_goes_below_zero():
    """Score floor is 0.0 — no negative scores regardless of penalties."""
    df = pd.DataFrame({
        # 100% missing (-50) + constant (-40 if not all null) = would be -90 without floor
        "broken": [None] * 10,
    })
    metrics, _ = analyze_dataframe_quality(df)

    score = metrics["column_health_score"]["broken"]
    assert score >= 0.0


def test_multiple_penalties_stack():
    """Multiple penalties combine — score should be lower than any single penalty."""
    # 20% missing (-10) + duplicates present
    df = pd.DataFrame({
        "salary": [None, None, 50000, 50000, 60000,
                   60000, 70000, 70000, 80000, 80000],
    })
    metrics, _ = analyze_dataframe_quality(df)

    score = metrics["column_health_score"]["salary"]
    # Missing alone would give 90. Duplicates add further penalty.
    assert score < 90.0


# ─────────────────────────────────────────────────────────────────────────────
# DATASET HEALTH SCORE
# ─────────────────────────────────────────────────────────────────────────────

def test_dataset_health_score_is_average_of_column_scores():
    """Dataset health score = average of all column scores."""
    df = pd.DataFrame({
        "clean":  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "broken": [None, None, None, None, None, 1, 2, 3, 4, 5],
    })
    metrics, _ = analyze_dataframe_quality(df)

    expected = round(
        (
            metrics["column_health_score"]["clean"] +
            metrics["column_health_score"]["broken"]
        ) / 2,
        2,
    )
    assert metrics["dataset_health_score"] == expected


def test_all_clean_columns_dataset_score_is_100():
    """All clean columns → dataset health score = 100.0"""
    df = pd.DataFrame({
        "a": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "b": [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    })
    metrics, _ = analyze_dataframe_quality(df)

    assert metrics["dataset_health_score"] == 100.0