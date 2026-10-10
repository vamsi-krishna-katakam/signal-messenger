import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool

# Database URL configuration (supports Railway PostgreSQL via DATABASE_URL or fallback to local SQLite)
RAW_DATABASE_URL = os.getenv("DATABASE_URL")

if RAW_DATABASE_URL:
    if RAW_DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = RAW_DATABASE_URL.replace("postgres://", "postgresql://", 1)
    else:
        DATABASE_URL = RAW_DATABASE_URL
    print("✅ DATABASE_URL detected: Connecting to persistent PostgreSQL database.")
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=20, max_overflow=30)
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), "signal.db")
    DATABASE_URL = f"sqlite:///{DB_PATH}"
    print("⚠️ WARNING: DATABASE_URL not set in Environment Variables! Falling back to temporary SQLite.")
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=NullPool,
    )

# SessionFactory for database interactions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all ORM models
Base = declarative_base()


def get_db():
    """Dependency for obtaining a database session per HTTP request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
