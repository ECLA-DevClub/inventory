from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

# Настройка контекста для хеширования паролей (использование bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Указывание FastAPI, где искать логин/пароль для получения токена
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# --- ФУНКЦИИ ДЛЯ РАБОТЫ С ПАРОЛЯМИ ---

def verify_password(plain_password, hashed_password):
    """Проверка , совпадает ли введенный пароль с хешем из базы"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    """Превращение обычного текста в надежный хеш"""
    return pwd_context.hash(password)


# --- ФУНКЦИИ ДЛЯ РАБОТЫ С ТОКЕНАМИ (JWT) ---

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Создание временного токена доступа (JWT)"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt