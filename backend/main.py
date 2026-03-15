import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

import auth
import models
from database import SessionLocal, engine
from routers.auth_router import router as auth_router
from routers.inventory import router as inventory_router
from routers.reference import router as reference_router
from routers.users import router as users_router

models.Base.metadata.create_all(bind=engine)


def get_existing_columns(table_name: str) -> list[str]:
    db_url = str(engine.url)

    with engine.connect() as conn:
        if db_url.startswith("sqlite"):
            result = conn.execute(text(f"PRAGMA table_info({table_name})"))
            return [row[1] for row in result.fetchall()]

        result = conn.execute(
            text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = :table_name
                """
            ),
            {"table_name": table_name},
        )
        return [row[0] for row in result.fetchall()]


def ensure_furniture_schema():
    columns = get_existing_columns("furniture")

    with engine.connect() as conn:
        changed = False

        if "price_kgs" not in columns:
            conn.execute(text("ALTER TABLE furniture ADD COLUMN price_kgs INTEGER"))
            changed = True

        if "model" not in columns:
            conn.execute(text("ALTER TABLE furniture ADD COLUMN model TEXT"))
            changed = True

        if "manufacturer" not in columns:
            conn.execute(text("ALTER TABLE furniture ADD COLUMN manufacturer TEXT"))
            changed = True

        if "purchase_date" not in columns:
            conn.execute(text("ALTER TABLE furniture ADD COLUMN purchase_date DATE"))
            changed = True

        if changed:
            conn.commit()


def ensure_furniture_history_schema():
    db_url = str(engine.url)
    columns = get_existing_columns("furniture_history")

    with engine.connect() as conn:
        changed = False

        if "performed_by_user_id" not in columns:
            conn.execute(text("ALTER TABLE furniture_history ADD COLUMN performed_by_user_id INTEGER"))
            changed = True

        if "change_type" not in columns:
            conn.execute(text("ALTER TABLE furniture_history ADD COLUMN change_type TEXT"))
            changed = True

        if "reason" not in columns:
            conn.execute(text("ALTER TABLE furniture_history ADD COLUMN reason TEXT"))
            changed = True

        if changed:
            conn.commit()

        if not db_url.startswith("sqlite"):
            fk_result = conn.execute(
                text(
                    """
                    SELECT constraint_name
                    FROM information_schema.table_constraints
                    WHERE table_name = 'furniture_history'
                      AND constraint_type = 'FOREIGN KEY'
                      AND constraint_name = 'furniture_history_performed_by_user_id_fkey'
                    """
                )
            ).fetchone()

            if not fk_result:
                conn.execute(
                    text(
                        """
                        ALTER TABLE furniture_history
                        ADD CONSTRAINT furniture_history_performed_by_user_id_fkey
                        FOREIGN KEY (performed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
                        """
                    )
                )
                conn.commit()


def seed_default_users():
    db = SessionLocal()
    try:
        users = [
            {
                "email": "admin@example.com",
                "password": "1234",
                "role": auth.ROLE_ADMIN,
            },
            {
                "email": "manager@example.com",
                "password": "1234",
                "role": auth.ROLE_MANAGER,
            },
            {
                "email": "viewer@example.com",
                "password": "1234",
                "role": auth.ROLE_VIEWER,
            },
        ]

        for user_data in users:
            existing_user = (
                db.query(models.User)
                .filter(models.User.email == user_data["email"])
                .first()
            )

            if not existing_user:
                new_user = models.User(
                    email=user_data["email"],
                    hashed_password=auth.get_password_hash(user_data["password"]),
                    role=user_data["role"],
                )
                db.add(new_user)

        db.commit()
    finally:
        db.close()


def seed_reference_data():
    db = SessionLocal()
    try:
        default_types = [
            "Стол",
            "Стул",
            "Шкаф",
            "Парта",
            "Компьютерный стол",
            "Тумба",
            "Доска",
            "Проектор",
        ]

        default_conditions = [
            "Отличное",
            "Хорошее",
            "Удовлетворительное",
            "Требует ремонта",
            "Списано",
        ]

        building_room_map = {
            "4 этаж": ["401", "402", "403"],
            "5 этаж": ["501", "502"],
        }

        for type_name in default_types:
            exists = (
                db.query(models.FurnitureType)
                .filter(models.FurnitureType.name == type_name)
                .first()
            )
            if not exists:
                db.add(models.FurnitureType(name=type_name))

        for condition_name in default_conditions:
            exists = (
                db.query(models.Condition)
                .filter(models.Condition.name == condition_name)
                .first()
            )
            if not exists:
                db.add(models.Condition(name=condition_name))

        db.commit()

        for building_name, room_names in building_room_map.items():
            building = (
                db.query(models.Building)
                .filter(models.Building.name == building_name)
                .first()
            )

            if not building:
                building = models.Building(name=building_name)
                db.add(building)
                db.commit()
                db.refresh(building)

            for room_name in room_names:
                room_exists = (
                    db.query(models.Room)
                    .filter(
                        models.Room.name == room_name,
                        models.Room.building_id == building.id,
                    )
                    .first()
                )

                if not room_exists:
                    db.add(models.Room(name=room_name, building_id=building.id))

        db.commit()
    finally:
        db.close()


ensure_furniture_schema()
ensure_furniture_history_schema()
seed_default_users()
seed_reference_data()

app = FastAPI(
    title="Inventory Management System",
    description="API для учета мебели с системой аутентификации и загрузкой фото",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

frontend_public_url = os.getenv("FRONTEND_PUBLIC_URL")

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://ecla-devclub.github.io",
    "https://ecla-devclub.github.io/inventory",
    "https://inventory-7cb9.vercel.app",
]

if frontend_public_url and frontend_public_url not in allowed_origins:
    allowed_origins.append(frontend_public_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(inventory_router)
app.include_router(reference_router)
app.include_router(users_router)

STATIC_DIR = "static"
LEGACY_UPLOAD_DIR = os.path.join(STATIC_DIR, "item_photos")

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(LEGACY_UPLOAD_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", tags=["Root"])
def health_check():
    return {
        "status": "online",
        "message": "Inventory API is running",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)