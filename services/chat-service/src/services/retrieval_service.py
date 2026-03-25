import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from services.embedding_service import embed_text
from utils.logger import get_logger
from dotenv import load_dotenv

load_dotenv()

logger = get_logger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

MAX_SEGMENTS = int(os.getenv("MAX_CONTEXT_SEGMENTS", "5"))
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.1"))


def format_embedding(embedding: list) -> str:
    return "[" + ",".join(str(x) for x in embedding) + "]"


def retrieve_relevant_segments(question: str, video_id: str) -> list:
    question_embedding = embed_text(question)
    embedding_str = format_embedding(question_embedding)

    db = SessionLocal()
    try:
        results = db.execute(
            text("""
                SELECT
                    text,
                    start_time,
                    end_time,
                    1 - (embedding <=> CAST(:embedding AS vector)) as similarity
                FROM search.segment_embeddings
                WHERE video_id = :video_id
                ORDER BY embedding <=> CAST(:embedding AS vector)
                LIMIT :limit
            """),
            {
                "embedding": embedding_str,
                "video_id": video_id,
                "limit": MAX_SEGMENTS
            }
        ).fetchall()

        segments = [
            {
                "text": row[0],
                "start_time": round(float(row[1]), 2),
                "end_time": round(float(row[2]), 2),
                "similarity": round(float(row[3]), 3)
            }
            for row in results
            if float(row[3]) >= SIMILARITY_THRESHOLD
        ]

        logger.info(f"Retrieved {len(segments)} relevant segments for question: '{question[:50]}'")
        return segments

    finally:
        db.close()