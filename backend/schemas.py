from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

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
    price_kgs: Optional[int] = None

class FurnitureUpdate(BaseModel):
    name: str
    type_id: int
    building_id: int
    room_id: int
    condition_id: Optional[int] = None
    price_kgs: Optional[int] = None

class FurnitureMove(BaseModel):
    building_id: int
    room_id: int

class FurnitureResponse(BaseModel):
    id: int
    inv_number: Optional[str] = None
    name: str
    price_kgs: Optional[int] = None
    photo_url: Optional[str] = None
    created_at: datetime

    # Мы возвращаем полные объекты связей вместо просто ID
    # Это позволит фронтенду сразу видеть названия (building.name)
    furniture_type: Optional[FurnitureTypeResponse] = None
    building: Optional[BuildingResponse] = None
    room: Optional[RoomResponse] = None
    condition: Optional[ConditionResponse] = None

    class Config:
        from_attributes = True

# --- ИСТОРИЯ ---
class FurnitureHistoryResponse(BaseModel):
    id: int
    furniture_id: int
    user_email: str
    action: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True