from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
import auth
from database import get_db

# =========================
# ИНИЦИАЛИЗАЦИЯ РОУТЕРА С ГЛОБАЛЬНОЙ ЗАЩИТОЙ
# Любой авторизованный пользователь (даже viewer) может зайти в этот роутер
# =========================
router = APIRouter(
    prefix="/references",
    tags=["References"],
    dependencies=[Depends(auth.require_roles("admin", "manager", "viewer"))]
)

# --- ТИПЫ МЕБЕЛИ ---

@router.get("/types", response_model=List[schemas.FurnitureTypeResponse])
def get_types(db: Session = Depends(get_db)):
    return db.query(models.FurnitureType).all()

@router.post("/types", response_model=schemas.FurnitureTypeResponse)
def create_type(
    item: schemas.FurnitureTypeCreate, # Используем схему для чистого JSON
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("admin")) # Только админ
):
    exists = db.query(models.FurnitureType).filter(models.FurnitureType.name == item.name).first()
    if exists:
        raise HTTPException(status_code=400, detail="Этот тип уже существует")

    obj = models.FurnitureType(name=item.name)
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
    item: schemas.BuildingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("admin")) # Только админ
):
    exists = db.query(models.Building).filter(models.Building.name == item.name).first()
    if exists:
        raise HTTPException(status_code=400, detail="Этот корпус уже существует")

    obj = models.Building(name=item.name)
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
    item: schemas.RoomCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("admin", "manager")) # Админ и менеджер
):
    building = db.query(models.Building).filter(models.Building.id == item.building_id).first()
    if not building:
        raise HTTPException(status_code=400, detail="Указанный корпус не найден")

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
    item: schemas.ConditionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("admin")) # Только админ
):
    exists = db.query(models.Condition).filter(models.Condition.name == item.name).first()
    if exists:
        raise HTTPException(status_code=400, detail="Такое состояние уже существует")

    obj = models.Condition(name=item.name)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
