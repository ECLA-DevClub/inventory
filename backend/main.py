from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os

import auth
import models
from database import engine, SessionLocal
from routers.auth_router import router as auth_router
from routers.inventory import router as inventory_router
from routers.reference import router as reference_router
from routers.users import router as users_router

models.Base.metadata.create_all(bind=engine)


def seed_default_admin():
    db = SessionLocal()
    try:
        admin_email = "admin@example.com"
        admin_password = "1234"

        existing_admin = db.query(models.User).filter(
            models.User.email == admin_email
        ).first()

        if not existing_admin:
            admin_user = models.User(
                email=admin_email,
                hashed_password=auth.get_password_hash(admin_password),
                role=auth.ROLE_ADMIN,
            )
            db.add(admin_user)
            db.commit()
    finally:
        db.close()


seed_default_admin()

app = FastAPI(
    title="Inventory Management System",
    description="API для учета мебели с системой аутентификации и загрузкой фото",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://inventory-7cb9.vercel.app",
    "https://ecla-devclub.github.io",
]

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