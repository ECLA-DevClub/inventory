from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os

import models
from database import engine
from routers import auth_router, inventory, reference

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Inventory Management System",
    description="API для учета мебели с системой аутентификации и загрузкой фото",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(inventory.router)
app.include_router(reference.router)

UPLOAD_DIR = "static/item_photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", tags=["Root"])
def health_check():
    return {
        "status": "online",
        "message": "Inventory API is running",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)