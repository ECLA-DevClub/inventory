from pydantic import BaseModel, EmailStr
from typing import Optional

# --- СХЕМЫ ДЛЯ МЕБЕЛИ (Inventory) ---

class FurnitureBase(BaseModel):
    name: str

class FurnitureCreate(FurnitureBase):
    pass

class FurnitureOut(FurnitureBase):
    id: int
    photo_url: Optional[str] = None

    class Config:
        # Позволяет Pydantic работать с объектами SQLAlchemy (ORM)
        from_attributes = True


# --- СХЕМЫ ДЛЯ ПОЛЬЗОВАТЕЛЯ (Auth) ---

class UserBase(BaseModel):
    email: EmailStr
    role: str = "admin"  # По умолчанию ставим admin

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int

    class Config:
        from_attributes = True


# --- СХЕМЫ ДЛЯ АУТЕНТИФИКАЦИИ (JWT) ---

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None