
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user
from app.auth.permissions import require_roles
from app.database.dependencies import get_db

from app.models.user import User

from app.schemas.user import (
    UserResponse,
    UserRoleUpdate,
    UserStatusUpdate,
)


router = APIRouter(
    prefix="/users",
    tags=["User Management"],
)


# Get all users in the current organization
@router.get(
    "",
    response_model=list[UserResponse],
)
def get_users(
    current_user: User = Depends(
        require_roles("admin")
    ),
    db: Session = Depends(get_db),
):
    users = db.scalars(
        select(User)
        .where(
            User.organization_id == current_user.organization_id
        )
        .order_by(User.created_at.desc())
    ).all()

    return users

# Get a specific user by ID
@router.get(
    "/{user_id}",
    response_model=UserResponse,
)
def get_user(
    user_id: int,
    current_user: User = Depends(
        require_roles("admin")
    ),
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(User).where(
            User.id == user_id,
            User.organization_id == current_user.organization_id,
        )
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user

# Update a user's role
@router.patch(
    "/{user_id}/role",
    response_model=UserResponse,
)
def update_user_role(
    user_id: int,
    role_data: UserRoleUpdate,
    current_user: User = Depends(
        require_roles("admin")
    ),
    db: Session = Depends(get_db),
):
    allowed_roles = [
        "admin",
        "manager",
        "approver",
        "employee",
    ]

    if role_data.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role",
        )

    user = db.scalar(
        select(User).where(
            User.id == user_id,
            User.organization_id == current_user.organization_id,
        )
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent an admin from demoting themselves
    if user.id == current_user.id and role_data.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own admin role",
        )

    # Prevent removing the last admin
    if user.role == "admin" and role_data.role != "admin":
        admin_count = db.scalar(
            select(func.count(User.id)).where(
                User.organization_id == current_user.organization_id,
                User.role == "admin",
                User.is_active == True,
            )
        )

        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last admin",
            )

    user.role = role_data.role

    db.commit()
    db.refresh(user)

    return user


# Activate or deactivate a user
@router.patch(
    "/{user_id}/status",
    response_model=UserResponse,
)
def update_user_status(
    user_id: int,
    status_data: UserStatusUpdate,
    current_user: User = Depends(
        require_roles("admin")
    ),
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(User).where(
            User.id == user_id,
            User.organization_id == current_user.organization_id,
        )
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent admin from deactivating their own account
    if user.id == current_user.id and not status_data.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )

    # Prevent deactivating the last active admin
    if user.role == "admin" and not status_data.is_active:
        admin_count = db.scalar(
            select(func.count(User.id)).where(
                User.organization_id == current_user.organization_id,
                User.role == "admin",
                User.is_active == True,
            )
        )

        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate the last active admin",
            )

    user.is_active = status_data.is_active

    db.commit()
    db.refresh(user)

    return user
