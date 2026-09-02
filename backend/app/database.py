"""
Database connection setup.

Defaults to a local SQLite file so the whole platform runs with zero extra
setup. To move to a real, persistent database later (recommended once you
add real users), just set the DATABASE_URL environment variable, e.g. on
Render:

    DATABASE_URL=postgresql://user:password@host:5432/dbname

Nothing else needs to change - SQLAlchemy handles both the same way.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./qa_agent.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
