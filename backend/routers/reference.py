from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/references",
    tags=["References"]
)


@router.get("/types", response_model=List[schemas.FurnitureTypeResponse])
def get_types(db: Session = Depends(get_db)):
    return db.query(models.FurnitureType).all()


@router.post("/types", response_model=schemas.FurnitureTypeResponse)
def create_type(item: schemas.FurnitureTypeBase, db: Session = Depends(get_db)):
    exists = db.query(models.FurnitureType).filter(models.FurnitureType.name == item.name).first()
    if exists:
        raise HTTPException(status_code=400, detail="Тип уже существует")

    obj = models.FurnitureType(name=item.name)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/buildings", response_model=List[schemas.BuildingResponse])
def get_buildings(db: Session = Depends(get_db)):
    return db.query(models.Building).all()


@router.post("/buildings", response_model=schemas.BuildingResponse)
def create_building(item: schemas.BuildingBase, db: Session = Depends(get_db)):
    exists = db.query(models.Building).filter(models.Building.name == item.name).first()
    if exists:
        raise HTTPException(status_code=400, detail="Корпус уже существует")

    obj = models.Building(name=item.name)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/rooms", response_model=List[schemas.RoomResponse])
def get_rooms(db: Session = Depends(get_db)):
    return db.query(models.Room).all()


@router.post("/rooms", response_model=schemas.RoomResponse)
def create_room(item: schemas.RoomCreate, db: Session = Depends(get_db)):
    building = db.query(models.Building).filter(models.Building.id == item.building_id).first()
    if not building:
        raise HTTPException(status_code=400, detail="Корпус не найден")

    obj = models.Room(name=item.name, building_id=item.building_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/conditions", response_model=List[schemas.ConditionResponse])
def get_conditions(db: Session = Depends(get_db)):
    return db.query(models.Condition).all()


@router.post("/conditions", response_model=schemas.ConditionResponse)
def create_condition(item: schemas.ConditionBase, db: Session = Depends(get_db)):
    exists = db.query(models.Condition).filter(models.Condition.name == item.name).first()
    if exists:
        raise HTTPException(status_code=400, detail="Состояние уже существует")

    obj = models.Condition(name=item.name)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj