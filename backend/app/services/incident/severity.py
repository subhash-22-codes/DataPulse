from typing import List


def _severity_for_anomaly(z_score: float) -> str:
    if z_score >= 4:
        return "high"
    return "medium"


def _severity_for_drop(drop_percent: int) -> str:
    if drop_percent < 40:
        return "medium"
    return "high"


def _severity_for_missing(missing_percent: int) -> str:
    if missing_percent < 70:
        return "medium"
    return "high"


def _severity_for_schema_change(added: List[str], removed: List[str]) -> str:
    if removed:
        return "high"
    if len(added) > 3:
        return "medium"
    return "low"