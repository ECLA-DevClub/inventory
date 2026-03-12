import io
import os
import shutil
from typing import List
from uuid import uuid4

import qrcode
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from auth import get_current_user, require_roles
from database import get_db

router = APIRouter(
    prefix="/furniture",
    tags=["Inventory"]
)

UPLOAD_DIR = "static/item_photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# =========================
# Helper
# =========================

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

        "price_kgs": item.price_kgs,

        "photo_url": item.photo_url,
        "created_at": item.created_at,
    }


def build_furniture_public_url(furniture_id: int) -> str:
    frontend_public_url = os.getenv(
        "FRONTEND_PUBLIC_URL",
        "http://localhost:5173/inventory"
    ).rstrip("/")

    return f"{frontend_public_url}/furniture/{furniture_id}"


# =========================
# GET ALL
# =========================

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


# =========================
# GET BY ID
# =========================

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


# =========================
# CREATE
# =========================

@router.post("/", response_model=schemas.FurnitureResponse)
def create_furniture(
    item: schemas.FurnitureCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "manager")),
):
    last_item = db.query(models.Furniture).order_by(models.Furniture.id.desc()).first()

    next_number = 1 if not last_item else last_item.id + 1
    inv_number = f"INV-{next_number:04d}"

    db_item = models.Furniture(
        inv_number=inv_number,
        name=item.name,
        type_id=item.type_id,
        building_id=item.building_id,
        room_id=item.room_id,
        condition_id=item.condition_id,
        price_kgs=item.price_kgs,
    )

    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    history = models.FurnitureHistory(
        furniture_id=db_item.id,
        user_email=current_user.email,
        action="create",
        description=f"Создана мебель {db_item.name}"
    )

    db.add(history)
    db.commit()

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


# =========================
# UPDATE
# =========================

@router.put("/{furniture_id}", response_model=schemas.FurnitureResponse)
def update_furniture(
    furniture_id: int,
    item_data: schemas.FurnitureUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "manager")),
):
    item = db.query(models.Furniture).filter(models.Furniture.id == furniture_id).first()

    if not item:
        raise HTTPException(status_code=404, detail="Мебель не найдена")

    item.name = item_data.name
    item.type_id = item_data.type_id
    item.building_id = item_data.building_id
    item.room_id = item_data.room_id
    item.condition_id = item_data.condition_id
    item.price_kgs = item_data.price_kgs

    db.commit()
    db.refresh(item)

    history = models.FurnitureHistory(
        furniture_id=item.id,
        user_email=current_user.email,
        action="update",
        description=f"Обновлена мебель {item.name}"
    )

    db.add(history)
    db.commit()

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


# =========================
# DELETE
# =========================

@router.delete("/{furniture_id}")
def delete_furniture(
    furniture_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin")),
):
    item = db.query(models.Furniture).filter(models.Furniture.id == furniture_id).first()

    if not item:
        raise HTTPException(status_code=404, detail="Мебель не найдена")

    db.delete(item)
    db.commit()

    history = models.FurnitureHistory(
        furniture_id=furniture_id,
        user_email=current_user.email,
        action="delete",
        description="Удалена мебель"
    )

    db.add(history)
    db.commit()

    return {"detail": "Мебель удалена"}


# =========================
# UPLOAD PHOTO
# =========================

@router.post("/{furniture_id}/photo")
def upload_furniture_photo(
    furniture_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "manager")),
):
    item = db.query(models.Furniture).filter(models.Furniture.id == furniture_id).first()

    if not item:
        raise HTTPException(status_code=404, detail="Мебель не найдена")

    ext = file.filename.split(".")[-1]
    unique_filename = f"{uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    item.photo_url = f"/static/item_photos/{unique_filename}"
    db.commit()

    history = models.FurnitureHistory(
        furniture_id=item.id,
        user_email=current_user.email,
        action="update",
        description="Обновлено фото мебели"
    )

    db.add(history)
    db.commit()

    return {
        "message": "Фото загружено",
        "photo_url": item.photo_url
    }


# =========================
# HISTORY
# =========================

@router.get("/history/{furniture_id}")
def get_furniture_history(furniture_id: int, db: Session = Depends(get_db)):
    history = (
        db.query(models.FurnitureHistory)
        .filter(models.FurnitureHistory.furniture_id == furniture_id)
        .order_by(models.FurnitureHistory.created_at.desc())
        .all()
    )

    return history


# =========================
# QR CODE
# =========================

@router.get("/{furniture_id}/qr")
def get_furniture_qr(furniture_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Furniture).filter(models.Furniture.id == furniture_id).first()

    if not item:
        raise HTTPException(status_code=404, detail="Мебель не найдена")

    target_url = build_furniture_public_url(furniture_id)

    qr = qrcode.QRCode(
        version=1,
        box_size=10,
        border=4
    )
    qr.add_data(target_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    filename = f"{item.inv_number}_qr.png"

    return StreamingResponse(
        buffer,
        media_type="image/png",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"'
        }
    )


# =========================
# MOVE FURNITURE
# =========================

@router.post("/{furniture_id}/move")
def move_furniture(
    furniture_id: int,
    move_data: schemas.FurnitureMove,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "manager")),
):
    item = db.query(models.Furniture).filter(models.Furniture.id == furniture_id).first()

    if not item:
        raise HTTPException(status_code=404, detail="Мебель не найдена")

    building = db.query(models.Building).filter(models.Building.id == move_data.building_id).first()
    room = db.query(models.Room).filter(models.Room.id == move_data.room_id).first()

    if not building:
        raise HTTPException(status_code=400, detail="Здание не найдено")

    if not room:
        raise HTTPException(status_code=400, detail="Комната не найдена")

    old_room = item.room.name if item.room else "—"
    old_building = item.building.name if item.building else "—"

    item.building_id = move_data.building_id
    item.room_id = move_data.room_id

    db.commit()
    db.refresh(item)

    history = models.FurnitureHistory(
        furniture_id=item.id,
        user_email=current_user.email,
        action="move",
        description=f"Перемещение из {old_building}/{old_room} в {building.name}/{room.name}"
    )

    db.add(history)
    db.commit()

    return {
        "message": "Мебель перемещена",
        "from": f"{old_building}/{old_room}",
        "to": f"{building.name}/{room.name}"
    }