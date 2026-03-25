import os
from sqlalchemy import create_engine, Column, String, Text, Float, Integer, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Transcript(Base):
    __tablename__ = "transcripts"
    __table_args__ = {"schema": "transcription"}

    id = Column(String, primary_key=True)
    video_id = Column(String, nullable=False, index=True)
    language = Column(String, nullable=True)
    full_text = Column(Text, nullable=True)
    status = Column(String, default="PROCESSING")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    __table_args__ = {"schema": "transcription"}

    id = Column(String, primary_key=True)
    transcript_id = Column(String, ForeignKey("transcription.transcripts.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


def create_tables():
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()