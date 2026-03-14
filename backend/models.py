from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
import os

import auth
import models
from database import engine, SessionLocal
from routers.auth_router import router as auth_router
from routers.reference import router as reference_router
from routers.users import router as users_router

models.Base.metadata.create_all(bind=engine)


def ensure_sqlite_schema():
    """
    Маленький self-heal для SQLite без Alembic.
    Нужен, чтобы старые SQLite базы (например на Render) не падали,
    если в коде появилась новая колонка, а таблица уже существовала.
    """
    db_url = str(engine.url)

    # Только для SQLite
    if not db_url.startswith("sqlite"):
        return

    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(furniture)"))
        columns = [row[1] for row in result.fetchall()]

        if "price_kgs" not in columns:
            conn.execute(text("ALTER TABLE furniture ADD COLUMN price_kgs INTEGER"))
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


# Сначала чиним схему SQLite, потом сидируем
ensure_sqlite_schema()
seed_default_users()

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
    "https://inventory-7cb9.vercel.app",
    "https://ecla-devclub.github.io",
    "https://ecla-devclub.github.io/inventory",
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

UPLOAD_DIR = "static/item_photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs("static", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.api_route("/", methods=["GET", "HEAD"], tags=["Root"])
def health_check():
    return {
        "status": "online",
        "message": "Inventory API is running",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)