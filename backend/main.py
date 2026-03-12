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


seed_default_users()

app = FastAPI(
    title="Inventory Management System",
    description="API для учета мебели с системой аутентификации и загрузкой фото",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://ecla-devclub.github.io",
        "https://ecla-devclub.github.io/inventory",
        "https://inventory-7cb9.vercel.app",
        "https://inventory-7cb9-git-main-sidikovoatillo44-2899s-projects.vercel.app",
    ],
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