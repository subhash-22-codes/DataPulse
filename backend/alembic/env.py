# --- CHANGED: Added os and dotenv ---
import os
from dotenv import load_dotenv
from logging.config import fileConfig

# --- CHANGED: We now need create_engine, not engine_from_config ---
from sqlalchemy import create_engine
from sqlalchemy import pool

from alembic import context
from app.core.database import Base
from app.models import user, workspace, data_upload, notification, alert_rule

# --- CHANGED: Call load_dotenv() right at the top ---
# This will load your .env file (with the Supabase URL)
load_dotenv()

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# ... (rest of the file is mostly the same) ...


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.
    ...
    """
    # --- CHANGED: Make offline mode also use the .env file ---
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL is not set in your .env file")
    
    context.configure(
        url=db_url, # <-- Use the URL from .env
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    # --- END CHANGED ---

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.
    ...
    """
    
    # --- THIS IS THE MAIN FIX ---
    # Get the database URL directly from your .env file
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL is not set in your .env file")

    # Manually create the engine using the URL from your .env file
    # We no longer use engine_from_config()
    connectable = create_engine(db_url)
    # --- END FIX ---

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()