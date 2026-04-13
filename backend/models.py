from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


def utc_now():
    return datetime.now(timezone.utc)


# =========================
# ОРГАНИЗАЦИИ И СИСТЕМНЫЕ ТАБЛИЦЫ
# =========================

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    # HEX-код организации (напр. "01") остается обязательным,
    # так как задается при создании компании супер-админом.
    hex_code = Column(String, unique=True, index=True, nullable=False)

    users = relationship("User", back_populates="organization")
    furniture = relationship("Furniture", back_populates="organization")
    buildings = relationship("Building", back_populates="organization")
    rooms = relationship("Room", back_populates="organization")
    furniture_types = relationship("FurnitureType", back_populates="organization")
    sequences = relationship("OrganizationSequence", back_populates="organization")
    responsible_persons = relationship("ResponsiblePerson", back_populates="organization")


class OrganizationSequence(Base):
    """Счетчик для UID мебели внутри каждой организации"""
    __tablename__ = "organization_sequence"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False)
    current_value = Column(Integer, default=0, nullable=False)

    organization = relationship("Organization", back_populates="sequences")


# =========================
# ПОЛЬЗОВАТЕЛИ
# =========================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="viewer", nullable=False)

    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    organization = relationship("Organization", back_populates="users")


# =========================
# СПРАВОЧНИКИ (С автогенерацией HEX)
# =========================

class ResponsiblePerson(Base):
    __tablename__ = "responsible_person"
    __table_args__ = (
        UniqueConstraint('organization_id', 'full_name', name='uix_org_resp_name'),
        UniqueConstraint('organization_id', 'hex_code', name='uix_org_resp_hex'),
    )

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    # nullable=True для автоматической генерации на бэкенде
    hex_code = Column(String, nullable=True)

    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    organization = relationship("Organization", back_populates="responsible_persons")
    furniture = relationship("Furniture", back_populates="responsible_person")


class FurnitureType(Base):
    __tablename__ = "furniture_type"
    __table_args__ = (
        UniqueConstraint('organization_id', 'name', name='uix_org_type_name'),
        UniqueConstraint('organization_id', 'hex_code', name='uix_org_type_hex'),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    hex_code = Column(String, nullable=True)

    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    organization = relationship("Organization", back_populates="furniture_types")
    furniture = relationship("Furniture", back_populates="furniture_type")


class Building(Base):
    __tablename__ = "building"
    __table_args__ = (
        UniqueConstraint('organization_id', 'name', name='uix_org_building_name'),
        UniqueConstraint('organization_id', 'hex_code', name='uix_org_building_hex'),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    hex_code = Column(String, nullable=True)

    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    organization = relationship("Organization", back_populates="buildings")
    rooms = relationship("Room", back_populates="building")
    furniture = relationship("Furniture", back_populates="building")


class Room(Base):
    __tablename__ = "room"
    __table_args__ = (
        UniqueConstraint('building_id', 'name', name='uix_building_room_name'),
        UniqueConstraint('building_id', 'hex_code', name='uix_building_room_hex'),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    hex_code = Column(String, nullable=True)

    building_id = Column(Integer, ForeignKey("building.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)

    organization = relationship("Organization", back_populates="rooms")
    building = relationship("Building", back_populates="rooms")
    furniture = relationship("Furniture", back_populates="room")


class Condition(Base):
    """ Глобальный справочник состояний (общий для всех) """
    __tablename__ = "condition"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False) # Уникальное имя на всю систему

    furniture = relationship("Furniture", back_populates="condition")


# =========================
# ИНВЕНТАРЬ
# =========================

class Furniture(Base):
    __tablename__ = "furniture"
    __table_args__ = (
        UniqueConstraint('organization_id', 'inv_number', name='uix_org_inv_number'),
    )

    id = Column(Integer, primary_key=True, index=True)
    inv_number = Column(String, index=True, nullable=True)  # Итоговый HEX-код (ORG-TYP-BLD-RM-RESP-UID)
    name = Column(String, nullable=False)
    qr = Column(String, unique=True, index=True, nullable=True)

    model = Column(String, nullable=True)
    manufacturer = Column(String, nullable=True)
    purchase_date = Column(Date, nullable=True)
    price_kgs = Column(Integer, nullable=True)
    photo_url = Column(String, nullable=True)

    last_condition_check_date = Column(Date, nullable=True)
    next_condition_check_date = Column(Date, nullable=True)
    condition_check_interval_days = Column(Integer, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=func.now(),
    )

    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    type_id = Column(Integer, ForeignKey("furniture_type.id", ondelete="SET NULL"), nullable=True)
    building_id = Column(Integer, ForeignKey("building.id", ondelete="SET NULL"), nullable=True)
    room_id = Column(Integer, ForeignKey("room.id", ondelete="SET NULL"), nullable=True)
    condition_id = Column(Integer, ForeignKey("condition.id", ondelete="SET NULL"), nullable=True)
    responsible_id = Column(Integer, ForeignKey("responsible_person.id", ondelete="SET NULL"), nullable=True)

    organization = relationship("Organization", back_populates="furniture")
    furniture_type = relationship("FurnitureType", back_populates="furniture")
    building = relationship("Building", back_populates="furniture")
    room = relationship("Room", back_populates="furniture")
    condition = relationship("Condition", back_populates="furniture")
    responsible_person = relationship("ResponsiblePerson", back_populates="furniture")

    history = relationship(
        "FurnitureHistory",
        back_populates="furniture",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="desc(FurnitureHistory.created_at)",
    )


class FurnitureHistory(Base):
    __tablename__ = "furniture_history"

    id = Column(Integer, primary_key=True, index=True)
    furniture_id = Column(Integer, ForeignKey("furniture.id", ondelete="CASCADE"), nullable=False)
    performed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String, nullable=False)
    action = Column(String, nullable=False)
    change_type = Column(String, nullable=True)
    reason = Column(String, nullable=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, server_default=func.now())

    furniture = relationship("Furniture", back_populates="history")
    performed_by = relationship("User")