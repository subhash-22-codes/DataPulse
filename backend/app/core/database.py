import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

logger = logging.getLogger("db")

connect_args = {
    "connect_timeout": 7,
    "sslmode": "require",
}

engine = create_engine(
    DATABASE_URL,
    future=True,
    poolclass=NullPool,        
    pool_pre_ping=True,
    connect_args=connect_args,
    echo_pool="debug",          
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    logger.info("DB OPEN")
    try:
        yield db
        db.commit()
    except Exception:
        logger.exception("DB ERROR")
        db.rollback()
        raise
    finally:
        db.close()
        logger.info("DB CLOSE")
