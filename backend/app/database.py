import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import DATABASE_URL

Base = declarative_base()

def get_engine():
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL environment variable is not set.", file=sys.stderr)
        print("Please set DATABASE_URL to your cloud PostgreSQL connection string.", file=sys.stderr)
        raise RuntimeError("DATABASE_URL is not configured.")
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=5,
            max_overflow=5,
        )
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Database connection established successfully.")
        return engine
    except Exception as e:
        print(f"ERROR: Failed to connect to the database: {e}", file=sys.stderr)
        print("Check your DATABASE_URL (host, port, credentials, sslmode).", file=sys.stderr)
        raise

try:
    engine = get_engine()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    DB_AVAILABLE = True
except Exception:
    engine = None
    SessionLocal = None
    DB_AVAILABLE = False

def get_db():
    if not DB_AVAILABLE or SessionLocal is None:
        raise RuntimeError("Database is not available. Check DATABASE_URL and connection.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
