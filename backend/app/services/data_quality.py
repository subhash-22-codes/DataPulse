from __future__ import annotations

import logging
from typing import Any, Dict, List, Tuple

import pandas as pd

from app.services.data_profiler import DataProfile, ColumnType, profile_dataframe
from app.services.data_scorer import ScoreResult, ScoringConfig, DEFAULT_SCORING_CONFIG, score_profile
from app.services.data_insights import Insight, InsightConfig, DEFAULT_INSIGHT_CONFIG, generate_insights

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# SAMPLING LIMITS
# Profiling is fast. Quality sampling still protects RAM on free tier.
# ─────────────────────────────────────────────────────────────────────────────

# Max rows passed to the full profiler
# tasks.py already caps at 500k — this is a safety net only
_MAX_PROFILE_ROWS = 500_000

# Max rows for quality sampling inside profiler
# Keeps duplicate detection and outlier detection fast on large files
_QUALITY_SAMPLE_ROWS = 50_000


# ─────────────────────────────────────────────────────────────────────────────
# COMPATIBILITY LAYER
# Converts typed dataclasses back to the dict shape that
# tasks.py, workspaces.py, and incident_engine.py all read from.
# This is the ONLY place that knows about the old dict shape.
# When callers are updated to use DataProfile directly, delete this.
# ─────────────────────────────────────────────────────────────────────────────

def _profile_to_quality_report(
    profile: DataProfile,
    scores: ScoreResult,
) -> Dict[str, Any]:
    """
    Converts DataProfile + ScoreResult into the legacy quality_report dict.

    Keeps all existing keys so callers need zero changes.
    Adds new keys (column_type, column_type_by_column) for future use.
    """
    quality_report: Dict[str, Any] = {
        # ── Dataset level ─────────────────────────────────────────────────────
        "total_rows":               profile.total_rows,
        "total_columns":            profile.total_columns,
        "dataset_missing_percent":  profile.dataset_missing_percent,
        "duplicate_rows":           profile.duplicate_rows,
        "duplicate_percent":        profile.duplicate_percent,
        "dataset_health_score":     scores.dataset_health_score,

        # ── Column groupings ──────────────────────────────────────────────────
        "numeric_columns":          profile.numeric_columns,
        "categorical_columns":      profile.categorical_columns,
        "constant_columns":         profile.constant_columns,

        # ── Per-column metrics (legacy dict shape) ────────────────────────────
        "missing_by_column":        {},
        "missing_percent_by_column":{},
        "unique_count_by_column":   {},
        "unique_percent_by_column": {},
        "outliers_by_column":       {},
        "column_health_score":      {},
        "column_health_reasons":    {},

        # ── NEW: column types (first-class concept) ───────────────────────────
        # Future callers can read this directly instead of re-detecting
        "column_type_by_column":    {},
    }

    for col, cp in profile.columns.items():
        quality_report["missing_by_column"][col]         = cp.missing_count
        quality_report["missing_percent_by_column"][col] = cp.missing_percent
        quality_report["unique_count_by_column"][col]    = cp.unique_count
        quality_report["unique_percent_by_column"][col]  = cp.unique_percent
        quality_report["outliers_by_column"][col]        = cp.outlier_count
        quality_report["column_type_by_column"][col]     = cp.column_type

        col_score = scores.column_scores.get(col)
        if col_score:
            quality_report["column_health_score"][col]   = col_score.score
            quality_report["column_health_reasons"][col] = col_score.reasons
        else:
            quality_report["column_health_score"][col]   = 0.0
            quality_report["column_health_reasons"][col] = []

    return quality_report


def _insights_to_dicts(insights: List[Insight]) -> List[Dict[str, str]]:
    """
    Converts typed Insight dataclasses to the legacy list-of-dicts shape.
    tasks.py stores insights as JSON — dicts are required.
    """
    return [
        {
            "type":     i.type,
            "severity": i.severity,
            "message":  i.message,
        }
        for i in insights
    ]


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# This is the only function tasks.py calls.
# Signature is identical to the old data_quality.py — zero breaking changes.
# ─────────────────────────────────────────────────────────────────────────────

def analyze_dataframe_quality(
    df: pd.DataFrame,
    max_insights: int = 10,
    scoring_config: ScoringConfig = DEFAULT_SCORING_CONFIG,
    insight_config: InsightConfig = DEFAULT_INSIGHT_CONFIG,
) -> Tuple[Dict[str, Any], List[Dict[str, str]]]:
    """
    Main entry point. Called by tasks.py → _compute_analysis().

    Signature compatible with old data_quality.py:
        quality_report, insights = analyze_dataframe_quality(df)

    Internally delegates to three focused modules:
        data_profiler.py  → profile_dataframe()
        data_scorer.py    → score_profile()
        data_insights.py  → generate_insights()

    Returns:
        quality_report  — dict (legacy shape, all existing keys preserved)
        insights        — list of dicts (legacy shape)
    """
    if df is None or len(df) == 0:
        logger.warning("[QUALITY] Empty dataframe received — returning empty report.")
        return {
            "total_rows": 0,
            "total_columns": 0,
            "dataset_missing_percent": 0.0,
            "duplicate_rows": 0,
            "duplicate_percent": 0.0,
            "dataset_health_score": 0.0,
            "numeric_columns": [],
            "categorical_columns": [],
            "constant_columns": [],
            "missing_by_column": {},
            "missing_percent_by_column": {},
            "unique_count_by_column": {},
            "unique_percent_by_column": {},
            "outliers_by_column": {},
            "column_health_score": {},
            "column_health_reasons": {},
            "column_type_by_column": {},
        }, []

    # ── SAMPLING ──────────────────────────────────────────────────────────────
    # Sample for quality analysis if dataset is very large.
    # Profiling on the full dataset is fast.
    # Duplicate detection and outlier detection are expensive at 500k rows.
    if len(df) > _QUALITY_SAMPLE_ROWS:
        quality_df = df.sample(n=_QUALITY_SAMPLE_ROWS, random_state=42)
        logger.info(
            f"[QUALITY] Sampled {_QUALITY_SAMPLE_ROWS} rows "
            f"from {len(df)} for quality analysis."
        )
    else:
        quality_df = df

    # ── PHASE 1: PROFILE ──────────────────────────────────────────────────────
    profile: DataProfile = profile_dataframe(quality_df)

    # ── PHASE 2: SCORE ────────────────────────────────────────────────────────
    scores: ScoreResult = score_profile(profile, scoring_config)

    # ── PHASE 3: INSIGHTS ─────────────────────────────────────────────────────
    insight_config_with_max = InsightConfig(
        max_insights=max_insights,
        max_missing_columns=insight_config.max_missing_columns,
        max_outlier_columns=insight_config.max_outlier_columns,
        max_constant_columns=insight_config.max_constant_columns,
    )
    insights: List[Insight] = generate_insights(profile, scores, insight_config_with_max)

    # ── CONVERT TO LEGACY SHAPE ───────────────────────────────────────────────
    quality_report = _profile_to_quality_report(profile, scores)
    insights_dicts = _insights_to_dicts(insights)

    logger.info(
        f"[QUALITY] Complete | "
        f"rows={profile.total_rows} | "
        f"cols={profile.total_columns} | "
        f"dataset_score={scores.dataset_health_score} | "
        f"insights={len(insights_dicts)}"
    )

    return quality_report, insights_dicts