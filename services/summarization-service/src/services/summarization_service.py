import os
import uuid
from sqlalchemy.orm import Session
from config.database import VideoSummary, VideoChapter
from services.ollama_service import generate_summary, generate_chapters
from utils.logger import get_logger

logger = get_logger(__name__)


async def process_transcript(
    db: Session,
    video_id: str,
    transcript_id: str,
    full_text: str,
    segments: list,
    language: str
) -> str:
    summary_id = str(uuid.uuid4())

    summary_record = VideoSummary(
        id=summary_id,
        video_id=video_id,
        transcript_id=transcript_id,
        language=language,
        status="PROCESSING"
    )
    db.add(summary_record)
    db.commit()

    try:
        summary_text = await generate_summary(full_text)
        chapters_data = await generate_chapters(segments)

        summary_record.summary = summary_text
        summary_record.status = "COMPLETED"
        db.add(summary_record)
        db.flush()

        chapters = []
        for i, ch in enumerate(chapters_data):
            end_time = chapters_data[i + 1]["start_time"] if i + 1 < len(chapters_data) else None
            chapter = VideoChapter(
                id=str(uuid.uuid4()),
                summary_id=summary_id,
                video_id=video_id,
                title=ch["title"],
                start_time=float(ch["start_time"]),
                end_time=float(end_time) if end_time else None,
                chapter_order=i + 1
            )
            chapters.append(chapter)

        db.bulk_save_objects(chapters)
        db.commit()

        logger.info(f"Saved summary + {len(chapters)} chapters for video {video_id}")
        return summary_id

    except Exception as e:
        summary_record.status = "FAILED"
        db.add(summary_record)
        db.commit()
        logger.error(f"Summarization failed for video {video_id}: {e}")
        raise