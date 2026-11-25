"""
Хранилище фотографий мебели.

Основное хранилище — Supabase Storage.
Для обратной совместимости оставлено ЧТЕНИЕ старых фото из S3 / Backblaze B2:
если в базе остались ссылки на старое хранилище, они продолжат открываться,
пока фото не будут перенесены скриптом scripts/migrate_photos_to_supabase.py.

Новые загрузки всегда идут в Supabase.
"""

import os
from typing import Iterator, Optional, Tuple
from urllib.parse import quote, unquote
from uuid import uuid4

import httpx
from fastapi import HTTPException, UploadFile

# =========================
# КОНФИГУРАЦИЯ
# =========================

DEFAULT_BUCKET = "furniture-photos"
DEFAULT_MAX_PHOTO_MB = 10

ALLOWED_EXTENSIONS = {
    "jpg", "jpeg", "png", "webp", "gif",
    "bmp", "heic", "heif",
}


def get_supabase_url() -> str:
    """Базовый URL проекта Supabase, например https://abcdef.supabase.co"""
    url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    if not url:
        raise HTTPException(
            status_code=500,
            detail="Supabase Storage не настроен: отсутствует SUPABASE_URL",
        )
    return url


def get_supabase_key() -> str:
    """
    service_role ключ. Используется ТОЛЬКО на сервере — он даёт полный доступ
    к хранилищу в обход RLS и никогда не должен попадать во фронтенд.
    """
    key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
    if not key:
        raise HTTPException(
            status_code=500,
            detail="Supabase Storage не настроен: отсутствует SUPABASE_SERVICE_KEY",
        )
    return key


def get_bucket_name() -> str:
    return os.getenv("SUPABASE_BUCKET", DEFAULT_BUCKET).strip().strip("/")


def is_bucket_public() -> bool:
    return os.getenv("SUPABASE_BUCKET_PUBLIC", "true").strip().lower() != "false"


def get_key_prefix() -> str:
    return os.getenv("SUPABASE_KEY_PREFIX", "item_photos").strip("/")


def get_max_photo_bytes() -> int:
    try:
        mb = int(os.getenv("MAX_PHOTO_SIZE_MB", str(DEFAULT_MAX_PHOTO_MB)))
    except ValueError:
        mb = DEFAULT_MAX_PHOTO_MB
    return mb * 1024 * 1024


def is_supabase_configured() -> bool:
    return bool(os.getenv("SUPABASE_URL")) and bool(os.getenv("SUPABASE_SERVICE_KEY"))


def _auth_headers() -> dict:
    key = get_supabase_key()
    return {
        "Authorization": f"Bearer {key}",
        "apikey": key,
    }


# =========================
# КЛЮЧИ И URL
# =========================

def normalize_extension(filename: Optional[str]) -> str:
    if not filename or "." not in filename:
        return "bin"

    ext = filename.rsplit(".", 1)[-1].lower().strip()
    if not ext:
        return "bin"

    return ext if ext in ALLOWED_EXTENSIONS else "bin"


def build_object_key(filename: Optional[str]) -> str:
    ext = normalize_extension(filename)
    prefix = get_key_prefix()
    return f"{prefix}/{uuid4().hex}.{ext}"


def build_public_photo_url(object_key: str) -> str:
    """
    Прямая ссылка на файл в публичном bucket Supabase (раздаётся через CDN,
    без обращения к нашему бэкенду).

    Если bucket приватный — отдаём ссылку на прокси-эндпоинт бэкенда,
    который скачивает файл по service_role ключу.
    """
    safe_key = quote(object_key, safe="/")

    if is_bucket_public():
        return f"{get_supabase_url()}/storage/v1/object/public/{get_bucket_name()}/{safe_key}"

    backend_url = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8000").rstrip("/")
    return f"{backend_url}/furniture/photo-proxy/{safe_key}"


def extract_object_key(photo_url: Optional[str]) -> Optional[str]:
    """Вытаскивает ключ объекта из ссылки любого поддерживаемого формата."""
    if not photo_url:
        return None

    # Публичная ссылка Supabase
    public_marker = f"/storage/v1/object/public/{get_bucket_name()}/"
    if public_marker in photo_url:
        return unquote(photo_url.split(public_marker, 1)[1])

    # Ссылка через наш прокси (приватный bucket или легаси B2)
    if "/photo-proxy/" in photo_url:
        return unquote(photo_url.split("/photo-proxy/", 1)[1])

    # Легаси: публичная база старого S3
    legacy_base = os.getenv("S3_PUBLIC_BASE_URL", "").rstrip("/")
    if legacy_base and photo_url.startswith(legacy_base):
        return unquote(photo_url.replace(legacy_base + "/", "", 1))

    # Легаси: в базе хранился «голый» ключ вида item_photos/xxx.jpg
    if not photo_url.startswith("http"):
        return unquote(photo_url.lstrip("/"))

    return None


def is_legacy_photo_url(photo_url: Optional[str]) -> bool:
    """True, если ссылка ведёт не в Supabase, а в старое хранилище."""
    if not photo_url:
        return False

    return f"/storage/v1/object/public/{get_bucket_name()}/" not in photo_url


# =========================
# ЗАГРУЗКА
# =========================

def upload_photo(file: UploadFile) -> str:
    """Загружает файл в Supabase Storage и возвращает URL для сохранения в БД."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Файл не выбран")

    file.file.seek(0)
    content = file.file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Файл пустой")

    max_bytes = get_max_photo_bytes()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Файл слишком большой. Максимум {max_bytes // (1024 * 1024)} МБ",
        )

    object_key = build_object_key(file.filename)
    upload_url = (
        f"{get_supabase_url()}/storage/v1/object/"
        f"{get_bucket_name()}/{quote(object_key, safe='/')}"
    )

    headers = _auth_headers()
    headers["Content-Type"] = file.content_type or "application/octet-stream"
    headers["x-upsert"] = "false"
    headers["Cache-Control"] = "public, max-age=86400"

    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(upload_url, content=content, headers=headers)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Не удалось связаться с Supabase Storage: {exc}",
        )

    if response.status_code not in (200, 201):
        raise HTTPException(
            status_code=502,
            detail=f"Ошибка загрузки файла в Supabase Storage: {response.text}",
        )

    return build_public_photo_url(object_key)


# =========================
# УДАЛЕНИЕ
# =========================

def delete_photo(photo_url: Optional[str]) -> None:
    """
    Удаляет файл. Ошибки намеренно проглатываются: если объекта уже нет
    или хранилище недоступно, это не должно валить удаление мебели.
    """
    object_key = extract_object_key(photo_url)
    if not object_key:
        return

    if is_legacy_photo_url(photo_url):
        _delete_legacy_photo(object_key)
        return

    if not is_supabase_configured():
        return

    delete_url = (
        f"{get_supabase_url()}/storage/v1/object/"
        f"{get_bucket_name()}/{quote(object_key, safe='/')}"
    )

    try:
        with httpx.Client(timeout=30.0) as client:
            client.delete(delete_url, headers=_auth_headers())
    except Exception:
        pass


# =========================
# ЧТЕНИЕ ЧЕРЕЗ ПРОКСИ
# =========================

def open_photo_stream(object_key: str) -> Tuple[Iterator[bytes], str]:
    """
    Отдаёт содержимое файла для прокси-эндпоинта.
    Сначала пробует Supabase, при неудаче — старое S3/B2 хранилище.
    """
    if is_supabase_configured():
        result = _open_supabase_stream(object_key)
        if result is not None:
            return result

    result = _open_legacy_stream(object_key)
    if result is not None:
        return result

    raise HTTPException(status_code=404, detail="Фото не найдено")


def _open_supabase_stream(object_key: str) -> Optional[Tuple[Iterator[bytes], str]]:
    download_url = (
        f"{get_supabase_url()}/storage/v1/object/"
        f"{get_bucket_name()}/{quote(object_key, safe='/')}"
    )

    try:
        response = httpx.get(download_url, headers=_auth_headers(), timeout=60.0)
    except httpx.HTTPError:
        return None

    if response.status_code != 200:
        return None

    content_type = response.headers.get("content-type", "application/octet-stream")
    return iter([response.content]), content_type


# =========================
# ЛЕГАСИ S3 / BACKBLAZE B2 (только чтение и удаление)
# =========================

def _legacy_s3_client():
    bucket = os.getenv("S3_BUCKET_NAME")
    access_key = os.getenv("S3_ACCESS_KEY_ID")
    secret_key = os.getenv("S3_SECRET_ACCESS_KEY")

    if not bucket or not access_key or not secret_key:
        return None, None

    try:
        import boto3
        from botocore.config import Config
    except ImportError:
        return None, None

    client = boto3.client(
        "s3",
        region_name=os.getenv("S3_REGION", "auto"),
        endpoint_url=os.getenv("S3_ENDPOINT_URL"),
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4", s3={"addressing_style": "auto"}),
    )
    return client, bucket


def _open_legacy_stream(object_key: str) -> Optional[Tuple[Iterator[bytes], str]]:
    client, bucket = _legacy_s3_client()
    if client is None:
        return None

    try:
        response = client.get_object(Bucket=bucket, Key=object_key)
    except Exception:
        return None

    content_type = response.get("ContentType") or "application/octet-stream"
    return response["Body"].iter_chunks(), content_type


def _delete_legacy_photo(object_key: str) -> None:
    client, bucket = _legacy_s3_client()
    if client is None:
        return

    try:
        client.delete_object(Bucket=bucket, Key=object_key)
    except Exception:
        pass
