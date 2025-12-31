from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
import uuid
from app.core.database import get_db
from app.models.alert_rule import AlertRule
from app.models.workspace import Workspace
from app.models.data_upload import DataUpload  # Added this import
from app.models.user import User
from .dependencies import get_current_user, limiter
from pydantic import BaseModel, field_validator

router = APIRouter(prefix="/alerts", tags=["Alerts"])

# --- CONSTANTS (SaaS Standards) ---
ALLOWED_METRICS = {"mean", "max", "min", "count", "std", "50%"}
ALLOWED_CONDITIONS = {"greater_than", "less_than", "equals", "not_equals"}

# ==========================
#  Schemas
# ==========================
class AlertRuleCreate(BaseModel):
    workspace_id: uuid.UUID
    column_name: str
    metric: str
    condition: str
    value: float

    @field_validator('metric')
    @classmethod
    def validate_metric(cls, v):
        if v.lower() not in ALLOWED_METRICS:
            raise ValueError(f"Metric must be one of: {', '.join(ALLOWED_METRICS)}")
        return v.lower()

    @field_validator('condition')
    @classmethod
    def validate_condition(cls, v):
        if v.lower() not in ALLOWED_CONDITIONS:
            raise ValueError(f"Condition must be one of: {', '.join(ALLOWED_CONDITIONS)}")
        return v.lower()

class AlertRuleResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    column_name: str
    metric: str
    condition: str
    value: float
    is_active: bool

    class Config:
        from_attributes = True

# ==========================
#  Routes
# ==========================
@router.post("/", response_model=AlertRuleResponse, status_code=201)
def create_alert_rule(
    rule: AlertRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch Workspace & Verify Ownership
    workspace = db.query(Workspace).filter(Workspace.id == rule.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # --- NEW: DUPLICATE PREVENTION (Reviewer Optional Polish) ---
    # Check if a rule for the SAME column, metric, and condition already exists
    duplicate_rule = db.query(AlertRule).filter(
        AlertRule.workspace_id == workspace.id,
        AlertRule.column_name == rule.column_name,
        AlertRule.metric == rule.metric,
        AlertRule.condition == rule.condition,
        AlertRule.is_active == True
    ).first()

    if duplicate_rule:
        raise HTTPException(
            status_code=400,
            detail=f"An active alert for {rule.column_name} ({rule.metric} {rule.condition}) already exists."
        )

    # --- QUOTA CHECK ---
    active_alerts_count = db.query(AlertRule).filter(
        AlertRule.workspace_id == workspace.id,
        AlertRule.is_active == True
    ).count()

    if active_alerts_count >= 10:
        raise HTTPException(
            status_code=429,
            detail="Workspace limit reached. You can have a maximum of 10 active alerts."
        )

    # 2. SCHEMA VALIDATION & NULL GUARDS
    latest_upload = db.query(DataUpload).filter(
        DataUpload.workspace_id == workspace.id,
        DataUpload.uploaded_at.isnot(None)
    ).order_by(DataUpload.uploaded_at.desc()).first()

    if not latest_upload:
        raise HTTPException(status_code=400, detail="No data found. Upload a file first.")

    if not latest_upload.schema_info:
        raise HTTPException(status_code=400, detail="Schema processing... try again in a moment.")

    if rule.column_name not in latest_upload.schema_info:
        raise HTTPException(status_code=400, detail=f"Column '{rule.column_name}' not found.")

    # 3. Save the Rule
    new_rule = AlertRule(**rule.model_dump())
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return new_rule

@router.patch("/{rule_id}/toggle", response_model=AlertRuleResponse)
@limiter.limit("10/minute")
def toggle_alert_rule(
    rule_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Toggles the is_active status of an alert rule with quota enforcement.
    """
    rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    workspace = db.query(Workspace).filter(Workspace.id == rule.workspace_id).first()
    if not workspace or workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # --- NEW: QUOTA CHECK FOR TOGGLE ---
    # Only check the limit if the user is trying to TURN ON an alert
    if not rule.is_active:
        active_alerts_count = db.query(AlertRule).filter(
            AlertRule.workspace_id == workspace.id,
            AlertRule.is_active == True
        ).count()

        if active_alerts_count >= 10:
            raise HTTPException(
                status_code=429,
                detail="Cannot enable alert. Workspace limit of 10 active alerts reached."
            )
    # -----------------------------------

    # Proceed with the toggle
    rule.is_active = not rule.is_active
    db.commit()
    db.refresh(rule)
    return rule

@router.delete("/{rule_id}", status_code=204)
def delete_alert_rule(
    rule_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an alert rule. Only the owner of the parent workspace can delete.
    """
    rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")

    workspace = db.query(Workspace).filter(Workspace.id == rule.workspace_id).first()
    if not workspace or workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this alert rule")
    
    db.delete(rule)
    db.commit()
    return Response(status_code=204)