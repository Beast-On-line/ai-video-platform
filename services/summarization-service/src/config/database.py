import os
from sqlalchemy import create_engine, Column, String, Text, Integer, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class VideoSummary(Base):
    __tablename__ = "video_summaries"
    __table_args__ = {"schema": "summarization"}

    id = Column(String, primary_key=True)
    video_id = Column(String, nullable=False, index=True)
    transcript_id = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    language = Column(String, nullable=True)
    status = Column(String, default="PROCESSING")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VideoChapter(Base):
    __tablename__ = "video_chapters"
    __table_args__ = {"schema": "summarization"}

    id = Column(String, primary_key=True)
    summary_id = Column(String, ForeignKey("summarization.video_summaries.id", ondelete="CASCADE"), nullable=False, index=True)
    video_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=True)
    chapter_order = Column(Integer, nullable=False)
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