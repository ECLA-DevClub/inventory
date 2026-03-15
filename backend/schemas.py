from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


# --- АУТЕНТИФИКАЦИЯ ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


# --- ПОЛЬЗОВАТЕЛИ ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserRoleUpdate(BaseModel):
    role: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


# --- СПРАВОЧНИКИ ---
class FurnitureTypeResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class BuildingResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class RoomResponse(BaseModel):
    id: int
    name: str
    building_id: int

    class Config:
        from_attributes = True


class ConditionResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


# --- МЕБЕЛЬ (Inventory) ---
class FurnitureCreate(BaseModel):
    name: str
    inv_number: Optional[str] = None
    type_id: int
    building_id: int
    room_id: int
    condition_id: Optional[int] = None

    model: Optional[str] = None
    manufacturer: Optional[str] = None
    purchase_date: Optional[date] = None

    price_kgs: Optional[int] = None


class FurnitureUpdate(BaseModel):
    name: str
    type_id: int
    building_id: int
    room_id: int
    condition_id: Optional[int] = None

    model: Optional[str] = None
    manufacturer: Optional[str] = None
    purchase_date: Optional[date] = None

    price_kgs: Optional[int] = None

    change_reason: str

    @field_validator("change_reason")
    @classmethod
    def validate_change_reason(cls, v: str) -> str:
        value = (v or "").strip()
        if len(value) < 5:
            raise ValueError("Change reason must contain at least 5 characters")
        return value


class FurnitureMove(BaseModel):
    building_id: int
    room_id: int
    change_reason: str

    @field_validator("change_reason")
    @classmethod
    def validate_change_reason(cls, v: str) -> str:
        value = (v or "").strip()
        if len(value) < 5:
            raise ValueError("Change reason must contain at least 5 characters")
        return value


class FurnitureDisposalRequest(BaseModel):
    reason: str
    disposal_type: str

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v: str) -> str:
        value = (v or "").strip()
        if len(value) < 5:
            raise ValueError("Reason must contain at least 5 characters")
        return value

    @field_validator("disposal_type")
    @classmethod
    def validate_disposal_type(cls, v: str) -> str:
        value = (v or "").strip().lower()
        allowed = {"writeoff", "disposal", "утилизация", "списание"}
        if value not in allowed:
            raise ValueError("disposal_type must be one of: writeoff, disposal, списание, утилизация")
        return value


class FurnitureResponse(BaseModel):
    id: int
    inv_number: Optional[str] = None
    name: str

    type_id: Optional[int] = None
    type_name: Optional[str] = None

    building_id: Optional[int] = None
    building_name: Optional[str] = None

    room_id: Optional[int] = None
    room_name: Optional[str] = None

    condition_id: Optional[int] = None
    condition_name: Optional[str] = None

    model: Optional[str] = None
    manufacturer: Optional[str] = None
    purchase_date: Optional[date] = None

    price_kgs: Optional[int] = None
    photo_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- ИСТОРИЯ ---
class FurnitureHistoryResponse(BaseModel):
    id: int
    furniture_id: int
    performed_by_user_id: Optional[int] = None
    user_email: str
    action: str
    change_type: Optional[str] = None
    reason: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True