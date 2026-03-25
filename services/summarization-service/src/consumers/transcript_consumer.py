import os
import json
import asyncio
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from sqlalchemy import text
from config.database import SessionLocal
from services.summarization_service import process_transcript
from utils.logger import get_logger

logger = get_logger(__name__)

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
KAFKA_GROUP_ID = os.getenv("KAFKA_GROUP_ID", "summarization-service")
KAFKA_TOPIC_CONSUME = os.getenv("KAFKA_TOPIC_CONSUME", "transcript.completed")
KAFKA_TOPIC_PRODUCE = os.getenv("KAFKA_TOPIC_PRODUCE", "summarization.completed")


async def fetch_transcript_from_db(video_id: str, transcript_id: str) -> dict:
    db = SessionLocal()
    try:
        transcript_result = db.execute(
            text("SELECT full_text, language FROM transcription.transcripts WHERE id = :id"),
            {"id": transcript_id}
        ).fetchone()

        if not transcript_result:
            raise Exception(f"Transcript {transcript_id} not found in DB")

        segments_result = db.execute(
            text("""
                SELECT text, start_time, end_time
                FROM transcription.transcript_segments
                WHERE transcript_id = :tid
                ORDER BY start_time
            """),
            {"tid": transcript_id}
        ).fetchall()

        segments = [
            {
                "text": row[0],
                "start_time": float(row[1]),
                "end_time": float(row[2])
            }
            for row in segments_result
        ]

        return {
            "full_text": transcript_result[0],
            "language": transcript_result[1],
            "segments": segments
        }
    finally:
        db.close()


async def process_event(event: dict, producer: AIOKafkaProducer):
    video_id = event.get("videoId")
    transcript_id = event.get("transcriptId")
    user_id = event.get("userId")

    logger.info(f"Processing transcript for video: {video_id}")

    try:
        transcript_data = await fetch_transcript_from_db(video_id, transcript_id)

        db = SessionLocal()
        try:
            summary_id = await process_transcript(
                db=db,
                video_id=video_id,
                transcript_id=transcript_id,
                full_text=transcript_data["full_text"],
                segments=transcript_data["segments"],
                language=transcript_data["language"]
            )
        finally:
            db.close()

        completion_event = {
            "videoId": video_id,
            "userId": user_id,
            "transcriptId": transcript_id,
            "summaryId": summary_id
        }

        await producer.send(
            KAFKA_TOPIC_PRODUCE,
            key=video_id.encode(),
            value=json.dumps(completion_event).encode()
        )

        logger.info(f"Summarization complete for video {video_id} — fired summarization.completed")

    except Exception as e:
        logger.error(f"Failed to process transcript for video {video_id}: {e}", exc_info=True)


async def start_consumer():
    logger.info(f"Starting Kafka consumer — topic: {KAFKA_TOPIC_CONSUME}")

    consumer = AIOKafkaConsumer(
        KAFKA_TOPIC_CONSUME,
        bootstrap_servers=KAFKA_BROKER,
        group_id=KAFKA_GROUP_ID,
        auto_offset_reset="earliest",
        session_timeout_ms=60000,
        heartbeat_interval_ms=10000,
        max_poll_interval_ms=600000,
        value_deserializer=lambda m: json.loads(m.decode("utf-8"))
    )

    producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BROKER)

    await consumer.start()
    await producer.start()
    logger.info("Kafka consumer and producer started")

    try:
        async for message in consumer:
            event = message.value
            logger.info(f"Received event: {event}")
            await process_event(event, producer)
    finally:
        await consumer.stop()
        await producer.stop()