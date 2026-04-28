from sqlmodel import SQLModel, Field, create_engine, Session

class FlightReport(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    filename: str
    max_capacity_breached: bool
    peak_crowd_count: int
    duration_frames: int
    chaos_anomalies: int

engine = create_engine("sqlite:///crowd_data.db")

def init_db():
    SQLModel.metadata.create_all(engine)
