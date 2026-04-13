import re
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
    dependencies=[Depends(auth.require_roles("admin", "manager", "viewer"))]
)


# --- УТИЛИТА ГЕНЕРАЦИИ КОДА ---

def generate_unique_hex(db: Session, model, name: str, org_id: int) -> str:
    """
    Берет первые 2-3 буквы названия, делает их кодом.
    Если код 'ST' уже есть у организации, сделает 'ST1', 'ST2' и т.д.
    """
    # Очищаем строку от спецсимволов и берем первые 2 буквы
    clean_name = re.sub(r'[^a-zA-Zа-яА-Я0-9]', '', name)
    base_code = clean_name[:2].upper()

    # Если название слишком короткое
    if not base_code:
        base_code = "XX"

    candidate = base_code
    counter = 1

    # Проверка уникальности в рамках организации
    while True:
        exists = db.query(model).filter(
            model.organization_id == org_id,
            model.hex_code == candidate
        ).first()

        if not exists:
            return candidate

        candidate = f"{base_code}{counter}"
        counter += 1


# --- ТИПЫ МЕБЕЛИ ---

@router.get("/types", response_model=List[schemas.FurnitureTypeResponse])
def get_types(db: Session = Depends(get_db),
              current_user: models.User = Depends(auth.require_roles("admin", "manager", "viewer"))):
    return db.query(models.FurnitureType).filter(
        models.FurnitureType.organization_id == current_user.organization_id).all()


@router.post("/types", response_model=schemas.FurnitureTypeResponse)
def create_type(
        item: schemas.FurnitureTypeCreate,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(auth.require_roles("admin"))
):
    # Проверка на дубликат по имени
    if db.query(models.FurnitureType).filter_by(name=item.name, organization_id=current_user.organization_id).first():
        raise HTTPException(status_code=400, detail="Тип с таким названием уже существует")

    new_hex = generate_unique_hex(db, models.FurnitureType, item.name, current_user.organization_id)

    obj = models.FurnitureType(
        name=item.name,
        hex_code=new_hex,
        organization_id=current_user.organization_id
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# --- ЗДАНИЯ ---

@router.get("/buildings", response_model=List[schemas.BuildingResponse])
def get_buildings(db: Session = Depends(get_db),
                  current_user: models.User = Depends(auth.require_roles("admin", "manager", "viewer"))):
    return db.query(models.Building).filter(models.Building.organization_id == current_user.organization_id).all()


@router.post("/buildings", response_model=schemas.BuildingResponse)
def create_building(
        item: schemas.BuildingCreate,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(auth.require_roles("admin"))
):
    new_hex = generate_unique_hex(db, models.Building, item.name, current_user.organization_id)

    obj = models.Building(
        name=item.name,
        hex_code=new_hex,
        organization_id=current_user.organization_id
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# --- КОМНАТЫ ---

@router.get("/rooms", response_model=List[schemas.RoomResponse])
def get_rooms(db: Session = Depends(get_db),
              current_user: models.User = Depends(auth.require_roles("admin", "manager", "viewer"))):
    return db.query(models.Room).filter(models.Room.organization_id == current_user.organization_id).all()


@router.post("/rooms", response_model=schemas.RoomResponse)
def create_room(
        item: schemas.RoomCreate,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(auth.require_roles("admin", "manager"))
):
    # Проверяем здание
    building = db.query(models.Building).filter_by(id=item.building_id,
                                                   organization_id=current_user.organization_id).first()
    if not building:
        raise HTTPException(status_code=400, detail="Здание не найдено")

    # Для комнат hex_code — это обычно просто её номер (напр. "404")
    # Очищаем от пробелов и делаем капсом
    room_hex = re.sub(r'\s+', '', item.name).upper()

    obj = models.Room(
        name=item.name,
        hex_code=room_hex,
        building_id=item.building_id,
        organization_id=current_user.organization_id
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# --- ОТВЕТСТВЕННЫЕ ЛИЦА ---

@router.get("/responsible", response_model=List[schemas.ResponsiblePersonResponse])
def get_responsible(db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.require_roles("admin", "manager", "viewer"))):
    return db.query(models.ResponsiblePerson).filter(
        models.ResponsiblePerson.organization_id == current_user.organization_id).all()


@router.post("/responsible", response_model=schemas.ResponsiblePersonResponse)
def create_responsible(
        item: schemas.ResponsiblePersonCreate,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(auth.require_roles("admin"))
):
    # Генерируем код (Иванов Иван -> ИИ или IV)
    new_hex = generate_unique_hex(db, models.ResponsiblePerson, item.full_name, current_user.organization_id)

    obj = models.ResponsiblePerson(
        full_name=item.full_name,
        hex_code=new_hex,
        organization_id=current_user.organization_id
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# --- СОСТОЯНИЯ (Глобальные) ---

@router.get("/conditions", response_model=List[schemas.ConditionResponse])
def get_conditions(db: Session = Depends(get_db)):
    return db.query(models.Condition).all()


@router.post("/conditions", response_model=schemas.ConditionResponse)
def create_condition(
        item: schemas.ConditionCreate,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(auth.require_roles("admin"))
):
    # Проверка на существование (так как справочник глобальный)
    existing = db.query(models.Condition).filter_by(name=item.name).first()
    if existing:
        return existing

    obj = models.Condition(name=item.name)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj