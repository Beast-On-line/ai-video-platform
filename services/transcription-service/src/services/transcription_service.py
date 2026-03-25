import os
import uuid
import tempfile
from minio import Minio
from sqlalchemy.orm import Session
from config.database import Transcript, TranscriptSegment
from services.whisper_service import transcribe_audio
from utils.logger import get_logger
from sqlalchemy import text as sql_text

logger = get_logger(__name__)


def download_video_from_minio(minio_client: Minio, s3_key: str) -> str:
    bucket = os.getenv("MINIO_BUCKET", "ai-video-platform")
    
    tmp_file = tempfile.NamedTemporaryFile(
        suffix=os.path.splitext(s3_key)[1],
        delete=False
    )
    tmp_path = tmp_file.name
    tmp_file.close()

    logger.info(f"Downloading from MinIO: {s3_key}")
    minio_client.fget_object(bucket, s3_key, tmp_path)
    logger.info(f"Downloaded to temp file: {tmp_path}")

    return tmp_path

def save_transcript_to_db(
    db: Session,
    video_id: str,
    transcription_result: dict
) -> str:
    transcript_id = str(uuid.uuid4())

    db.execute(
        sql_text("""
            INSERT INTO transcription.transcripts
                (id, video_id, language, full_text, status, created_at, updated_at)
            VALUES
                (:id, :video_id, :language, :full_text, :status, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
        """),
        {
            "id": transcript_id,
            "video_id": video_id,
            "language": transcription_result["language"],
            "full_text": transcription_result["full_text"],
            "status": "COMPLETED"
        }
    )
    db.flush()

    for seg in transcription_result["segments"]:
        db.execute(
            sql_text("""
                INSERT INTO transcription.transcript_segments
                    (id, transcript_id, text, start_time, end_time, created_at)
                VALUES
                    (:id, :transcript_id, :text, :start_time, :end_time, NOW())
                ON CONFLICT (id) DO NOTHING
            """),
            {
                "id": str(uuid.uuid4()),
                "transcript_id": transcript_id,
                "text": seg["text"],
                "start_time": float(seg["start"]),
                "end_time": float(seg["end"])
            }
        )

    db.commit()
    logger.info(f"Saved transcript {transcript_id} with {len(transcription_result['segments'])} segments")
    return transcript_id

def cleanup_temp_file(path: str):
    try:
        os.unlink(path)
        logger.info(f"Cleaned up temp file: {path}")
    except Exception as e:
        logger.warning(f"Could not delete temp file {path}: {e}")