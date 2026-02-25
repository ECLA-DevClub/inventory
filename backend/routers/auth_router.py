from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

import models
import schemas
import auth
from database import get_db

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register", response_model=schemas.UserOut)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. Проверка , не занят ли email
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Пользователь с таким email уже зарегистрирован"
        )

    # 2. Хешируем пароль
    hashed_pwd = auth.get_password_hash(user.password)

    # 3. Создание запись в базе
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_pwd,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Поиск пользователя (в OAuth2PasswordRequestForm логин находится в поле username)
    user = db.query(models.User).filter(models.User.email == form_data.username).first()

    # 2. Проверка существования и пароля
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Создание токена
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}