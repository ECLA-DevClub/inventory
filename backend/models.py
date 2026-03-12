from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func  # Используем func.now() для БД
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
# Справочники (Тип, Здание, Состояние)
# =========================
class FurnitureType(Base):
    __tablename__ = "furniture_type"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    furniture = relationship("Furniture", back_populates="furniture_type")


class Building(Base):
    __tablename__ = "building"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    rooms = relationship("Room", back_populates="building")
    furniture = relationship("Furniture", back_populates="building")


class Condition(Base):
    __tablename__ = "condition"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    furniture = relationship("Furniture", back_populates="condition")


# =========================
# Комната (связана со Зданием)
# =========================
class Room(Base):
    __tablename__ = "room"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    building_id = Column(Integer, ForeignKey("building.id", ondelete="CASCADE"), nullable=False)

    building = relationship("Building", back_populates="rooms")
    furniture = relationship("Furniture", back_populates="room")


# =========================
# Мебель
# =========================
class Furniture(Base):
    __tablename__ = "furniture"

    id = Column(Integer, primary_key=True, index=True)
    inv_number = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=False)
    price_kgs = Column(Integer, nullable=True)
    photo_url = Column(String, nullable=True)

    # Рекомендую использовать func.now() для корректного времени на стороне БД
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    type_id = Column(Integer, ForeignKey("furniture_type.id", ondelete="SET NULL"), nullable=True)
    building_id = Column(Integer, ForeignKey("building.id", ondelete="SET NULL"), nullable=True)
    room_id = Column(Integer, ForeignKey("room.id", ondelete="SET NULL"), nullable=True)
    condition_id = Column(Integer, ForeignKey("condition.id", ondelete="SET NULL"), nullable=True)

    # Отношения
    furniture_type = relationship("FurnitureType", back_populates="furniture")
    building = relationship("Building", back_populates="furniture")
    room = relationship("Room", back_populates="furniture")
    condition = relationship("Condition", back_populates="furniture")
    history = relationship("FurnitureHistory", back_populates="furniture")


# =========================
# История изменений
# =========================
class FurnitureHistory(Base):
    __tablename__ = "furniture_history"

    id = Column(Integer, primary_key=True, index=True)
    furniture_id = Column(Integer, ForeignKey("furniture.id", ondelete="CASCADE"), nullable=False)
    user_email = Column(String, nullable=False)
    action = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    furniture = relationship("Furniture", back_populates="history")