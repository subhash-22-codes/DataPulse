from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import List

from app.services.data_profiler import DataProfile, ColumnType
from app.services.data_scorer import ScoreResult

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# INSIGHT MODEL
# A single actionable observation about the dataset.
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Insight:
    """A single quality insight surfaced to the user."""
    type: str        # machine-readable category (e.g. MISSING_VALUES)
    severity: str    # "low" | "medium" | "high"
    message: str     # human-readable explanation


# Severity constants — used in ordering and filtering
_SEV_ORDER = {"high": 0, "medium": 1, "low": 2}


# ─────────────────────────────────────────────────────────────────────────────
# INSIGHT CONFIG
# Controls how many insights are generated and which are suppressed.
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class InsightConfig:
    max_insights: int = 10          # total cap across all rules
    max_missing_columns: int = 5    # top N missing columns to report
    max_outlier_columns: int = 3    # top N outlier columns to report
    max_constant_columns: int = 5   # top N constant columns to report


DEFAULT_INSIGHT_CONFIG = InsightConfig()


# ─────────────────────────────────────────────────────────────────────────────
# INSIGHT RULES
# Each rule is an independent function.
# Adding a new insight type = adding a new function. Nothing else changes.
# Rules return a list — empty list means rule did not fire.
# ─────────────────────────────────────────────────────────────────────────────

def _rule_clean_dataset(
    profile: DataProfile,
    scores: ScoreResult,
) -> List[Insight]:
    """Fires when dataset has zero issues — positive reinforcement."""
    if (
        profile.total_rows > 0
        and profile.dataset_missing_percent == 0
        and profile.duplicate_rows == 0
        and not profile.constant_columns
        and scores.dataset_health_score >= 95
    ):
        return [Insight(
            type="DATASET_CLEAN",
            severity="low",
            message=(
                "Dataset looks clean: no missing values, no duplicates, "
                "and no constant columns detected."
            )
        )]
    return []


def _rule_dataset_health_summary(
    scores: ScoreResult,
) -> List[Insight]:
    """
    Fires when overall dataset health is below acceptable thresholds.
    Gives user an at-a-glance summary before diving into column-level issues.
    """
    score = scores.dataset_health_score
    if score < 50:
        return [Insight(
            type="LOW_DATASET_HEALTH",
            severity="high",
            message=(
                f"Overall dataset health is low ({score}/100). "
                "Multiple quality issues detected — do not use this data "
                "in production without review."
            )
        )]
    elif score < 75:
        return [Insight(
            type="MEDIUM_DATASET_HEALTH",
            severity="medium",
            message=(
                f"Dataset health is moderate ({score}/100). "
                "Review flagged columns before using this data in production."
            )
        )]
    return []


def _rule_constant_columns(
    profile: DataProfile,
    config: InsightConfig,
) -> List[Insight]:
    """
    Fires for columns where every non-null value is identical.
    Always high severity — constant columns carry zero analytical value.
    """
    insights = []
    for col in profile.constant_columns[:config.max_constant_columns]:
        insights.append(Insight(
            type="CONSTANT_COLUMN",
            severity="high",
            message=(
                f"Column '{col}' contains the same value in every row. "
                "It carries no analytical value and should be reviewed or dropped."
            )
        ))
    return insights


def _rule_missing_values(
    profile: DataProfile,
    config: InsightConfig,
) -> List[Insight]:
    """
    Fires for columns with significant missing data.
    Reports top N worst columns to avoid overwhelming the user.

    Thresholds (industry standard — Monte Carlo, Great Expectations):
    ≥50% → high   (column is more than half empty)
    ≥20% → high   (significant data loss)
    ≥5%  → medium (meaningful gap)
    >0%  → low    (minor, worth monitoring)
    """
    insights = []

    top_missing = sorted(
        [
            (col, cp.missing_percent)
            for col, cp in profile.columns.items()
            if cp.missing_percent > 0
        ],
        key=lambda x: x[1],
        reverse=True,
    )[:config.max_missing_columns]

    for col, pct in top_missing:
        if pct >= 50:
            insights.append(Insight(
                type="MISSING_VALUES",
                severity="high",
                message=(
                    f"Column '{col}' is more than half empty ({pct}% missing). "
                    "This column is likely unreliable and may indicate "
                    "a broken upstream source."
                )
            ))
        elif pct >= 20:
            insights.append(Insight(
                type="MISSING_VALUES",
                severity="high",
                message=(
                    f"Column '{col}' has significant missing data ({pct}%). "
                    "Investigate upstream data sources before using "
                    "this column in analysis."
                )
            ))
        elif pct >= 5:
            insights.append(Insight(
                type="MISSING_VALUES",
                severity="medium",
                message=(
                    f"Column '{col}' has {pct}% missing values. "
                    "Consider imputation or flagging affected rows."
                )
            ))
        else:
            insights.append(Insight(
                type="MISSING_VALUES",
                severity="low",
                message=(
                    f"Column '{col}' has minor missing data ({pct}%). "
                    "Worth monitoring across future uploads."
                )
            ))

    return insights


def _rule_duplicates(
    profile: DataProfile,
) -> List[Insight]:
    """
    Fires when duplicate rows are detected.
    Judges by percentage — not raw count.

    50 duplicates in 100 rows (50%) = catastrophic.
    50 duplicates in 1,000,000 rows (0.005%) = negligible.

    Thresholds:
    ≥10% → high   (pipeline or ingestion issue)
    ≥1%  → medium (review deduplication logic)
    >0%  → low    (monitor)
    """
    if profile.duplicate_rows == 0:
        return []

    dup_rows = profile.duplicate_rows
    dup_pct = profile.duplicate_percent

    if dup_pct >= 10:
        return [Insight(
            type="DUPLICATES",
            severity="high",
            message=(
                f"Detected {dup_rows} duplicate rows ({dup_pct}% of dataset). "
                "This level of duplication likely indicates "
                "a pipeline or ingestion issue."
            )
        )]
    elif dup_pct >= 1:
        return [Insight(
            type="DUPLICATES",
            severity="medium",
            message=(
                f"Detected {dup_rows} duplicate rows ({dup_pct}% of dataset). "
                "Review deduplication logic in your data pipeline."
            )
        )]
    else:
        return [Insight(
            type="DUPLICATES",
            severity="low",
            message=(
                f"Detected {dup_rows} duplicate rows ({dup_pct}% of dataset). "
                "Minor — monitor across future uploads."
            )
        )]


def _rule_low_uniqueness(
    profile: DataProfile,
) -> List[Insight]:
    """
    Fires for columns with extremely low uniqueness (<1%) that are
    not already flagged as constant and not expected to be high cardinality.

    Skips ID, email, phone, name columns — low uniqueness is expected there.
    Only flags columns where low uniqueness is genuinely suspicious.
    """
    insights = []

    for col, cp in profile.columns.items():
        if cp.is_constant:
            continue  # already flagged by constant rule
        if cp.is_high_cardinality_expected:
            continue  # expected to be low — not a problem
        if cp.unique_percent < 1.0:
            insights.append(Insight(
                type="LOW_UNIQUENESS",
                severity="medium",
                message=(
                    f"Column '{col}' has extremely low uniqueness "
                    f"({cp.unique_percent:.2f}% unique values). "
                    "It may be over-categorized or contain encoding errors."
                )
            ))

    return insights


def _rule_outliers(
    profile: DataProfile,
    config: InsightConfig,
) -> List[Insight]:
    """
    Fires for numeric columns with significant outlier counts.
    Reports top N worst columns only.
    Judges by percentage — not raw count.

    ≥10% outliers → high   (data corruption signal)
    ≥2%  outliers → medium (worth investigating)
    >0   outliers → low    (informational)
    """
    insights = []
    total_rows = profile.total_rows

    if total_rows == 0:
        return []

    outlier_cols = sorted(
        [
            (col, cp.outlier_count)
            for col, cp in profile.columns.items()
            if cp.is_numeric and cp.outlier_count > 0
        ],
        key=lambda x: x[1],
        reverse=True,
    )[:config.max_outlier_columns]

    for col, out_cnt in outlier_cols:
        out_pct = round((out_cnt / total_rows) * 100, 1)

        if out_pct >= 10:
            insights.append(Insight(
                type="OUTLIERS",
                severity="high",
                message=(
                    f"Column '{col}' has {out_cnt} outliers ({out_pct}% of rows). "
                    "This level is unusually high and may indicate "
                    "data corruption or a schema mismatch."
                )
            ))
        elif out_pct >= 2:
            insights.append(Insight(
                type="OUTLIERS",
                severity="medium",
                message=(
                    f"Column '{col}' has {out_cnt} outliers ({out_pct}% of rows). "
                    "Review extreme values before using this column "
                    "in models or reports."
                )
            ))
        else:
            insights.append(Insight(
                type="OUTLIERS",
                severity="low",
                message=(
                    f"Column '{col}' has {out_cnt} potential outlier(s) "
                    f"({out_pct}%). Minor — worth a quick check."
                )
            ))

    return insights


def _rule_numeric_columns_found(
    profile: DataProfile,
) -> List[Insight]:
    """
    Informational — tells user which numeric columns are chartable.
    Excludes ID columns (numeric IDs are not chartable metrics).
    """
    chartable = [
        col for col in profile.numeric_columns
        if profile.columns[col].column_type != ColumnType.ID
    ]

    if not chartable:
        return []

    col_list = ", ".join(chartable[:5])
    suffix = "..." if len(chartable) > 5 else "."

    return [Insight(
        type="NUMERIC_COLUMNS_FOUND",
        severity="low",
        message=(
            f"Found {len(chartable)} numeric column(s) ready for charting: "
            f"{col_list}{suffix}"
        )
    )]


def _rule_column_type_summary(
    profile: DataProfile,
) -> List[Insight]:
    """
    Informational — summarises detected column types.
    Helps users understand what DataPulse detected in their data.
    Only fires when there are interesting types to report.
    """
    type_counts: dict[str, int] = {}
    for cp in profile.columns.values():
        type_counts[cp.column_type] = type_counts.get(cp.column_type, 0) + 1

    # Only report types that are interesting to the user
    interesting_types = {
        ColumnType.EMAIL, ColumnType.PHONE, ColumnType.URL,
        ColumnType.ID, ColumnType.FREE_TEXT, ColumnType.DATETIME,
    }

    found = {
        t: c for t, c in type_counts.items()
        if t in interesting_types
    }

    if not found:
        return []

    parts = [f"{count} {col_type}" for col_type, count in found.items()]
    return [Insight(
        type="COLUMN_TYPES_DETECTED",
        severity="low",
        message=(
            f"Detected column types: {', '.join(parts)}. "
            "DataPulse uses these to apply smarter quality checks."
        )
    )]


# ─────────────────────────────────────────────────────────────────────────────
# INSIGHT PIPELINE
# Runs all rules in priority order and returns top N insights.
# ─────────────────────────────────────────────────────────────────────────────

# Rule priority order — high severity rules run first
# Each rule returns List[Insight] — empty list = did not fire
_RULES = [
    "dataset_health_summary",
    "constant_columns",
    "missing_values",
    "duplicates",
    "low_uniqueness",
    "outliers",
    "clean_dataset",
    "numeric_columns_found",
    "column_type_summary",
]


def generate_insights(
    profile: DataProfile,
    scores: ScoreResult,
    config: InsightConfig = DEFAULT_INSIGHT_CONFIG,
) -> List[Insight]:
    """
    Runs all insight rules against a DataProfile and ScoreResult.
    Returns a prioritised list of insights capped at config.max_insights.

    Rules are independent — one failing never blocks the others.
    Output is sorted: high severity first, then medium, then low.
    """
    all_insights: List[Insight] = []

    rules_and_results = [
        ("dataset_health_summary", lambda: _rule_dataset_health_summary(scores)),
        ("constant_columns",       lambda: _rule_constant_columns(profile, config)),
        ("missing_values",         lambda: _rule_missing_values(profile, config)),
        ("duplicates",             lambda: _rule_duplicates(profile)),
        ("low_uniqueness",         lambda: _rule_low_uniqueness(profile)),
        ("outliers",               lambda: _rule_outliers(profile, config)),
        ("clean_dataset",          lambda: _rule_clean_dataset(profile, scores)),
        ("numeric_columns_found",  lambda: _rule_numeric_columns_found(profile)),
        ("column_type_summary",    lambda: _rule_column_type_summary(profile)),
    ]

    for rule_name, rule_fn in rules_and_results:
        try:
            results = rule_fn()
            all_insights.extend(results)
        except Exception as e:
            logger.error(
                f"[INSIGHTS] Rule '{rule_name}' failed — skipping | error={e}",
                exc_info=True,
            )

    # Sort by severity — high first, then medium, then low
    all_insights.sort(key=lambda i: _SEV_ORDER.get(i.severity, 99))

    final = all_insights[:config.max_insights]

    logger.info(
        f"[INSIGHTS] Complete | "
        f"rules_run={len(rules_and_results)} | "
        f"insights_generated={len(all_insights)} | "
        f"insights_returned={len(final)}"
    )

    return final