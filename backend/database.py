import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Load DATABASE_URL from environment variable (e.g. Supabase / Neon PostgreSQL)
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Clean whitespace and surrounding quotes
    DATABASE_URL = DATABASE_URL.strip().strip('"').strip("'")
    
    # Normalize postgres:// to postgresql:// (required by SQLAlchemy 1.4+ and 2.0+)
    if DATABASE_URL.lower().startswith("postgres://"):
        DATABASE_URL = "postgresql://" + DATABASE_URL[len("postgres://"):]
    
    SQLALCHEMY_DATABASE_URL = DATABASE_URL

    # Ensure SSL for cloud databases like Neon if not explicitly in URI
    connect_args = {}
    if "neon.tech" in DATABASE_URL and "sslmode" not in DATABASE_URL:
        connect_args["sslmode"] = "require"

    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=300
    )
else:
    # 2. Fallback: SQLite
    if os.getenv("VERCEL"):
        # On Vercel serverless environment, only /tmp is writable
        DB_PATH = "/tmp/road_ranger.db"
    else:
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        DB_PATH = os.path.join(BASE_DIR, "roadranger.db")
        if not os.path.exists(DB_PATH):
            alt_path = os.path.join(BASE_DIR, "road_ranger.db")
            if os.path.exists(alt_path):
                DB_PATH = alt_path

    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
