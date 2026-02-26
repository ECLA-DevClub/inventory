from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine
from routers import auth_router, inventory
import os

# 1. Автоматическое создание таблиц в базе данных при запуске
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Inventory Management System",
    description="API для учета мебели с системой аутентификации и загрузкой фото",
    version="1.0.0"
)

# 2. Настройка CORS (чтобы фронтенд мог делать запросы к бэкенду)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене здесь нужно указать адрес фронтенда
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Подключение роутеров
# Роутер авторизации (регистрация и логин)
app.include_router(auth_router.router)

# Роутер инвентаря (теперь он будет доступен по /furniture)
app.include_router(inventory.router)

# 4. Настройка папки для хранения изображений
UPLOAD_DIR = "static/item_photos"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

# http://127.0.0.1:8000/static/item_photos/имя_файла.jpg
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", tags=["Root"])
def health_check():
    """Проверка работоспособности API"""
    return {
        "status": "online",
        "message": "Inventory API is running",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    # Запуск сервера напрямую через python main.py (опционально)
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)