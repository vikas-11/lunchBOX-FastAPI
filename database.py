from pathlib import Path

from sqlmodel import SQLModel, Session, create_engine

BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite:///{BASE_DIR / 'lunchbox.db'}"

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)


def create_tables() -> None:
    """Create any missing SQLModel tables."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Provide a database session for one request and close it afterwards."""
    with Session(engine) as session:
        yield session
