import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from fastapi import HTTPException


load_dotenv()

MODE_LOCAL = os.getenv("MODE_LOCAL", "false").lower() == "true"
DATABASE_URL = os.getenv("DATABASE_URL")

logger = logging.getLogger("db")

if MODE_LOCAL:
    logger.info("Running in LOCAL mode - connecting to local DB.")
    connect_args = {
        "connect_timeout": 7,
    }
else:
    logger.info("Running in PRODUCTION mode - connecting to production DB.")
    connect_args = {
        "sslmode": "require",
        "connect_timeout": 7,
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
        raise
    except Exception:
        logger.exception("DB ERROR")
        db.rollback()
        raise
    finally:
        db.close()
        logger.debug("DB CLOSE")
