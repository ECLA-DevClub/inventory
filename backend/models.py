from sqlalchemy import Column, Integer, String, ForeignKey
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # Добавление роли
    # Пока просто строкой для упрощения MVP
    role = Column(String, default="user")


class Furniture(Base):
    __tablename__ = "furniture"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    # Поле для фото — хранение пути к файлу
    photo_url = Column(String, nullable=True)