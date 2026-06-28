import logging
import statistics
from typing import Optional

from sqlalchemy.orm import Session

from app.models.data_upload import DataUpload
from app.models.column_daily_metrics import ColumnDailyMetrics

from app.services.incident.severity import (
    _severity_for_anomaly,
    _severity_for_drop,
    _severity_for_missing,
    _severity_for_schema_change,
)
from app.services.incident.writers import (
    _get_latest_incident,
    _create_incident,
    _update_incident,
    _reopen_incident,
    _resolve_incident,
    _log_event,
)

logger = logging.getLogger(__name__)

MIN_BASELINE_POINTS = 5
BASELINE_WINDOW = 10
Z_SCORE_THRESHOLD = 2.5
MIN_ABS_DEVIATION = 10.0
MIN_STDDEV_FLOOR = 2.0


def _check_ingestion_failure(
    db: Session,
    current_upload: DataUpload,
    failure_reason: str,
) -> None:
    """
    Rule: the upload itself failed to load/parse (storage error, corrupt CSV, etc.).

    Unlike the other rules, this is triggered directly by tasks.py rather than
    from analysis_results, since analysis never runs if loading already failed.
    Same dedup/reopen identity as every other rule: (workspace_id, issue_type),
    no column_name since this isn't column-specific.
    """
    latest = _get_latest_incident(db, current_upload.workspace_id, "ingestion_failure")

    if latest and latest.status == "open":
        _update_incident(db, latest, current_upload, severity="high")
        latest.failure_reason = failure_reason
    elif latest and latest.status in ("resolved", "ignored"):
        _reopen_incident(db, latest, current_upload, severity="high")
        latest.failure_reason = failure_reason
    else:
        _create_incident(
            db=db,
            current_upload=current_upload,
            issue_type="ingestion_failure",
            severity="high",
            failure_reason=failure_reason,
        )


def _check_row_drop(
    db: Session,
    current_upload: DataUpload,
    previous_upload: Optional[DataUpload],
    analysis_results: dict,
) -> None:
    """
    Rule: Row count dropped by >=20% vs previous upload.
    Requires previous upload to exist AND previous row count >=100.
    Auto-resolves when drop returns to <5%. Reopens if it recurs later.
    """
    if not previous_upload:
        return

    old_rows = analysis_results.get("previous_row_count", 0)
    new_rows = analysis_results.get("row_count", 0)

    if old_rows < 100:
        logger.debug(f"[INCIDENT] Row drop check skipped — previous count {old_rows} < 100")
        return

    latest = _get_latest_incident(db, current_upload.workspace_id, "row_drop")

    if new_rows >= old_rows:
        if latest and latest.status == "open":
            _resolve_incident(db, latest, current_upload, reason="Row count recovered")
        return

    drop_percent = int(round(((old_rows - new_rows) / old_rows) * 100))

    if drop_percent >= 20:
        severity = _severity_for_drop(drop_percent)

        if latest and latest.status == "open":
            _update_incident(db, latest, current_upload, severity=severity, row_drop_percent=drop_percent)
        elif latest and latest.status in ("resolved", "ignored"):
            _reopen_incident(db, latest, current_upload, severity=severity, row_drop_percent=drop_percent)
        else:
            _create_incident(
                db=db,
                current_upload=current_upload,
                issue_type="row_drop",
                severity=severity,
                row_drop_percent=drop_percent,
            )
    elif drop_percent < 5 and latest and latest.status == "open":
        _resolve_incident(db, latest, current_upload, reason=f"Drop reduced to {drop_percent}%")


def _check_schema_change(
    db: Session,
    current_upload: DataUpload,
    previous_upload: Optional[DataUpload],
    analysis_results: dict,
) -> None:
    """
    Rule: Schema changed vs previous upload.
    Any removal -> high. Addition of >3 cols -> medium. Addition of <=3 -> low.
    Auto-resolves when schema stabilises. Reopens if it recurs later.
    """
    if not previous_upload:
        return

    schema_changes = analysis_results.get("schema_changes", {})
    added = schema_changes.get("added", [])
    removed = schema_changes.get("removed", [])
    changed_cols = sorted(set(added + removed))
    change_size = len(changed_cols)

    latest = _get_latest_incident(db, current_upload.workspace_id, "schema_breaking_change")

    if change_size == 0:
        if latest and latest.status == "open":
            _resolve_incident(db, latest, current_upload, reason="Schema stabilised — no changes in latest upload")
        return

    severity = _severity_for_schema_change(added, removed)

    if latest and latest.status == "open":
        _update_incident(
            db, latest, current_upload,
            severity=severity, schema_change_size=change_size, affected_columns=changed_cols,
        )
    elif latest and latest.status in ("resolved", "ignored"):
        _reopen_incident(
            db, latest, current_upload,
            severity=severity, schema_change_size=change_size, affected_columns=changed_cols,
        )
    else:
        _create_incident(
            db=db,
            current_upload=current_upload,
            issue_type="schema_breaking_change",
            severity=severity,
            affected_columns=changed_cols,
            schema_change_size=change_size,
        )


def _check_high_missing(
    db: Session,
    current_upload: DataUpload,
    analysis_results: dict,
) -> None:
    """
    Rule: Any column with >=50% missing values. Tracked per column.
    Auto-resolves when missing drops below 20%. Reopens if it recurs later.
    """
    quality = analysis_results.get("quality_report", {})
    missing_map = quality.get("missing_percent_by_column", {})

    for col, pct in missing_map.items():
        pct_int = int(round(pct))
        latest = _get_latest_incident(
            db, current_upload.workspace_id, "high_missing_column", column_name=col,
        )

        if pct_int >= 50:
            severity = _severity_for_missing(pct_int)

            if latest and latest.status == "open":
                _update_incident(db, latest, current_upload, severity=severity, missing_percent=pct_int)
            elif latest and latest.status in ("resolved", "ignored"):
                _reopen_incident(db, latest, current_upload, severity=severity, missing_percent=pct_int)
            else:
                _create_incident(
                    db=db,
                    current_upload=current_upload,
                    issue_type="high_missing_column",
                    severity=severity,
                    column_name=col,
                    affected_columns=[col],
                    missing_percent=pct_int,
                )
        elif pct_int < 20 and latest and latest.status == "open":
            _resolve_incident(
                db, latest, current_upload,
                reason=f"Missing % dropped to {pct_int}% (below 20% threshold)",
            )


def _check_missing_percent_anomaly(
    db: Session,
    current_upload: DataUpload,
    analysis_results: dict,
) -> None:
    """
    Rule: a column's missing_percent deviates significantly from ITS OWN
    recent history, regardless of the fixed 50% threshold used elsewhere.

    Requires at least MIN_BASELINE_POINTS of history per column. Flags only
    when BOTH the z-score AND the raw deviation are large enough.
    """
    quality = analysis_results.get("quality_report", {})
    missing_map = quality.get("missing_percent_by_column", {})

    for col, current_pct in missing_map.items():
        current_pct = float(current_pct)

        history_rows = (
            db.query(ColumnDailyMetrics.missing_percent)
            .filter(
                ColumnDailyMetrics.workspace_id == current_upload.workspace_id,
                ColumnDailyMetrics.column_name == col,
                ColumnDailyMetrics.upload_id != current_upload.id,
            )
            .order_by(ColumnDailyMetrics.metric_date.desc())
            .limit(BASELINE_WINDOW)
            .all()
        )

        history = [r[0] for r in history_rows]

        latest = _get_latest_incident(
            db, current_upload.workspace_id, "missing_percent_anomaly", column_name=col,
        )

        if len(history) < MIN_BASELINE_POINTS:
            logger.debug(
                f"[INCIDENT] Anomaly check skipped for '{col}' — "
                f"only {len(history)} historical points (need {MIN_BASELINE_POINTS})"
            )
            continue

        mean = statistics.mean(history)
        stddev = statistics.pstdev(history) or 0.0
        effective_stddev = max(stddev, MIN_STDDEV_FLOOR)

        z_score = abs(current_pct - mean) / effective_stddev
        abs_deviation = abs(current_pct - mean)

        is_anomaly = (
            current_pct > mean
            and z_score >= Z_SCORE_THRESHOLD
            and abs_deviation >= MIN_ABS_DEVIATION
        )

        if is_anomaly:
            severity = _severity_for_anomaly(z_score)
            metrics_snapshot = {
                "current_pct": round(current_pct, 1),
                "baseline_mean": round(mean, 1),
                "baseline_stddev": round(stddev, 1),
                "z_score": round(z_score, 2),
            }

            if latest and latest.status == "open":
                _update_incident(
                    db, latest, current_upload, severity=severity,
                    missing_percent=int(round(current_pct)),
                )
            elif latest and latest.status in ("resolved", "ignored"):
                _reopen_incident(
                    db, latest, current_upload, severity=severity,
                    missing_percent=int(round(current_pct)),
                )
            else:
                incident = _create_incident(
                    db=db,
                    current_upload=current_upload,
                    issue_type="missing_percent_anomaly",
                    severity=severity,
                    column_name=col,
                    affected_columns=[col],
                    missing_percent=int(round(current_pct)),
                )
                _log_event(db, incident, current_upload.id, "created", severity, metrics_snapshot)

        elif z_score < 1.0 and latest and latest.status == "open":
            _resolve_incident(
                db, latest, current_upload,
                reason=f"Back within normal range (z={z_score:.2f})",
            )