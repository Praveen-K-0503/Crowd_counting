from sqlmodel import SQLModel, Field, create_engine, Session

class FlightReport(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    filename: str
    max_capacity_breached: bool
    peak_crowd_count: int
    duration_frames: int
    chaos_anomalies: int

import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///crowd_data.db")

engine = create_engine(DATABASE_URL)

def init_db():
    SQLModel.metadata.create_all(engine)
