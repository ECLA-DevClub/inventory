from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
import auth
from database import get_db

router = APIRouter(
    prefix="/references",
    tags=["References"],
    # Глобально требуем авторизацию
    dependencies=[Depends(auth.require_roles("admin", "manager", "viewer"))]
)

# --- ТИПЫ МЕБЕЛИ ---

@router.get("/types", response_model=List[schemas.FurnitureTypeResponse])
def get_types(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_roles("admin", "manager", "viewer"))):
    # Показываем только типы этой организации
    return db.query(models.FurnitureType).filter(models.FurnitureType.organization_id == current_user.organization_id).all()

@router.post("/types", response_model=schemas.FurnitureTypeResponse)
def create_type(
    item: schemas.FurnitureTypeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("admin"))
):
    # Проверка на дубликат внутри организации
    exists = db.query(models.FurnitureType).filter(
        models.FurnitureType.name == item.name,
        models.FurnitureType.organization_id == current_user.organization_id
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Этот тип уже существует в вашей организации")

    obj = models.FurnitureType(
        name=item.name,
        hex_code=item.hex_code,
        organization_id=current_user.organization_id
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

# --- ЗДАНИЯ ---

@router.get("/buildings", response_model=List[schemas.BuildingResponse])
def get_buildings(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_roles("admin", "manager", "viewer"))):
    return db.query(models.Building).filter(models.Building.organization_id == current_user.organization_id).all()

@router.post("/buildings", response_model=schemas.BuildingResponse)
def create_building(
    item: schemas.BuildingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("admin"))
):
    obj = models.Building(
        name=item.name,
        hex_code=item.hex_code,
        organization_id=current_user.organization_id
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

# --- КОМНАТЫ ---

@router.get("/rooms", response_model=List[schemas.RoomResponse])
def get_rooms(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_roles("admin", "manager", "viewer"))):
    return db.query(models.Room).filter(models.Room.organization_id == current_user.organization_id).all()

@router.post("/rooms", response_model=schemas.RoomResponse)
def create_room(
    item: schemas.RoomCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("admin", "manager"))
):
    # Проверяем, что здание принадлежит этой же организации
    building = db.query(models.Building).filter(
        models.Building.id == item.building_id,
        models.Building.organization_id == current_user.organization_id
    ).first()
    if not building:
        raise HTTPException(status_code=400, detail="Здание не найдено или не принадлежит вашей организации")

    obj = models.Room(
        name=item.name,
        hex_code=item.hex_code,
        building_id=item.building_id,
        organization_id=current_user.organization_id
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

# --- ОТВЕТСТВЕННЫЕ ЛИЦА ---

@router.get("/responsible", response_model=List[schemas.ResponsiblePersonResponse])
def get_responsible(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_roles("admin", "manager", "viewer"))):
    return db.query(models.ResponsiblePerson).filter(models.ResponsiblePerson.organization_id == current_user.organization_id).all()

@router.post("/responsible", response_model=schemas.ResponsiblePersonResponse)
def create_responsible(
    item: schemas.ResponsiblePersonCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("admin"))
):
    obj = models.ResponsiblePerson(
        full_name=item.full_name,
        hex_code=item.hex_code,
        organization_id=current_user.organization_id
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj