import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from passlib.context import CryptContext

import models
from database import SessionLocal, engine
from routers.auth_router import router as auth_router
from routers.reference import router as reference_router
from routers.users import router as users_router
from routers.inventory import router as furniture_router, public_router as furniture_public_router

# Настройка хэширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Инициализация таблиц
models.Base.metadata.create_all(bind=engine)

def get_existing_columns(table_name: str) -> list[str]:
    db_url = str(engine.url)
    with engine.connect() as conn:
        if db_url.startswith("sqlite"):
            result = conn.execute(text(f"PRAGMA table_info({table_name})"))
            return [row[1] for row in result.fetchall()]
        result = conn.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name = :table_name"),
            {"table_name": table_name},
        )
        return [row[0] for row in result.fetchall()]

# Миграционные проверки (для работы с существующей базой)
def ensure_users_schema():
    columns = get_existing_columns("users")
    with engine.connect() as conn:
        if "full_name" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN full_name TEXT"))
            conn.commit()

def ensure_furniture_schema():
    columns = get_existing_columns("furniture")
    with engine.connect() as conn:
        changed = False
        # Проверяем ключевые поля для новой версии (HEX и Responsible)
        fields = [
            ("price_kgs", "INTEGER"), ("model", "TEXT"), ("manufacturer", "TEXT"),
            ("purchase_date", "DATE"), ("responsible_id", "INTEGER"),
            ("qr", "TEXT")
        ]
        for field, ftype in fields:
            if field not in columns:
                conn.execute(text(f"ALTER TABLE furniture ADD COLUMN {field} {ftype}"))
                changed = True
        if changed:
            conn.commit()

# ============================================================
# ГЛАВНАЯ ФУНКЦИЯ: СИДИРОВАНИЕ ДАННЫХ (5 РОЛЕЙ)
# ============================================================
def seed_reference_data():
    db = SessionLocal()
    try:
        # 1. СОЗДАЕМ ТЕСТОВУЮ ОРГАНИЗАЦИЮ
        org = db.query(models.Organization).first()
        if not org:
            org = models.Organization(name="Главный Колледж", hex_code="01")
            db.add(org)
            db.flush()
            # Создаем обязательный счетчик для генерации HEX-номеров
            db.add(models.OrganizationSequence(organization_id=org.id, current_value=0))
            db.commit()
            db.refresh(org)

        # 2. СОЗДАЕМ 5 ПОЛЬЗОВАТЕЛЕЙ ПО ТВОЕМУ СПИСКУ
        if not db.query(models.User).first():
            # Роли записываем в нижнем регистре для удобства проверки в auth.py
            users_to_seed = [
                {"name": "Главный Админ", "email": "admin@mail.com", "role": "admin", "pass": "admin123"},
                {"name": "Менеджер склада", "email": "manager@mail.com", "role": "manager", "pass": "manager123"},
                {"name": "Бухгалтер", "email": "accountant@mail.com", "role": "accountant", "pass": "acc123"},
                {"name": "Техник", "email": "tech@mail.com", "role": "technician", "pass": "tech123"},
                {"name": "Наблюдатель", "email": "viewer@mail.com", "role": "viewer", "pass": "viewer123"},
            ]
            for u in users_to_seed:
                db.add(models.User(
                    full_name=u["name"],
                    email=u["email"],
                    hashed_password=pwd_context.hash(u["pass"]),
                    role=u["role"],
                    organization_id=org.id
                ))
            db.commit()
            print("--- 5 пользователей успешно созданы ---")

        # 3. ТИПЫ МЕБЕЛИ (с HEX-кодами для инвентарных номеров)
        default_types = [
            {"name": "Стол", "hex": "ST"}, {"name": "Стул", "hex": "SL"}
        ]
        for t in default_types:
            exists = db.query(models.FurnitureType).filter_by(name=t["name"], organization_id=org.id).first()
            if not exists:
                db.add(models.FurnitureType(name=t["name"], hex_code=t["hex"], organization_id=org.id))

        # 4. СОСТОЯНИЯ
        default_conditions = ["Отличное", "Хорошее", "Удовлетворительное", "Ремонт", "Списано"]
        for c_name in default_conditions:
            exists = db.query(models.Condition).filter_by(
                name=c_name,
                organization_id=org.id
            ).first()

            if not exists:
                db.add(models.Condition(
                    name=c_name,
                    organization_id=org.id
                ))

        # 5. КАРТА ЗДАНИЙ И КОМНАТ
        building_map = {
            "4 этаж": {"hex": "04", "rooms": [("401", "401"), ("402", "402")]},
            "5 этаж": {"hex": "05", "rooms": [("501", "501"), ("502", "502")]},
        }
        for b_name, data in building_map.items():
            bld = db.query(models.Building).filter_by(name=b_name, organization_id=org.id).first()
            if not bld:
                bld = models.Building(name=b_name, hex_code=data["hex"], organization_id=org.id)
                db.add(bld)
                db.commit()
                db.refresh(bld)

            for r_name, r_hex in data["rooms"]:
                if not db.query(models.Room).filter_by(name=r_name, building_id=bld.id).first():
                    db.add(models.Room(name=r_name, hex_code=r_hex, building_id=bld.id, organization_id=org.id))

        # 6. ОТВЕТСТВЕННОЕ ЛИЦО (обязательно для генерации HEX номера)
        if not db.query(models.ResponsiblePerson).filter_by(organization_id=org.id).first():
            db.add(models.ResponsiblePerson(full_name="Общий Склад", hex_code="00", organization_id=org.id))

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Ошибка при заполнении базы: {e}")
    finally:
        db.close()

# Запуск подготовки базы
ensure_users_schema()
ensure_furniture_schema()
seed_reference_data()

# ============================================================
# КОНФИГУРАЦИЯ FASTAPI
# ============================================================

app = FastAPI(
    title="Inventory Management System",
    description="API для учета мебели (HEX-номера, 5 ролей, Организации)",
    version="1.2.0",
    docs_url="/docs",
)

# Настройка CORS
frontend_public_url = os.getenv("FRONTEND_PUBLIC_URL")
allowed_origins = [
    "http://localhost:5173", "http://127.0.0.1:5173",
    "https://ecla-devclub.github.io",
    "https://inventorycom-git-main-sidikovoa11l044-2899s-projects.vercel.app",
]
if frontend_public_url:
    allowed_origins.append(frontend_public_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(auth_router)
app.include_router(reference_router)
app.include_router(users_router)
app.include_router(furniture_router)
app.include_router(furniture_public_router)

# Обслуживание статических файлов
STATIC_DIR = "static"
os.makedirs(os.path.join(STATIC_DIR, "item_photos"), exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/", tags=["Root"])
def health_check():
    return {
        "status": "online",
        "organization_id_check": "ready",
        "roles": ["admin", "manager", "accountant", "technician", "viewer"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)