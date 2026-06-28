from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

from app.services.data_profiler import DataProfile, ColumnProfile, ColumnType

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# SCORING CONFIG
# All penalty weights and thresholds live here.
# Defaults match industry standards (Monte Carlo, Great Expectations).
# Future: load per-workspace config from DB to override defaults.
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ScoringConfig:
    """
    Controls how penalties are applied in health scoring.

    All values have sensible defaults.
    Override per workspace when user-configurable scoring is introduced.
    """

    # ── MISSING VALUES (up to -50 pts) ───────────────────────────────────────
    # 1% missing = -0.5 pts. 100% missing = -50 pts.
    missing_penalty_per_percent: float = 0.5
    missing_penalty_max: float = 50.0

    # ── CONSTANT COLUMN (-40 pts flat) ───────────────────────────────────────
    # Same value in every row = zero analytical value.
    constant_column_penalty: float = 40.0

    # ── LOW UNIQUENESS (up to -20 pts) ───────────────────────────────────────
    # Stepped thresholds — (unique_pct_ceiling, penalty_pts)
    # Columns exempt from uniqueness penalty: ID, EMAIL, PHONE, URL,
    # FREE_TEXT, NAME, DATETIME, NUMERIC (set in data_profiler.py)
    uniqueness_penalty_steps: List[Tuple[float, float]] = field(
        default_factory=lambda: [
            (1.0,  20.0),   # unique% < 1%   → -20 pts (extremely low)
            (5.0,  12.0),   # unique% < 5%   → -12 pts (very low)
            (20.0,  5.0),   # unique% < 20%  → -5 pts  (low)
        ]
    )

    # ── OUTLIERS (up to -15 pts, numeric only) ───────────────────────────────
    # Proportional: outlier_pct × multiplier, capped at max.
    outlier_penalty_multiplier: float = 0.75
    outlier_penalty_max: float = 15.0

    # ── DUPLICATE ROWS (up to -10 pts) ───────────────────────────────────────
    # Proportional: dup_pct × multiplier, capped at max.
    duplicate_penalty_multiplier: float = 0.1
    duplicate_penalty_max: float = 10.0


# Default config — used unless overridden
DEFAULT_SCORING_CONFIG = ScoringConfig()


# ─────────────────────────────────────────────────────────────────────────────
# SCORE RESULT
# Typed output of the scorer. Read by insights and API layer.
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ColumnScore:
    """Health score and penalty breakdown for a single column."""
    column_name: str
    score: float                        # 0.0 – 100.0
    reasons: List[str]                  # human-readable penalty explanations


@dataclass
class ScoreResult:
    """Complete scoring output for a dataframe. Output of score_profile()."""
    column_scores: Dict[str, ColumnScore] = field(default_factory=dict)
    dataset_health_score: float = 0.0


# ─────────────────────────────────────────────────────────────────────────────
# COLUMN SCORER
# Applies penalty model to a single ColumnProfile.
# ─────────────────────────────────────────────────────────────────────────────

def _score_column(
    col_profile: ColumnProfile,
    duplicate_rows: int,
    total_rows: int,
    config: ScoringConfig,
) -> ColumnScore:
    """
    Applies the penalty model to one column.

    Penalty table:
    ┌─────────────────────────┬──────────────┬────────────────────────────────┐
    │ Factor                  │ Max Penalty  │ Logic                          │
    ├─────────────────────────┼──────────────┼────────────────────────────────┤
    │ Missing values          │ -50 pts      │ Linear per %                   │
    │ Constant column         │ -40 pts flat │ unique_count == 1              │
    │ Low uniqueness          │ -20 pts      │ Stepped thresholds             │
    │ Outliers (numeric only) │ -15 pts      │ Proportional to outlier %      │
    │ Duplicate rows          │ -10 pts      │ Proportional to duplicate %    │
    └─────────────────────────┴──────────────┴────────────────────────────────┘
    """
    score = 100.0
    reasons: List[str] = []

    if total_rows == 0:
        return ColumnScore(
            column_name=col_profile.name,
            score=0.0,
            reasons=["No data"]
        )

    # ── PENALTY 1: MISSING VALUES ─────────────────────────────────────────────
    if col_profile.missing_percent > 0:
        penalty = min(
            col_profile.missing_percent * config.missing_penalty_per_percent,
            config.missing_penalty_max,
        )
        score -= penalty
        reasons.append(
            f"Missing values: {col_profile.missing_percent:.1f}% "
            f"(-{penalty:.1f}pts)"
        )

    # ── PENALTY 2: CONSTANT COLUMN ────────────────────────────────────────────
    if col_profile.is_constant:
        score -= config.constant_column_penalty
        reasons.append(
            f"Constant column: same value in every row "
            f"(-{config.constant_column_penalty:.0f}pts)"
        )

    # ── PENALTY 3: LOW UNIQUENESS ─────────────────────────────────────────────
    # Only for non-exempt, non-constant columns
    elif not col_profile.is_high_cardinality_expected and col_profile.unique_count > 1:
        uniqueness_penalty = 0.0
        unique_pct = col_profile.unique_percent

        for ceiling, penalty_pts in sorted(config.uniqueness_penalty_steps):
            if unique_pct < ceiling:
                uniqueness_penalty = penalty_pts
                reasons.append(
                    f"Low uniqueness: {unique_pct:.2f}% unique values "
                    f"(-{penalty_pts:.0f}pts)"
                )
                break

        score -= uniqueness_penalty

    # ── PENALTY 4: OUTLIERS (numeric only) ───────────────────────────────────
    if col_profile.is_numeric and col_profile.outlier_count > 0:
        outlier_pct = (col_profile.outlier_count / total_rows) * 100
        penalty = min(
            outlier_pct * config.outlier_penalty_multiplier,
            config.outlier_penalty_max,
        )
        score -= penalty
        reasons.append(
            f"Outliers: {col_profile.outlier_count} rows "
            f"({outlier_pct:.1f}%) (-{penalty:.1f}pts)"
        )

    # ── PENALTY 5: DUPLICATE ROWS ─────────────────────────────────────────────
    if duplicate_rows > 0:
        dup_pct = (duplicate_rows / total_rows) * 100
        penalty = min(
            dup_pct * config.duplicate_penalty_multiplier,
            config.duplicate_penalty_max,
        )
        score -= penalty
        reasons.append(
            f"Duplicate rows: {duplicate_rows} "
            f"({dup_pct:.1f}%) (-{penalty:.1f}pts)"
        )

    # ── FLOOR ─────────────────────────────────────────────────────────────────
    final_score = max(round(score, 2), 0.0)
    return ColumnScore(
        column_name=col_profile.name,
        score=final_score,
        reasons=reasons,
    )


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def score_profile(
    profile: DataProfile,
    config: ScoringConfig = DEFAULT_SCORING_CONFIG,
) -> ScoreResult:
    """
    Applies the scoring model to a DataProfile.

    Takes a DataProfile (from data_profiler.py).
    Returns a ScoreResult with per-column scores and dataset score.

    The config parameter is optional — defaults are used unless
    workspace-level overrides are introduced in the future.
    """
    result = ScoreResult()

    if profile.total_rows == 0:
        logger.warning("[SCORER] Empty profile received — returning zero scores.")
        return result

    # ── SCORE EACH COLUMN ─────────────────────────────────────────────────────
    for col_name, col_profile in profile.columns.items():
        col_score = _score_column(
            col_profile=col_profile,
            duplicate_rows=profile.duplicate_rows,
            total_rows=profile.total_rows,
            config=config,
        )
        result.column_scores[col_name] = col_score

    # ── DATASET HEALTH SCORE ──────────────────────────────────────────────────
    # Weighted average — constant columns pull the score down harder
    # than low-uniqueness columns, reflecting real severity differences.
    if result.column_scores:
        scores = [cs.score for cs in result.column_scores.values()]
        result.dataset_health_score = round(sum(scores) / len(scores), 2)

    logger.info(
        f"[SCORER] Complete | "
        f"dataset_score={result.dataset_health_score} | "
        f"columns_scored={len(result.column_scores)}"
    )

    return result