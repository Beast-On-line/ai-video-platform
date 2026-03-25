from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.retrieval_service import retrieve_relevant_segments
from services.ollama_service import answer_question
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    video_id: str


class SegmentReference(BaseModel):
    text: str
    start_time: float
    end_time: float
    similarity: float


class ChatResponse(BaseModel):
    answer: str
    sources: list[SegmentReference]
    video_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat_with_video(request: ChatRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    if not request.video_id.strip():
        raise HTTPException(status_code=400, detail="video_id is required")

    logger.info(f"Chat request — video: {request.video_id} — question: {request.question}")

    segments = retrieve_relevant_segments(request.question, request.video_id)
    answer = await answer_question(request.question, segments)

    return ChatResponse(
        answer=answer,
        sources=segments,
        video_id=request.video_id
    )


@router.get("/health")
def health():
    return {"status": "ok", "service": "chat-service"}

@router.get("/search")
async def search_videos(q: str, limit: int = 10):
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    from services.retrieval_service import retrieve_relevant_segments
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
    import os

    DATABASE_URL = os.getenv("DATABASE_URL")
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)

    from services.embedding_service import embed_text
    from services.retrieval_service import format_embedding

    question_embedding = embed_text(q)
    embedding_str = format_embedding(question_embedding)

    db = SessionLocal()
    try:
        results = db.execute(
            text("""
                SELECT
                    text,
                    start_time,
                    end_time,
                    video_id,
                    1 - (embedding <=> CAST(:embedding AS vector)) as similarity
                FROM search.segment_embeddings
                ORDER BY embedding <=> CAST(:embedding AS vector)
                LIMIT :limit
            """),
            {"embedding": embedding_str, "limit": limit}
        ).fetchall()

        return {
            "results": [
                {
                    "text": row[0],
                    "start_time": round(float(row[1]), 2),
                    "end_time": round(float(row[2]), 2),
                    "video_id": row[3],
                    "similarity": round(float(row[4]), 3)
                }
                for row in results
            ]
        }
    finally:
        db.close()