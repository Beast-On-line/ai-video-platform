import os
import uuid
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from services.embedding_service import embed_text, embed_batch
from utils.logger import get_logger
from dotenv import load_dotenv

load_dotenv()

logger = get_logger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def format_embedding(embedding: list) -> str:
    return "[" + ",".join(str(x) for x in embedding) + "]"


def index_segments(video_id: str, transcript_id: str, segments: list) -> int:
    if not segments:
        logger.warning(f"No segments to index for video {video_id}")
        return 0

    texts = [seg["text"] for seg in segments]
    embeddings = embed_batch(texts)

    db = SessionLocal()
    try:
        count = 0
        for seg, embedding in zip(segments, embeddings):
            db.execute(
                text("""
                    INSERT INTO search.segment_embeddings
                        (id, video_id, transcript_id, segment_id, text, start_time, end_time, embedding)
                    VALUES
                        (:id, :video_id, :transcript_id, :segment_id, :text, :start_time, :end_time, CAST(:embedding AS vector))
                    ON CONFLICT (id) DO NOTHING
                """),
                {
                    "id": str(uuid.uuid4()),
                    "video_id": video_id,
                    "transcript_id": transcript_id,
                    "segment_id": seg["id"],
                    "text": seg["text"],
                    "start_time": float(seg["start_time"]),
                    "end_time": float(seg["end_time"]),
                    "embedding": format_embedding(embedding)
                }
            )
            count += 1

        db.commit()
        logger.info(f"Indexed {count} segments for video {video_id}")
        return count
    finally:
        db.close()


def search_segments(query: str, video_id: str = None, limit: int = 5) -> list:
    query_embedding = embed_text(query)
    embedding_str = format_embedding(query_embedding)

    db = SessionLocal()
    try:
        if video_id:
            result = db.execute(
                text("""
                    SELECT text, start_time, end_time, video_id,
                           1 - (embedding <=> CAST(:embedding AS vector)) as similarity
                    FROM search.segment_embeddings
                    WHERE video_id = :video_id
                    ORDER BY embedding <=> CAST(:embedding AS vector)
                    LIMIT :limit
                """),
                {
                    "embedding": embedding_str,
                    "video_id": video_id,
                    "limit": limit
                }
            ).fetchall()
        else:
            result = db.execute(
                text("""
                    SELECT text, start_time, end_time, video_id,
                           1 - (embedding <=> CAST(:embedding AS vector)) as similarity
                    FROM search.segment_embeddings
                    ORDER BY embedding <=> CAST(:embedding AS vector)
                    LIMIT :limit
                """),
                {
                    "embedding": embedding_str,
                    "limit": limit
                }
            ).fetchall()

        return [
            {
                "text": row[0],
                "start_time": row[1],
                "end_time": row[2],
                "video_id": row[3],
                "similarity": round(float(row[4]), 3)
            }
            for row in result
        ]
    finally:
        db.close()