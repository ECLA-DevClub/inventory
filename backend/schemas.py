from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


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


class FurnitureTypeBase(BaseModel):
    name: str


class FurnitureTypeResponse(FurnitureTypeBase):
    id: int

    class Config:
        from_attributes = True


class BuildingBase(BaseModel):
    name: str


class BuildingResponse(BuildingBase):
    id: int

    class Config:
        from_attributes = True


class RoomBase(BaseModel):
    name: str
    building_id: int


class RoomCreate(BaseModel):
    name: str
    building_id: int


class RoomResponse(RoomBase):
    id: int

    class Config:
        from_attributes = True


class ConditionBase(BaseModel):
    name: str


class ConditionResponse(ConditionBase):
    id: int

    class Config:
        from_attributes = True


class FurnitureCreate(BaseModel):
    name: str
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
    inv_number: str
    name: str

    type_id: int
    type_name: str

    building_id: int
    building_name: str

    room_id: int
    room_name: str

    condition_id: Optional[int] = None
    condition_name: Optional[str] = None

    price_kgs: Optional[int] = None

    photo_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True