from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field
from typing import Dict, List

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# COLUMN TYPE SYSTEM
# Every column gets a detected type. Used by scorer and insights.
# ─────────────────────────────────────────────────────────────────────────────

class ColumnType:
    ID          = "id"           # User_ID, uuid, guid — unique identifier
    EMAIL       = "email"        # email addresses
    PHONE       = "phone"        # phone numbers
    URL         = "url"          # web links
    NAME        = "name"         # person names (first, last, full)
    FREE_TEXT   = "free_text"    # long descriptive strings
    CATEGORICAL = "categorical"  # status, type, country, department
    NUMERIC     = "numeric"      # measurable quantities
    DATETIME    = "datetime"     # dates and timestamps
    UNKNOWN     = "unknown"      # couldn't determine


# ─────────────────────────────────────────────────────────────────────────────
# CARDINALITY KEYWORD SETS
# Column name check runs first — O(1), no data scanning needed.
# ─────────────────────────────────────────────────────────────────────────────

_HIGH_CARDINALITY_NAME_KEYWORDS: frozenset[str] = frozenset({
    # Identity
    "id", "uuid", "guid", "uid", "oid", "pk",
    # Keys & references
    "key", "token", "hash", "checksum", "fingerprint", "signature",
    # Unique codes
    "serial", "barcode", "sku", "isbn", "iban", "ssn",
    "passport", "license", "registration", "tracking",
    # Personal names
    "name", "firstname", "lastname", "fullname",
    "surname", "username", "nickname", "alias",
    # Contact
    "email", "phone", "mobile", "fax", "url", "website", "link",
    # Address
    "address", "street", "postcode", "zipcode", "zip",
    # Free text
    "description", "comment", "note", "remark", "bio",
    "summary", "detail", "message", "content", "body", "text",
    # Timestamps
    "timestamp", "datetime", "created_at", "updated_at",
    "transaction", "order", "invoice", "receipt",
})

_LOW_CARDINALITY_NAME_KEYWORDS: frozenset[str] = frozenset({
    # Geography
    "country", "nation", "continent", "region", "territory",
    "state", "province", "county", "district", "zone",
    # Classification
    "status", "stage", "phase", "step",
    "type", "kind", "category", "class", "group", "tier", "level",
    "tag", "label", "flag", "mode", "format",
    # Demographics
    "gender", "sex", "marital", "education", "degree",
    "nationality", "language", "currency",
    # Organisation
    "department", "division", "team", "unit", "branch",
    "role", "title", "rank", "grade", "band",
    # Boolean-like
    "active", "enabled", "verified", "approved",
    "deleted", "archived", "published",
    # Priority
    "priority", "severity", "urgency", "impact",
    "rating", "score_band", "quality",
})


# ─────────────────────────────────────────────────────────────────────────────
# CONTENT DETECTORS
# Run only when column name gives no signal. Each samples ≤50 rows.
# ─────────────────────────────────────────────────────────────────────────────

def _detect_email(s: pd.Series) -> bool:
    sample = s.dropna().astype(str).head(30)
    if sample.empty:
        return False
    hits = sum(bool(re.search(r"@.+\.", v)) for v in sample)
    return (hits / len(sample)) >= 0.6


def _detect_url(s: pd.Series) -> bool:
    sample = s.dropna().astype(str).head(30)
    if sample.empty:
        return False
    hits = sum(
        bool(re.match(r"https?://|www\.", v.strip(), re.IGNORECASE))
        for v in sample
    )
    return (hits / len(sample)) >= 0.5


def _detect_phone(s: pd.Series) -> bool:
    """
    Detects phone number columns by scanning data content.
    Requires values to contain at least 7 consecutive digits
    (with optional separators) — prevents date strings like
    "2023-01-15" from matching.
    """
    sample = s.dropna().astype(str).head(30)
    if sample.empty:
        return False
    hits = sum(
        bool(re.search(r"[\+\(\s]?\d[\d\s\-\(\)\.]{6,14}\d", v.strip()))
        for v in sample
    )
    return (hits / len(sample)) >= 0.6


def _detect_free_text(s: pd.Series) -> bool:
    sample = s.dropna().astype(str).head(50)
    if sample.empty:
        return False
    return sample.str.len().mean() > 40


def _detect_name(s: pd.Series) -> bool:
    sample = s.dropna().astype(str).head(30)
    if sample.empty:
        return False
    hits = sum(
        1 for v in sample
        if 2 <= len(v.strip()) <= 40
        and re.fullmatch(r"[A-Za-z\s\.\-']+", v.strip())
    )
    return (hits / len(sample)) >= 0.5


def _detect_datetime(s: pd.Series) -> bool:
    """Detects date/datetime columns by attempting to parse a sample."""
    sample = s.dropna().astype(str).head(20)
    if sample.empty:
        return False
    parsed = 0
    for v in sample:
        try:
            pd.to_datetime(v)
            parsed += 1
        except Exception:
            pass
    return (parsed / len(sample)) >= 0.7


# ─────────────────────────────────────────────────────────────────────────────
# COLUMN TYPE DETECTOR
# Determines the semantic type of a column.
# Order matters — more specific checks run before general ones.
# ─────────────────────────────────────────────────────────────────────────────

def detect_column_type(col: str, s: pd.Series, is_numeric: bool) -> str:
    """
    Returns a ColumnType string for a single column.

    Detection order:
    1. Numeric dtype                    → NUMERIC
    2. Column name → ID keywords        → ID
    3. Column name → categorical kws    → CATEGORICAL
    4. Content → email pattern          → EMAIL
    5. Content → URL pattern            → URL
    6. Content → phone pattern          → PHONE
    7. Content → free text (long avg)   → FREE_TEXT
    8. Content → name pattern           → NAME
    9. Content → datetime parseable     → DATETIME
    10. Default                         → UNKNOWN
    """
    col_lower = col.lower().strip()

    # Step 1: Numeric — pandas already classified it
    if is_numeric:
        # But check if it's really an ID stored as number
        if any(kw in col_lower for kw in ("id", "uuid", "uid", "pk", "key")):
            return ColumnType.ID
        return ColumnType.NUMERIC

    # Step 2: ID by column name
    id_keywords = {"id", "uuid", "guid", "uid", "oid", "pk", "key",
                   "serial", "barcode", "sku", "isbn", "iban", "ssn",
                   "passport", "license", "registration", "tracking"}
    if any(kw in col_lower for kw in id_keywords):
        return ColumnType.ID

    # Step 3: Categorical by column name
    if any(kw in col_lower for kw in _LOW_CARDINALITY_NAME_KEYWORDS):
        return ColumnType.CATEGORICAL

    # Step 4–9: Content scans (only for string columns)
    if _detect_email(s):
        return ColumnType.EMAIL
    if _detect_url(s):
        return ColumnType.URL
    if _detect_datetime(s):          # ← moved up, before phone
        return ColumnType.DATETIME
    if _detect_phone(s):
        return ColumnType.PHONE
    if _detect_free_text(s):
        return ColumnType.FREE_TEXT
    if _detect_name(s):
        return ColumnType.NAME
    

    return ColumnType.UNKNOWN


def is_high_cardinality_expected(col: str, s: pd.Series, column_type: str) -> bool:
    """
    Returns True if this column type is expected to have high uniqueness
    and should be exempt from the low-uniqueness penalty in scoring.

    Uses the already-detected column_type — no re-scanning needed.
    """
    return column_type in {
        ColumnType.ID,
        ColumnType.EMAIL,
        ColumnType.PHONE,
        ColumnType.URL,
        ColumnType.FREE_TEXT,
        ColumnType.NAME,
        ColumnType.DATETIME,
        ColumnType.NUMERIC,  # numeric values are high cardinality by nature
    }


# ─────────────────────────────────────────────────────────────────────────────
# PROFILE RESULT
# Typed output of the profiler. All downstream modules read from this.
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ColumnProfile:
    """Profile of a single column."""
    name: str
    column_type: str                    # ColumnType constant
    is_numeric: bool

    # Missingness
    missing_count: int
    missing_percent: float

    # Uniqueness
    unique_count: int
    unique_percent: float

    # Outliers (numeric only)
    outlier_count: int                  # 0 for non-numeric

    # Type-specific
    is_constant: bool                   # unique_count == 1
    is_high_cardinality_expected: bool  # exempt from uniqueness penalty


@dataclass
class DataProfile:
    """Complete profile of a dataframe. Output of profile_dataframe()."""
    total_rows: int
    total_columns: int

    # Dataset-level stats
    total_missing_cells: int
    dataset_missing_percent: float
    duplicate_rows: int
    duplicate_percent: float

    # Column profiles — ordered dict preserves column order
    columns: Dict[str, ColumnProfile] = field(default_factory=dict)

    # Convenience groupings
    numeric_columns: List[str] = field(default_factory=list)
    categorical_columns: List[str] = field(default_factory=list)
    constant_columns: List[str] = field(default_factory=list)


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

# Rows sampled for content detection (cheap)
_CONTENT_SAMPLE_ROWS = 50

# Max rows before sampling for outlier detection (expensive)
_OUTLIER_SAMPLE_ROWS = 10_000


def profile_dataframe(df: pd.DataFrame) -> DataProfile:
    """
    Profiles a dataframe and returns a typed DataProfile.

    This function only measures — it never scores or interprets.
    All downstream modules (scorer, insights, drift) read from DataProfile.

    Performance:
    - Column classification: O(n_cols)
    - Missing/unique stats: O(n_rows * n_cols)
    - Duplicate detection: O(n_rows * n_cols)
    - Outlier detection: O(sample_rows * n_numeric_cols)
    - Content detection: O(50 * n_cols) — always cheap
    """
    total_rows = int(len(df))
    total_cols = int(len(df.columns))

    profile = DataProfile(
        total_rows=total_rows,
        total_columns=total_cols,
        total_missing_cells=0,
        dataset_missing_percent=0.0,
        duplicate_rows=0,
        duplicate_percent=0.0,
    )

    if total_rows == 0:
        logger.warning("[PROFILER] Empty dataframe received.")
        return profile

    # ── COLUMN CLASSIFICATION ─────────────────────────────────────────────────
    numeric_col_set = set(df.select_dtypes(include="number").columns)

    # ── MISSING + UNIQUE + TYPE DETECTION ────────────────────────────────────
    total_missing_cells = 0

    for col in df.columns:
        s = df[col]
        is_numeric = col in numeric_col_set

        missing_count = int(s.isna().sum())
        total_missing_cells += missing_count
        missing_percent = round((missing_count / total_rows) * 100, 2)

        unique_count = int(s.nunique(dropna=True))
        unique_percent = round((unique_count / total_rows) * 100, 2)

        col_type = detect_column_type(col, s, is_numeric)
        high_card = is_high_cardinality_expected(col, s, col_type)
        is_constant = (unique_count == 1 and (total_rows - missing_count) > 0)

        profile.columns[col] = ColumnProfile(
            name=col,
            column_type=col_type,
            is_numeric=is_numeric,
            missing_count=missing_count,
            missing_percent=missing_percent,
            unique_count=unique_count,
            unique_percent=unique_percent,
            outlier_count=0,        # filled below for numeric columns
            is_constant=is_constant,
            is_high_cardinality_expected=high_card,
        )

    profile.total_missing_cells = total_missing_cells
    total_cells = total_rows * total_cols
    profile.dataset_missing_percent = (
        round((total_missing_cells / total_cells) * 100, 2)
        if total_cells > 0 else 0.0
    )

    # ── DUPLICATE ROWS ────────────────────────────────────────────────────────
    try:
        dup_count = int(df.duplicated().sum())
        profile.duplicate_rows = dup_count
        profile.duplicate_percent = round(
            (dup_count / total_rows) * 100, 2
        ) if total_rows > 0 else 0.0
    except Exception as e:
        logger.warning(f"[PROFILER] Duplicate detection failed: {e}")
        profile.duplicate_rows = 0
        profile.duplicate_percent = 0.0

    # ── OUTLIER DETECTION (numeric columns only, IQR method) ─────────────────
    for col in numeric_col_set:
        s = df[col].dropna()

        if len(s) < 10:
            profile.columns[col].outlier_count = 0
            continue

        # Sample for performance on large datasets
        sample = s.sample(n=_OUTLIER_SAMPLE_ROWS, random_state=42) if len(s) > _OUTLIER_SAMPLE_ROWS else s

        q1 = sample.quantile(0.25)
        q3 = sample.quantile(0.75)
        iqr = q3 - q1

        if iqr == 0:
            profile.columns[col].outlier_count = 0
            continue

        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        profile.columns[col].outlier_count = int(((s < lower) | (s > upper)).sum())

    # ── CONVENIENCE GROUPINGS ─────────────────────────────────────────────────
    profile.numeric_columns = [
        col for col in df.columns
        if profile.columns[col].is_numeric
    ]
    profile.categorical_columns = [
        col for col in df.columns
        if not profile.columns[col].is_numeric
    ]
    profile.constant_columns = [
        col for col in df.columns
        if profile.columns[col].is_constant
    ]

    logger.info(
        f"[PROFILER] Complete | rows={total_rows} | cols={total_cols} | "
        f"missing={profile.dataset_missing_percent}% | "
        f"duplicates={profile.duplicate_rows} | "
        f"numeric={len(profile.numeric_columns)} | "
        f"constant={len(profile.constant_columns)}"
    )

    return profile