"""
Разовый перенос фотографий мебели в Supabase Storage.

Что делает:
  1. При необходимости создаёт bucket в Supabase.
  2. Находит записи мебели, у которых photo_url ведёт не в Supabase.
  3. Забирает файл из старого места (локальная папка static/item_photos
     или S3 / Backblaze B2) и заливает его в Supabase под тем же ключом.
  4. Переписывает photo_url в базе на новую ссылку.

Запуск из папки backend:

    python scripts/migrate_photos_to_supabase.py --create-bucket --dry-run
    python scripts/migrate_photos_to_supabase.py --create-bucket

Скрипт идемпотентный: уже перенесённые записи пропускаются,
поэтому его можно запускать повторно.
"""

import argparse
import mimetypes
import os
import sys
from urllib.parse import quote

# Скрипт лежит в backend/scripts, а модули приложения — в backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from dotenv import load_dotenv

load_dotenv()

import models  # noqa: E402
import storage  # noqa: E402
from database import SessionLocal  # noqa: E402


def create_bucket_if_missing() -> None:
    """Создаёт bucket, если его ещё нет. Уже существующий не трогает."""
    url = f"{storage.get_supabase_url()}/storage/v1/bucket"
    bucket = storage.get_bucket_name()

    payload = {
        "id": bucket,
        "name": bucket,
        "public": storage.is_bucket_public(),
        "file_size_limit": storage.get_max_photo_bytes(),
    }

    headers = storage._auth_headers()
    headers["Content-Type"] = "application/json"

    response = httpx.post(url, json=payload, headers=headers, timeout=30.0)

    if response.status_code in (200, 201):
        print(f"[bucket] создан: {bucket} (public={storage.is_bucket_public()})")
    elif response.status_code == 409:
        print(f"[bucket] уже существует: {bucket}")
    else:
        print(f"[bucket] не удалось создать: {response.status_code} {response.text}")


def read_local_file(object_key: str) -> bytes | None:
    """Пробует найти файл в локальной папке static (старые загрузки)."""
    candidates = [
        os.path.join("static", object_key),
        os.path.join("static", "item_photos", os.path.basename(object_key)),
    ]

    for path in candidates:
        if os.path.isfile(path):
            with open(path, "rb") as handle:
                return handle.read()

    return None


def read_legacy_s3(object_key: str) -> bytes | None:
    """Пробует скачать файл из старого S3 / Backblaze B2."""
    client, bucket = storage._legacy_s3_client()
    if client is None:
        return None

    try:
        response = client.get_object(Bucket=bucket, Key=object_key)
        return response["Body"].read()
    except Exception as exc:
        print(f"    S3: не удалось скачать ({exc})")
        return None


def upload_bytes(object_key: str, content: bytes) -> bool:
    upload_url = (
        f"{storage.get_supabase_url()}/storage/v1/object/"
        f"{storage.get_bucket_name()}/{quote(object_key, safe='/')}"
    )

    content_type = mimetypes.guess_type(object_key)[0] or "application/octet-stream"

    headers = storage._auth_headers()
    headers["Content-Type"] = content_type
    headers["x-upsert"] = "true"
    headers["Cache-Control"] = "public, max-age=86400"

    response = httpx.post(upload_url, content=content, headers=headers, timeout=120.0)

    if response.status_code in (200, 201):
        return True

    print(f"    Supabase: ошибка загрузки {response.status_code} {response.text}")
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Перенос фото в Supabase Storage")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="только показать план, ничего не менять",
    )
    parser.add_argument(
        "--create-bucket",
        action="store_true",
        help="создать bucket перед переносом",
    )
    args = parser.parse_args()

    if not storage.is_supabase_configured():
        print("ОШИБКА: не заданы SUPABASE_URL и SUPABASE_SERVICE_KEY")
        return 1

    if args.create_bucket and not args.dry_run:
        create_bucket_if_missing()

    db = SessionLocal()
    migrated = 0
    skipped = 0
    failed = 0

    try:
        items = (
            db.query(models.Furniture)
            .filter(models.Furniture.photo_url.isnot(None))
            .order_by(models.Furniture.id.asc())
            .all()
        )

        print(f"Записей с фото: {len(items)}\n")

        for item in items:
            if not storage.is_legacy_photo_url(item.photo_url):
                skipped += 1
                continue

            object_key = storage.extract_object_key(item.photo_url)
            if not object_key:
                print(f"[{item.id}] пропуск: не удалось разобрать ссылку {item.photo_url}")
                failed += 1
                continue

            print(f"[{item.id}] {item.inv_number or '—'}: {object_key}")

            if args.dry_run:
                print("    (dry-run) будет перенесено")
                migrated += 1
                continue

            content = read_local_file(object_key) or read_legacy_s3(object_key)

            if content is None:
                print("    ФАЙЛ НЕ НАЙДЕН ни локально, ни в S3 — пропускаю")
                failed += 1
                continue

            if not upload_bytes(object_key, content):
                failed += 1
                continue

            item.photo_url = storage.build_public_photo_url(object_key)
            db.commit()
            print(f"    -> {item.photo_url}")
            migrated += 1

    finally:
        db.close()

    print(
        f"\nИтого: перенесено {migrated}, "
        f"уже в Supabase {skipped}, ошибок {failed}"
    )
    return 0 if failed == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
