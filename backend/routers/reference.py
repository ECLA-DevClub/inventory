from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
import auth  # Добавили для проверки ролей
from database import get_db

router = APIRouter(
    prefix="/references",
    tags=["References"]
)

# --- ТИПЫ МЕБЕЛИ ---
@router.get("/types", response_model=List[schemas.FurnitureTypeResponse])
def get_types(db: Session = Depends(get_db)):
    return db.query(models.FurnitureType).all()

@router.post("/types", response_model=schemas.FurnitureTypeResponse)
def create_type(
    name: str, # Принимаем просто строку, чтобы не ломалось
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles(auth.ROLE_ADMIN))
):
    exists = db.query(models.FurnitureType).filter(models.FurnitureType.name == name).first()
    if exists:
        raise HTTPException(status_code=400, detail="Тип уже существует")

    obj = models.FurnitureType(name=name)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

# --- ЗДАНИЯ ---
@router.get("/buildings", response_model=List[schemas.BuildingResponse])
def get_buildings(db: Session = Depends(get_db)):
    return db.query(models.Building).all()

@router.post("/buildings", response_model=schemas.BuildingResponse)
def create_building(
    name: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles(auth.ROLE_ADMIN))
):
    exists = db.query(models.Building).filter(models.Building.name == name).first()
    if exists:
        raise HTTPException(status_code=400, detail="Корпус уже существует")

    obj = models.Building(name=name)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

# --- КОМНАТЫ ---
@router.get("/rooms", response_model=List[schemas.RoomResponse])
def get_rooms(db: Session = Depends(get_db)):
    return db.query(models.Room).all()

@router.post("/rooms", response_model=schemas.RoomResponse)
def create_room(
    item: schemas.RoomResponse, # Используем RoomResponse или RoomCreate (проверь schemas.py)
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles(auth.ROLE_ADMIN, auth.ROLE_MANAGER))
):
    building = db.query(models.Building).filter(models.Building.id == item.building_id).first()
    if not building:
        raise HTTPException(status_code=400, detail="Корпус не найден")

    obj = models.Room(name=item.name, building_id=item.building_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

# --- СОСТОЯНИЯ ---
@router.get("/conditions", response_model=List[schemas.ConditionResponse])
def get_conditions(db: Session = Depends(get_db)):
    return db.query(models.Condition).all()

@router.post("/conditions", response_model=schemas.ConditionResponse)
def create_condition(
    name: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles(auth.ROLE_ADMIN))
):
    exists = db.query(models.Condition).filter(models.Condition.name == name).first()
    if exists:
        raise HTTPException(status_code=400, detail="Состояние уже существует")

    obj = models.Condition(name=name)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj