from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Когда появится Postgres , заменить эту строку на URL базы данных
SQLALCHEMY_DATABASE_URL = "sqlite:///./inventory.db"

# engine — "двигатель" , который общается с БД
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Сессия — конкретное "окно" в базу данных для выполнения команд
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс , от которого будут наследоваться все таблицы
Base = declarative_base()

# Зависимость для FastAPI: открывает сессию при запросе и закрывает после
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()