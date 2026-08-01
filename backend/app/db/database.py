"""
Database connection and session maker.
Provides the SQLAlchemy engine and declarative base.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import event
from sqlalchemy.engine import Engine

from app.core.config import settings

# Enforce foreign keys in SQLite
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

# For SQLite, check_same_thread=False is required for multi-threaded access
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db():
    """Ensure database schema is up-to-date with current SQLAlchemy models."""
    from app.core.logging import get_logger
    import app.models.auth  # noqa: F401 - Register all auth ORM models
    import app.models.ai_chat  # noqa: F401 - Register all AI chat ORM models
    logger = get_logger(__name__)

    # 1. Create all missing tables in database
    Base.metadata.create_all(bind=engine)

    # 2. Migration check for existing SQLite tables with missing columns
    if settings.DATABASE_URL.startswith("sqlite"):
        import sqlite3
        import os
        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        if db_path != ":memory:" and os.path.exists(db_path):
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
                if cursor.fetchone():
                    cursor.execute("PRAGMA table_info(users)")
                    existing_cols = {row[1] for row in cursor.fetchall()}

                    new_cols = {
                        "email": "VARCHAR(100)",
                        "display_name": "VARCHAR(100)",
                        "provider": "VARCHAR(20) DEFAULT 'local'",
                        "google_id": "VARCHAR(100)",
                        "avatar_url": "VARCHAR(255)",
                        "email_verified": "BOOLEAN DEFAULT 0",
                        "created_at": "DATETIME",
                        "updated_at": "DATETIME",
                        "last_login_at": "DATETIME",
                    }
                    for col_name, col_type in new_cols.items():
                        if col_name not in existing_cols:
                            logger.info("Auto-migrating SQLite DB: Adding missing column '%s' to 'users' table", col_name)
                            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")

                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_repositories'")
                if cursor.fetchone():
                    cursor.execute("PRAGMA table_info(user_repositories)")
                    repo_cols = {row[1] for row in cursor.fetchall()}
                    new_repo_cols = {
                        "is_favorite": "BOOLEAN DEFAULT 0",
                        "primary_language": "VARCHAR(50) DEFAULT 'Python'",
                        "last_opened_at": "DATETIME",
                    }
                    for col_name, col_type in new_repo_cols.items():
                        if col_name not in repo_cols:
                            logger.info("Auto-migrating SQLite DB: Adding missing column '%s' to 'user_repositories' table", col_name)
                            cursor.execute(f"ALTER TABLE user_repositories ADD COLUMN {col_name} {col_type}")

                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_chat_sessions'")
                if cursor.fetchone():
                    cursor.execute("PRAGMA table_info(ai_chat_sessions)")
                    chat_cols = {row[1] for row in cursor.fetchall()}
                    new_chat_cols = {
                        "is_pinned": "BOOLEAN DEFAULT 0",
                        "last_message_preview": "VARCHAR(255)",
                    }
                    for col_name, col_type in new_chat_cols.items():
                        if col_name not in chat_cols:
                            logger.info("Auto-migrating SQLite DB: Adding missing column '%s' to 'ai_chat_sessions' table", col_name)
                            cursor.execute(f"ALTER TABLE ai_chat_sessions ADD COLUMN {col_name} {col_type}")
                    conn.commit()
                conn.close()
            except Exception as e:
                logger.warning("Database schema migration check failed: %s", e)

    # 3. Ensure 'anonymous_user' record exists in users table for unauthenticated access
    db = SessionLocal()
    try:
        from app.models.auth import User
        anon_user = db.query(User).filter(User.id == "anonymous_user").first()
        if not anon_user:
            anon_user = User(
                id="anonymous_user",
                username="anonymous_user",
                email="anonymous@commitit.local",
                display_name="Guest User",
                password_hash="no_pass",
                provider="local",
            )
            db.add(anon_user)
            db.commit()
    except Exception as e:
        logger.warning("Failed to initialize anonymous user record: %s", e)
        db.rollback()
    finally:
        db.close()


def get_db():
    """Dependency generator to yield database sessions per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
