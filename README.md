📦 Furniture Inventory Management System (Education Sector)

Система учёта мебели для образовательных учреждений (школы, колледжи, вузы) с поддержкой реестра активов, контроля состояния, перемещений и ремонтов.

Включает:

Инвентаризацию с уникальными номерами и QR-кодами

Учёт стоимости и аналитическую отчётность

Историю перемещений и журнал ремонтов

Ролевую модель доступа (администратор, бухгалтер, МОЛ и др.)

Веб-интерфейс и мобильное приложение с офлайн-режимом

Локализацию (русский / кыргызский)

Решение ориентировано на учреждения Центральной Азии с акцентом на доступность, прозрачность и простоту внедрения.





# INVENTORY MVP

## Tech Stack

### Backend
- Python
- FastAPI
- PostgreSQL
- SQLAlchemy

### Frontend
- React

---

## Local development

### Backend (FastAPI)

1. Create a virtual environment and install dependencies:

```bash
cd backend
python -m venv venv
venv\\Scripts\\activate
pip install -r requirements.txt
```

2. Configure environment variables (minimum):

- `SECRET_KEY`: JWT signing secret (required)
- `DATABASE_URL`: optional. If not set, the backend uses `backend/inventory.db` (SQLite)

If you want to run without setting `SECRET_KEY` locally, you can set:

- `INVENTORY_ALLOW_INSECURE_DEV_SECRET=1`

3. Run the API:

```bash
python main.py
```

API docs will be available at `/docs` (default: `http://127.0.0.1:8000/docs`).

### Frontend (Vite)

```bash
cd frontend
npm install
```

Set API URL (optional). By default the frontend uses `VITE_API_URL` from `.env.production` or falls back to the hosted API:

```bash
# create frontend/.env.local
VITE_API_URL=http://127.0.0.1:8000
```

Run dev server:

```bash
npm run dev
```

## Database Structure

### furniture
- id (PK)
- name
- type_id
- building_id
- room_id
- condition_id
- photo_url
- created_at

### furniture_type
- id
- name

### building
- id
- name

### room
- id
- name
- building_id

### condition
- id
- name
