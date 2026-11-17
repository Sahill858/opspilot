from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.permissions import require_roles
from app.database.dependencies import get_db

from app.models.organization import Organization
from app.models.user import User

from app.schemas.organization import (
    OrganizationResponse,
    OrganizationUpdate,
)


router = APIRouter(
    prefix="/organizations",
    tags=["Organization Settings"],
)


@router.get("/me", response_model=OrganizationResponse)
def get_my_organization(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organization = db.query(Organization).filter(
        Organization.id == current_user.organization_id
    ).first()

    if not organization:
        raise HTTPException(
            status_code=404,
            detail="Organization not found",
        )

    return organization


@router.patch("/me", response_model=OrganizationResponse)
def update_my_organization(
    organization_data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    organization = db.query(Organization).filter(
        Organization.id == current_user.organization_id
    ).first()

    if not organization:
        raise HTTPException(
            status_code=404,
            detail="Organization not found",
        )

    organization.name = organization_data.name.strip()

    if len(organization.name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Organization name must contain at least 2 characters",
        )

    db.commit()
    db.refresh(organization)

    return organization
