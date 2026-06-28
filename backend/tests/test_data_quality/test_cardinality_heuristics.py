"""
Tests for the cardinality heuristic system in data_profiler.py.

Tests both:
- detect_column_type() — semantic type detection
- is_high_cardinality_expected() — exemption from uniqueness penalty

Note: Nick's original test imported _is_high_cardinality_expected from
data_quality.py. After Phase 1 refactor, this function moved to
data_profiler.py with a new signature. Tests updated accordingly.

The function no longer re-scans data — it uses the already-detected
column_type. This is a Phase 1 improvement: cardinality detection
now runs once per column, not twice. See data_profiler.py for details.
"""

import pandas as pd
import pytest
from app.services.data_profiler import (
    detect_column_type,
    is_high_cardinality_expected,
    ColumnType,
)


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _type_and_exempt(col_name: str, values: list, is_numeric: bool = False):
    """Helper: detect type and exemption for a column in one call."""
    s = pd.Series(values)
    col_type = detect_column_type(col_name, s, is_numeric)
    exempt = is_high_cardinality_expected(col_name, s, col_type)
    return col_type, exempt


# ─────────────────────────────────────────────────────────────────────────────
# ID COLUMNS
# ─────────────────────────────────────────────────────────────────────────────

def test_user_id_column_name_detected_as_id():
    col_type, exempt = _type_and_exempt("user_id", [1, 2, 3, 4], is_numeric=True)
    assert col_type == ColumnType.ID
    assert exempt is True


def test_uuid_column_detected_as_id():
    col_type, exempt = _type_and_exempt(
        "uuid",
        ["a1b2-c3d4", "e5f6-g7h8", "i9j0-k1l2"],
        is_numeric=False,
    )
    assert col_type == ColumnType.ID
    assert exempt is True


def test_numeric_id_column_exempt_even_with_low_uniqueness():
    """
    A numeric column named 'order_id' should be treated as ID, not NUMERIC.
    Low uniqueness should not penalise it.
    """
    col_type, exempt = _type_and_exempt(
        "order_id",
        [1, 1, 1, 1, 2],  # low uniqueness
        is_numeric=True,
    )
    assert col_type == ColumnType.ID
    assert exempt is True


# ─────────────────────────────────────────────────────────────────────────────
# EMAIL COLUMNS
# ─────────────────────────────────────────────────────────────────────────────

def test_email_column_name_detected():
    col_type, exempt = _type_and_exempt(
        "email",
        ["a@test.com", "b@test.com", "c@test.com"],
    )
    assert col_type == ColumnType.EMAIL
    assert exempt is True


def test_email_content_detected_without_name_hint():
    """Even with a generic column name, email content should be detected."""
    col_type, exempt = _type_and_exempt(
        "contact_field",
        ["user@example.com", "admin@company.org", "info@site.net",
         "hello@test.com", "support@brand.io"],
    )
    assert col_type == ColumnType.EMAIL
    assert exempt is True


def test_non_email_content_not_detected_as_email():
    col_type, exempt = _type_and_exempt(
        "notes",
        ["hello world", "goodbye world", "some text here"],
    )
    assert col_type != ColumnType.EMAIL


# ─────────────────────────────────────────────────────────────────────────────
# PHONE COLUMNS
# ─────────────────────────────────────────────────────────────────────────────

def test_phone_column_name_detected():
    col_type, exempt = _type_and_exempt(
        "phone",
        ["+91-9876543210", "+1-800-555-0100", "+44-20-7946-0958"],
    )
    assert col_type == ColumnType.PHONE
    assert exempt is True


def test_phone_content_detected_without_name_hint():
    col_type, exempt = _type_and_exempt(
        "contact_number",
        ["+919876543210", "9876543210", "+1-800-555-0100",
         "+44 20 7946 0958", "080-12345678"],
    )
    assert col_type == ColumnType.PHONE
    assert exempt is True


# ─────────────────────────────────────────────────────────────────────────────
# URL COLUMNS
# ─────────────────────────────────────────────────────────────────────────────

def test_url_content_detected():
    col_type, exempt = _type_and_exempt(
        "website_link",
        ["https://example.com", "https://google.com", "http://test.org",
         "https://datapulse.io", "www.brand.com"],
    )
    assert col_type == ColumnType.URL
    assert exempt is True


# ─────────────────────────────────────────────────────────────────────────────
# NAME COLUMNS
# ─────────────────────────────────────────────────────────────────────────────

def test_first_name_column_exempt():
    col_type, exempt = _type_and_exempt(
        "first_name",
        ["Alice", "Bob", "Charlie", "Diana", "Eve"],
    )
    assert exempt is True


def test_last_name_column_exempt():
    col_type, exempt = _type_and_exempt(
        "last_name",
        ["Smith", "Jones", "Williams", "Brown", "Taylor"],
    )
    assert exempt is True


def test_full_name_content_detected():
    """Full names (first + last) should be detected as NAME type."""
    col_type, exempt = _type_and_exempt(
        "customer",
        ["John Smith", "Jane Doe", "Bob Johnson",
         "Alice Brown", "Charlie Davis"],
    )
    assert col_type == ColumnType.NAME
    assert exempt is True


# ─────────────────────────────────────────────────────────────────────────────
# FREE TEXT COLUMNS
# ─────────────────────────────────────────────────────────────────────────────

def test_description_column_exempt():
    col_type, exempt = _type_and_exempt(
        "description",
        ["This is a long product description that explains features in detail.",
         "Another detailed description with many words to exceed forty characters.",
         "Yet another lengthy description for testing free text detection here."],
    )
    assert col_type == ColumnType.FREE_TEXT
    assert exempt is True


def test_short_text_not_free_text():
    """Short strings (avg < 40 chars) should not be classified as free text."""
    col_type, _ = _type_and_exempt(
        "tag",
        ["red", "blue", "green", "yellow", "purple"],
    )
    assert col_type != ColumnType.FREE_TEXT


# ─────────────────────────────────────────────────────────────────────────────
# CATEGORICAL COLUMNS — NEVER EXEMPT
# ─────────────────────────────────────────────────────────────────────────────

def test_status_column_never_exempt():
    col_type, exempt = _type_and_exempt(
        "status",
        ["active", "active", "inactive", "active", "pending"],
    )
    assert col_type == ColumnType.CATEGORICAL
    assert exempt is False


def test_country_column_never_exempt():
    col_type, exempt = _type_and_exempt(
        "country",
        ["India", "India", "USA", "UK", "India"],
    )
    assert col_type == ColumnType.CATEGORICAL
    assert exempt is False


def test_gender_column_never_exempt():
    col_type, exempt = _type_and_exempt(
        "gender",
        ["Male", "Female", "Male", "Female", "Male"],
    )
    assert col_type == ColumnType.CATEGORICAL
    assert exempt is False


def test_department_column_never_exempt():
    col_type, exempt = _type_and_exempt(
        "department",
        ["Engineering", "Marketing", "HR", "Engineering", "Finance"],
    )
    assert col_type == ColumnType.CATEGORICAL
    assert exempt is False


def test_type_column_never_exempt():
    col_type, exempt = _type_and_exempt(
        "account_type",
        ["premium", "free", "premium", "enterprise", "free"],
    )
    assert col_type == ColumnType.CATEGORICAL
    assert exempt is False


# ─────────────────────────────────────────────────────────────────────────────
# NUMERIC COLUMNS
# ─────────────────────────────────────────────────────────────────────────────

def test_numeric_column_exempt_from_uniqueness_penalty():
    """Regular numeric columns (salary, score, balance) are exempt."""
    col_type, exempt = _type_and_exempt(
        "salary",
        [50000, 60000, 70000, 80000, 90000],
        is_numeric=True,
    )
    assert col_type == ColumnType.NUMERIC
    assert exempt is True


def test_non_numeric_column_with_numeric_values_in_strings():
    """String column with numeric content should not be classified as NUMERIC."""
    col_type, _ = _type_and_exempt(
        "code",
        ["123", "456", "789"],
        is_numeric=False,
    )
    assert col_type != ColumnType.NUMERIC


# ─────────────────────────────────────────────────────────────────────────────
# DATETIME COLUMNS
# ─────────────────────────────────────────────────────────────────────────────

def test_date_content_detected_as_datetime():
    col_type, exempt = _type_and_exempt(
        "join_date",
        ["2023-01-15", "2023-02-20", "2023-03-10",
         "2023-04-05", "2023-05-12"],
    )
    assert col_type == ColumnType.DATETIME
    assert exempt is True


def test_datetime_with_time_detected():
    col_type, exempt = _type_and_exempt(
        "created_at",
        ["2023-01-15 10:30:00", "2023-02-20 14:45:00",
         "2023-03-10 09:00:00", "2023-04-05 16:20:00"],
    )
    assert exempt is True


# ─────────────────────────────────────────────────────────────────────────────
# LOW CARDINALITY NAME KEYWORDS BLOCK EXEMPTION
# Even if content looks like names, categorical column names win.
# ─────────────────────────────────────────────────────────────────────────────

def test_country_column_blocked_even_if_content_looks_like_names():
    """
    'country' is in LOW_CARDINALITY keywords.
    Even though country names pass the name content detector,
    the low-cardinality name check runs first and blocks exemption.
    """
    col_type, exempt = _type_and_exempt(
        "country",
        ["India", "Germany", "Brazil", "Japan", "France"],
    )
    assert col_type == ColumnType.CATEGORICAL
    assert exempt is False


def test_role_column_blocked_from_exemption():
    col_type, exempt = _type_and_exempt(
        "role",
        ["Admin", "User", "Manager", "Admin", "User"],
    )
    assert col_type == ColumnType.CATEGORICAL
    assert exempt is False


# ─────────────────────────────────────────────────────────────────────────────
# EDGE CASES
# ─────────────────────────────────────────────────────────────────────────────

def test_empty_series_returns_unknown():
    """Empty series with no data → UNKNOWN type."""
    col_type, _ = _type_and_exempt("mystery", [])
    assert col_type == ColumnType.UNKNOWN


def test_all_null_series_returns_unknown():
    """All-null series → content detectors see empty sample → UNKNOWN."""
    col_type, _ = _type_and_exempt("broken", [None, None, None])
    assert col_type == ColumnType.UNKNOWN


def test_column_name_takes_priority_over_content():
    """
    Column named 'status' should be CATEGORICAL even if content
    happens to look like names.
    Column name check runs before content scan.
    """
    col_type, exempt = _type_and_exempt(
        "status",
        ["Alice", "Bob", "Charlie", "Diana", "Eve"],  # looks like names
    )
    assert col_type == ColumnType.CATEGORICAL
    assert exempt is False