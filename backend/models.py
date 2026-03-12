from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


# =========================
# Пользователи
# =========================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="viewer", nullable=False)


# =========================
# Тип мебели
# =========================

class FurnitureType(Base):
    __tablename__ = "furniture_type"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


# =========================
# Здание
# =========================

class Building(Base):
    __tablename__ = "building"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


# =========================
# Комната
# =========================

class Room(Base):
    __tablename__ = "room"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    building_id = Column(Integer, ForeignKey("building.id"), nullable=False)

    building = relationship("Building")


# =========================
# Состояние мебели
# =========================

class Condition(Base):
    __tablename__ = "condition"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


# =========================
# Мебель
# =========================

class Furniture(Base):
    __tablename__ = "furniture"

    id = Column(Integer, primary_key=True, index=True)
    inv_number = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=False)

    type_id = Column(Integer, ForeignKey("furniture_type.id"), nullable=False)
    building_id = Column(Integer, ForeignKey("building.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("room.id"), nullable=False)

    condition_id = Column(Integer, ForeignKey("condition.id"), nullable=True)

    price_kgs = Column(Integer, nullable=True)

    photo_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    furniture_type = relationship("FurnitureType")
    building = relationship("Building")
    room = relationship("Room")
    condition = relationship("Condition")


# =========================
# История изменений мебели
# =========================

class FurnitureHistory(Base):
    __tablename__ = "furniture_history"

    id = Column(Integer, primary_key=True, index=True)
    furniture_id = Column(Integer, ForeignKey("furniture.id"), nullable=False)
    user_email = Column(String, nullable=False)
    action = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    furniture = relationship("Furniture")