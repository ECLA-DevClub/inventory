import io
import os
from typing import List, Optional
from urllib.parse import quote
from uuid import uuid4

import boto3
import qrcode
from botocore.config import Config
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from auth import require_roles
from database import get_db

router = APIRouter(
    prefix="/furniture",
    tags=["Inventory"]
)


# =========================
# S3 CONFIG
# =========================

def get_s3_client():
    bucket_name = os.getenv("S3_BUCKET_NAME")
    access_key = os.getenv("S3_ACCESS_KEY_ID")
    secret_key = os.getenv("S3_SECRET_ACCESS_KEY")

    if not bucket_name or not access_key or not secret_key:
        raise HTTPException(
            status_code=500,
            detail="S3 storage не настроен: отсутствуют S3_BUCKET_NAME / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY"
        )

    region = os.getenv("S3_REGION", "auto")
    endpoint_url = os.getenv("S3_ENDPOINT_URL")

    return boto3.client(
        "s3",
        region_name=region,
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4", s3={"addressing_style": "auto"}),
    )


def get_s3_bucket_name() -> str:
    bucket_name = os.getenv("S3_BUCKET_NAME")
    if not bucket_name:
        raise HTTPException(status_code=500, detail="S3_BUCKET_NAME не задан")
    return bucket_name


def get_s3_public_base_url() -> str:
    public_base_url = os.getenv("S3_PUBLIC_BASE_URL", "").rstrip("/")
    if not public_base_url:
        raise HTTPException(
            status_code=500,
            detail="S3_PUBLIC_BASE_URL не задан. Нужен публичный base URL для открытия фото."
        )
    return public_base_url


def get_s3_key_prefix() -> str:
    return os.getenv("S3_KEY_PREFIX", "item_photos").strip("/")


def normalize_extension(filename: Optional[str]) -> str:
    if not filename or "." not in filename:
        return "bin"

    ext = filename.rsplit(".", 1)[-1].lower().strip()
    if not ext:
        return "bin"

    allowed = {
        "jpg", "jpeg", "png", "webp", "gif",
        "bmp", "heic", "heif"
    }
    return ext if ext in allowed else "bin"


def build_s3_object_key(filename: Optional[str]) -> str:
    ext = normalize_extension(filename)
    prefix = get_s3_key_prefix()
    return f"{prefix}/{uuid4().hex}.{ext}"


def build_public_photo_url(object_key: str) -> str:
    base = get_s3_public_base_url()
    return f"{base}/{quote(object_key)}"


def extract_s3_key_from_photo_url(photo_url: Optional[str]) -> Optional[str]:
    if not photo_url:
        return None

    public_base = os.getenv("S3_PUBLIC_BASE_URL", "").rstrip("/")
    if not public_base:
        return None

    if photo_url.startswith(public_base + "/"):
        return photo_url.replace(public_base + "/", "", 1)

    return None


def upload_file_to_s3(file: UploadFile) -> str:
    s3 = get_s3_client()
    bucket_name = get_s3_bucket_name()
    object_key = build_s3_object_key(file.filename)

    extra_args = {}
    if file.content_type:
        extra_args["ContentType"] = file.content_type

    try:
        file.file.seek(0)
        s3.upload_fileobj(
            file.file,
            bucket_name,
            object_key,
            ExtraArgs=extra_args if extra_args else None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки файла в S3: {str(e)}")

    return build_public_photo_url(object_key)


def delete_file_from_s3_by_photo_url(photo_url: Optional[str]) -> None:
    object_key = extract_s3_key_from_photo_url(photo_url)
    if not object_key:
        return

    try:
        s3 = get_s3_client()
        bucket_name = get_s3_bucket_name()
        s3.delete_object(Bucket=bucket_name, Key=object_key)
    except Exception:
        # Удаление файла не должно ломать основную операцию
        pass


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

        "model": item.model,
        "manufacturer": item.manufacturer,
        "purchase_date": item.purchase_date,

        "price_kgs": item.price_kgs,
        "photo_url": item.photo_url,
        "created_at": item.created_at,
    }


def build_furniture_public_url(furniture_id: int) -> str:
    frontend_public_url = os.getenv(
        "FRONTEND_PUBLIC_URL",
        "http://localhost:5173"
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
        model=item.model,
        manufacturer=item.manufacturer,
        purchase_date=item.purchase_date,
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
    item.model = item_data.model
    item.manufacturer = item_data.manufacturer
    item.purchase_date = item_data.purchase_date
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

    old_photo_url = item.photo_url

    db.delete(item)
    db.commit()

    delete_file_from_s3_by_photo_url(old_photo_url)

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

    if not file.filename:
        raise HTTPException(status_code=400, detail="Файл не выбран")

    old_photo_url = item.photo_url
    new_photo_url = upload_file_to_s3(file)

    item.photo_url = new_photo_url
    db.commit()
    db.refresh(item)

    delete_file_from_s3_by_photo_url(old_photo_url)

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

@router.get("/history/{furniture_id}", response_model=List[schemas.FurnitureHistoryResponse])
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