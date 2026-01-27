import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from fastapi import HTTPException


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
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    logger.debug("DB OPEN")
    try:
        yield db
    except HTTPException:
        # auth / validation errors are not DB errors
        raise
    except Exception:
        logger.exception("DB ERROR")
        db.rollback()
        raise
    finally:
        db.close()
        logger.debug("DB CLOSE")
