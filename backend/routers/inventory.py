import os
import shutil
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/furniture",
    tags=["Inventory"]
)

UPLOAD_DIR = "static/item_photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def furniture_to_response(item: models.Furniture):
    return {
        "id": item.id,
        "inv_number": item.inv_number,
        "name": item.name,
        "type_id": item.type_id,
        "type_name": item.furniture_type.name if item.furniture_type else "",
        "building_id": item.building_id,
        "building_name": item.building.name if item.building else "",
        "room_id": item.room_id,
        "room_name": item.room.name if item.room else "",
        "condition_id": item.condition_id,
        "condition_name": item.condition.name if item.condition else None,
        "photo_url": item.photo_url,
        "created_at": item.created_at,
    }


@router.get("/", response_model=List[schemas.FurnitureResponse])
def get_all_furniture(db: Session = Depends(get_db)):
    items = (
        db.query(models.Furniture)
        .options(
            joinedload(models.Furniture.furniture_type),
            joinedload(models.Furniture.building),
            joinedload(models.Furniture.room),
            joinedload(models.Furniture.condition),
        )
        .all()
    )
    return [furniture_to_response(item) for item in items]


@router.get("/{furniture_id}", response_model=schemas.FurnitureResponse)
def get_furniture_by_id(furniture_id: int, db: Session = Depends(get_db)):
    item = (
        db.query(models.Furniture)
        .options(
            joinedload(models.Furniture.furniture_type),
            joinedload(models.Furniture.building),
            joinedload(models.Furniture.room),
            joinedload(models.Furniture.condition),
        )
        .filter(models.Furniture.id == furniture_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Мебель не найдена")
    return furniture_to_response(item)


@router.post("/", response_model=schemas.FurnitureResponse)
def create_furniture(item: schemas.FurnitureCreate, db: Session = Depends(get_db)):
    furniture_type = db.query(models.FurnitureType).filter(models.FurnitureType.id == item.type_id).first()
    building = db.query(models.Building).filter(models.Building.id == item.building_id).first()
    room = db.query(models.Room).filter(models.Room.id == item.room_id).first()

    if item.condition_id is not None:
        condition = db.query(models.Condition).filter(models.Condition.id == item.condition_id).first()
    else:
        condition = None

    if not furniture_type:
        raise HTTPException(status_code=400, detail="Неверный type_id")
    if not building:
        raise HTTPException(status_code=400, detail="Неверный building_id")
    if not room:
        raise HTTPException(status_code=400, detail="Неверный room_id")
    if item.condition_id is not None and not condition:
        raise HTTPException(status_code=400, detail="Неверный condition_id")

    last_item = (
        db.query(models.Furniture)
        .order_by(models.Furniture.id.desc())
        .first()
    )

    next_number = 1 if not last_item else last_item.id + 1
    inv_number = f"INV-{next_number:04d}"

    db_item = models.Furniture(
        inv_number=inv_number,
        name=item.name,
        type_id=item.type_id,
        building_id=item.building_id,
        room_id=item.room_id,
        condition_id=item.condition_id,
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    db_item = (
        db.query(models.Furniture)
        .options(
            joinedload(models.Furniture.furniture_type),
            joinedload(models.Furniture.building),
            joinedload(models.Furniture.room),
            joinedload(models.Furniture.condition),
        )
        .filter(models.Furniture.id == db_item.id)
        .first()
    )

    return furniture_to_response(db_item)


@router.put("/{furniture_id}", response_model=schemas.FurnitureResponse)
def update_furniture(
    furniture_id: int,
    item_data: schemas.FurnitureUpdate,
    db: Session = Depends(get_db)
):
    item = db.query(models.Furniture).filter(models.Furniture.id == furniture_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Мебель не найдена")

    furniture_type = db.query(models.FurnitureType).filter(models.FurnitureType.id == item_data.type_id).first()
    building = db.query(models.Building).filter(models.Building.id == item_data.building_id).first()
    room = db.query(models.Room).filter(models.Room.id == item_data.room_id).first()

    if item_data.condition_id is not None:
        condition = db.query(models.Condition).filter(models.Condition.id == item_data.condition_id).first()
    else:
        condition = None

    if not furniture_type:
        raise HTTPException(status_code=400, detail="Неверный type_id")
    if not building:
        raise HTTPException(status_code=400, detail="Неверный building_id")
    if not room:
        raise HTTPException(status_code=400, detail="Неверный room_id")
    if item_data.condition_id is not None and not condition:
        raise HTTPException(status_code=400, detail="Неверный condition_id")

    item.name = item_data.name
    item.type_id = item_data.type_id
    item.building_id = item_data.building_id
    item.room_id = item_data.room_id
    item.condition_id = item_data.condition_id

    db.commit()
    db.refresh(item)

    item = (
        db.query(models.Furniture)
        .options(
            joinedload(models.Furniture.furniture_type),
            joinedload(models.Furniture.building),
            joinedload(models.Furniture.room),
            joinedload(models.Furniture.condition),
        )
        .filter(models.Furniture.id == item.id)
        .first()
    )

    return furniture_to_response(item)


@router.delete("/{furniture_id}")
def delete_furniture(furniture_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Furniture).filter(models.Furniture.id == furniture_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Мебель не найдена")

    if item.photo_url:
        file_path = item.photo_url.lstrip("/")
        if os.path.exists(file_path):
            os.remove(file_path)

    db.delete(item)
    db.commit()
    return {"detail": "Мебель удалена"}


@router.post("/{furniture_id}/photo")
def upload_furniture_photo(
    furniture_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    item = db.query(models.Furniture).filter(models.Furniture.id == furniture_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Мебель не найдена")

    max_file_size = 5 * 1024 * 1024
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > max_file_size:
        raise HTTPException(status_code=400, detail="Файл слишком большой. Максимум 5 MB")

    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png"]:
        raise HTTPException(status_code=400, detail="Разрешены только JPG и PNG")

    unique_filename = f"{uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    item.photo_url = f"/static/item_photos/{unique_filename}"
    db.commit()
    db.refresh(item)

    return {
        "message": "Фото успешно загружено",
        "photo_url": item.photo_url
    }