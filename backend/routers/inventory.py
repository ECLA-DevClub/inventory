import os
import shutil
from uuid import uuid4
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/furniture",
    tags=["Inventory"]
)

UPLOAD_DIR = "static/item_photos"


# --- СОЗДАНИЕ ЗАПИСИ О МЕБЕЛИ (Без фото) ---
@router.post("/", response_model=schemas.FurnitureOut)
def create_furniture(
        name: str = Form(...),
        db: Session = Depends(get_db)
):
    """
    Создаем запись о мебели в базе .
    Получаем ID , который потом используем для загрузки фото .
    """
    db_item = models.Furniture(name=name, photo_url=None)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


# --- ЗАГРУЗКА ФОТО К СУЩЕСТВУЮЩЕЙ МЕБЕЛИ ---
@router.post("/{furniture_id}/photo")
def upload_furniture_photo(
        furniture_id: int,
        file: UploadFile = File(...),
        db: Session = Depends(get_db)
):
    """
    Загружаем фото для конкретного ID .
    Проверки: формат JPG/PNG , размер до 5MB .
    """
    # Проверка размера (5MB = 5 * 1024 * 1024 байт)
    MAX_FILE_SIZE = 5 * 1024 * 1024
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой. Максимум 5MB")

    # Проверка формата
    file_extension = file.filename.split(".")[-1].lower()
    if file_extension not in ["jpg", "jpeg", "png"]:
        raise HTTPException(status_code=400, detail="Разрешены только JPG и PNG")

    # Поиск мебели в базе
    item = db.query(models.Furniture).filter(models.Furniture.id == furniture_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Мебель с таким ID не найдена")

    # Сохранение файла
    unique_filename = f"{uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Обновление ссылки в базе
    item.photo_url = f"/static/item_photos/{unique_filename}"
    db.commit()

    return {"message": "Фото успешно загружено", "photo_url": item.photo_url}


# --- ПОЛУЧЕНИЕ СПИСКА (Для проверки) ---
@router.get("/", response_model=List[schemas.FurnitureOut])
def get_all_furniture(db: Session = Depends(get_db)):
    return db.query(models.Furniture).all()


# --- УДАЛЕНИЕ (CRUD) ---
@router.delete("/{furniture_id}")
def delete_furniture(furniture_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Furniture).filter(models.Furniture.id == furniture_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.photo_url:
        path = item.photo_url.lstrip("/")
        if os.path.exists(path):
            os.remove(path)

    db.delete(item)
    db.commit()
    return {"detail": "Deleted"}


# GET /furniture/{id} — Получение одного предмета по ID
@router.get("/{furniture_id}", response_model=schemas.FurnitureOut)
def get_furniture_by_id(furniture_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Furniture).filter(models.Furniture.id == furniture_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Предмет не найден")
    return item


# PUT /furniture/{id} — Обновление данных предмета
@router.put("/{furniture_id}", response_model=schemas.FurnitureOut)
def update_furniture(
        furniture_id: int,
        name: str = Form(...),
        db: Session = Depends(get_db)
):
    item = db.query(models.Furniture).filter(models.Furniture.id == furniture_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Предмет не найден")

    item.name = name
    db.commit()
    db.refresh(item)
    return item