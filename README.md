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
