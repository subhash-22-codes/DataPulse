from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.core.database import get_db
from app.models.alert_rule import AlertRule
from app.models.workspace import Workspace
from app.models.user import User
from .dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/alerts", tags=["Alerts"])

# ==========================
#  Schemas
# ==========================
class AlertRuleCreate(BaseModel):
    workspace_id: uuid.UUID
    column_name: str
    metric: str
    condition: str
    value: float

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
#  Routes
# ==========================
@router.post("/", response_model=AlertRuleResponse, status_code=201)
def create_alert_rule(
    rule: AlertRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new alert rule for a workspace. Only the owner can create rules.
    """
    workspace = db.query(Workspace).filter(Workspace.id == rule.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to create alerts for this workspace")

    new_rule = AlertRule(**rule.model_dump())
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return new_rule

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