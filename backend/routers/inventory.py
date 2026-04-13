import io
import os
import re
from datetime import date
from typing import List, Optional
from urllib.parse import quote, unquote
from uuid import uuid4

import boto3
import qrcode
from botocore.config import Config
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Form
from fastapi.responses import StreamingResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from auth import require_roles
from database import get_db

# =========================
# РОУТЕРЫ
# =========================

router = APIRouter(
    prefix="/furniture",
    tags=["Inventory"],
    dependencies=[Depends(require_roles("admin", "manager", "viewer"))]
)

public_router = APIRouter(
    prefix="/furniture",
    tags=["Inventory Public"],
)


# =========================
# S3 / STORAGE HELPERS (Без изменений)
# =========================

def get_s3_client():
    bucket_name = os.getenv("S3_BUCKET_NAME")
    access_key = os.getenv("S3_ACCESS_KEY_ID")
    secret_key = os.getenv("S3_SECRET_ACCESS_KEY")
    if not bucket_name or not access_key or not secret_key:
        raise HTTPException(status_code=500, detail="S3 storage не настроен")
    endpoint_url = os.getenv("S3_ENDPOINT_URL")
    return boto3.client("s3", endpoint_url=endpoint_url, aws_access_key_id=access_key,
                        aws_secret_access_key=secret_key, config=Config(signature_version="s3v4"))


def upload_file_to_s3(file: UploadFile) -> str:
    s3 = get_s3_client()
    bucket_name = os.getenv("S3_BUCKET_NAME")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    object_key = f"item_photos/{uuid4().hex}.{ext}"
    try:
        file.file.seek(0)
        s3.upload_fileobj(file.file, bucket_name, object_key, ExtraArgs={"ContentType": file.content_type})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка S3: {str(e)}")
    return build_public_photo_url(object_key)


def build_public_photo_url(object_key: str) -> str:
    backend_url = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8000").rstrip("/")
    return f"{backend_url}/furniture/photo-proxy/{quote(object_key, safe='/')}"


def delete_file_from_s3(photo_url: Optional[str]):
    if not photo_url or "/photo-proxy/" not in photo_url: return
    try:
        object_key = unquote(photo_url.split("/photo-proxy/")[1])
        s3 = get_s3_client()
        s3.delete_object(Bucket=os.getenv("S3_BUCKET_NAME"), Key=object_key)
    except Exception:
        pass


# =========================
# CORE LOGIC: ГЕНЕРАТОР ИНВЕНТАРНОГО НОМЕРА
# =========================

def generate_smart_hex_id(db: Session, org_id: int, type_id: int, bld_id: int, room_id: int, resp_id: int) -> str:
    """
    Собирает семантический номер: [ORG]-[TYPE]-[BLD]-[ROOM]-[RESP]-[UID]
    Использует сгенерированные ранее hex_code из справочников.
    """
    org = db.query(models.Organization).get(org_id)
    f_type = db.query(models.FurnitureType).get(type_id)
    bld = db.query(models.Building).get(bld_id)
    room = db.query(models.Room).get(room_id)
    resp = db.query(models.ResponsiblePerson).get(resp_id)

    if not all([org, f_type, bld, room, resp]):
        raise HTTPException(status_code=400, detail="Не все справочники заполнены для генерации номера")

    # Получаем или создаем счетчик организации (атомарно)
    seq = db.query(models.OrganizationSequence).filter_by(organization_id=org_id).with_for_update().first()
    if not seq:
        seq = models.OrganizationSequence(organization_id=org_id, current_value=0)
        db.add(seq)

    seq.current_value += 1
    db.flush()

    # Порядковый номер в HEX (4 знака, напр. 000A)
    uid_hex = f"{seq.current_value:04X}"

    # Собираем итоговую строку. Все hex_code берем из БД
    # Формат: 01-СТ-ГЛ-404-ИИ-0001
    parts = [
        org.hex_code,
        f_type.hex_code or "XX",
        bld.hex_code or "XX",
        room.hex_code or "XXX",
        resp.hex_code or "XX",
        uid_hex
    ]
    return "-".join(parts).upper()


# =========================
# HELPERS
# =========================

def furniture_to_response(item: models.Furniture):
    return {
        "id": item.id,
        "inv_number": item.inv_number,
        "name": item.name,
        "type_id": item.type_id,
        "type_name": item.furniture_type.name if item.furniture_type else "—",
        "building_id": item.building_id,
        "building_name": item.building.name if item.building else "—",
        "room_id": item.room_id,
        "room_name": item.room.name if item.room else "—",
        "condition_id": item.condition_id,
        "condition_name": item.condition.name if item.condition else "—",
        "responsible_id": item.responsible_id,
        "responsible_name": item.responsible_person.full_name if item.responsible_person else "—",
        "model": item.model,
        "manufacturer": item.manufacturer,
        "purchase_date": item.purchase_date,
        "price_kgs": item.price_kgs,
        "photo_url": item.photo_url,
        "created_at": item.created_at,
    }


def add_history_record(db, furniture_id, user, action, description, reason=None):
    history = models.FurnitureHistory(
        furniture_id=furniture_id,
        performed_by_user_id=user.id,
        user_email=user.email,
        action=action,
        description=description,
        reason=reason
    )
    db.add(history)


# =========================
# API ENDPOINTS
# =========================

@router.get("/", response_model=List[schemas.FurnitureResponse])
def get_all_furniture(
        search: Optional[str] = Query(None),
        db: Session = Depends(get_db),
        current_user: models.User = Depends(require_roles("admin", "manager", "viewer"))
):
    query = db.query(models.Furniture).filter(models.Furniture.organization_id == current_user.organization_id)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(
            models.Furniture.inv_number.ilike(s),
            models.Furniture.name.ilike(s),
            models.Furniture.model.ilike(s)
        ))
    items = query.options(
        joinedload(models.Furniture.furniture_type),
        joinedload(models.Furniture.building),
        joinedload(models.Furniture.room),
        joinedload(models.Furniture.condition),
        joinedload(models.Furniture.responsible_person)
    ).order_by(models.Furniture.id.desc()).all()
    return [furniture_to_response(item) for item in items]


@router.post("/", response_model=List[schemas.FurnitureResponse])
async def create_furniture(
        name: str = Form(...),
        type_id: int = Form(...),
        building_id: int = Form(...),
        room_id: int = Form(...),
        responsible_id: int = Form(...),
        condition_id: int = Form(...),  # Теперь обязателен
        quantity: int = Form(1),
        model: Optional[str] = Form(None),
        price_kgs: Optional[int] = Form(None),
        photo: Optional[UploadFile] = File(None),
        db: Session = Depends(get_db),
        current_user: models.User = Depends(require_roles("admin", "manager")),
):
    photo_url = upload_file_to_s3(photo) if photo else None
    created_items = []

    for _ in range(quantity):
        # Генерируем уникальный семантический номер
        inv_no = generate_smart_hex_id(
            db, current_user.organization_id,
            type_id, building_id, room_id, responsible_id
        )

        item = models.Furniture(
            inv_number=inv_no,
            name=name,
            organization_id=current_user.organization_id,
            type_id=type_id,
            building_id=building_id,
            room_id=room_id,
            responsible_id=responsible_id,
            condition_id=condition_id,
            model=model,
            price_kgs=price_kgs,
            photo_url=photo_url
        )
        db.add(item)
        db.flush()

        add_history_record(db, item.id, current_user, "create", f"Создано автоматически. Инв. номер: {inv_no}")
        created_items.append(item)

    db.commit()
    return [furniture_to_response(i) for i in created_items]


@router.put("/{furniture_id}", response_model=schemas.FurnitureResponse)
def update_furniture(
        furniture_id: int,
        data: schemas.FurnitureUpdate,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(require_roles("admin", "manager")),
):
    item = db.query(models.Furniture).filter(
        models.Furniture.id == furniture_id,
        models.Furniture.organization_id == current_user.organization_id
    ).first()
    if not item: raise HTTPException(status_code=404, detail="Мебель не найдена")

    item.name = data.name
    item.type_id = data.type_id
    item.responsible_id = data.responsible_id
    item.condition_id = data.condition_id

    add_history_record(db, item.id, current_user, "update", "Данные обновлены", data.change_reason)
    db.commit()
    db.refresh(item)
    return furniture_to_response(item)


@router.post("/{furniture_id}/move")
def move_furniture(
        furniture_id: int,
        move_data: schemas.FurnitureMove,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(require_roles("admin", "manager")),
):
    item = db.query(models.Furniture).filter(
        models.Furniture.id == furniture_id,
        models.Furniture.organization_id == current_user.organization_id
    ).first()
    if not item: raise HTTPException(status_code=404, detail="Мебель не найдена")

    old_loc = f"{item.building.name}/{item.room.name}" if item.building and item.room else "—"
    item.building_id = move_data.building_id
    item.room_id = move_data.room_id
    db.flush()
    db.refresh(item)
    new_loc = f"{item.building.name}/{item.room.name}"

    add_history_record(db, item.id, current_user, "move", f"Перемещено из {old_loc} в {new_loc}",
                       move_data.change_reason)
    db.commit()
    return {"message": f"Перемещено в {new_loc}"}


@router.delete("/{furniture_id}")
def delete_furniture(
        furniture_id: int,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(require_roles("admin")),
):
    item = db.query(models.Furniture).filter(
        models.Furniture.id == furniture_id,
        models.Furniture.organization_id == current_user.organization_id
    ).first()
    if not item: raise HTTPException(status_code=404, detail="Мебель не найдена")

    delete_file_from_s3(item.photo_url)
    db.delete(item)
    db.commit()
    return {"detail": "Удалено успешно"}


# =========================
# PUBLIC (QR & PHOTO)
# =========================

@public_router.get("/photo-proxy/{object_key:path}")
def get_photo_via_proxy(object_key: str):
    s3 = get_s3_client()
    try:
        response = s3.get_object(Bucket=os.getenv("S3_BUCKET_NAME"), Key=object_key)
        return StreamingResponse(response["Body"], media_type=response.get("ContentType"))
    except Exception:
        raise HTTPException(status_code=404, detail="Фото не найдено")


@public_router.get("/{furniture_id}/qr")
def get_furniture_qr(furniture_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Furniture).get(furniture_id)
    if not item: raise HTTPException(status_code=404, detail="Не найдено")

    # URL для фронтенда
    data = f"{os.getenv('FRONTEND_PUBLIC_URL', 'http://localhost:3000')}/furniture/{item.id}"
    qr = qrcode.make(data)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")