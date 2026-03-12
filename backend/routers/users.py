from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from auth import require_roles, normalize_role
from database import get_db

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


@router.get("/", response_model=List[schemas.UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin")),
):
    users = db.query(models.User).order_by(models.User.id.asc()).all()
    return users


@router.get("/{user_id}", response_model=schemas.UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin")),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user


@router.put("/{user_id}/role", response_model=schemas.UserResponse)
def update_user_role(
    user_id: int,
    payload: schemas.UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin")),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.role = normalize_role(payload.role)
    db.commit()
    db.refresh(user)
    return user