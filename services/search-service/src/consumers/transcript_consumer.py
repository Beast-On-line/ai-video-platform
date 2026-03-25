import os
import json
import asyncio
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from services.search_service import index_segments
from utils.logger import get_logger
from dotenv import load_dotenv

load_dotenv()

logger = get_logger(__name__)

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
KAFKA_GROUP_ID = os.getenv("KAFKA_GROUP_ID", "search-service")
KAFKA_TOPIC_CONSUME = os.getenv("KAFKA_TOPIC_CONSUME", "transcript.completed")
KAFKA_TOPIC_PRODUCE = os.getenv("KAFKA_TOPIC_PRODUCE", "search.indexed")

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def fetch_segments_from_db(transcript_id: str) -> list:
    db = SessionLocal()
    try:
        rows = db.execute(
            text("""
                SELECT id, text, start_time, end_time
                FROM transcription.transcript_segments
                WHERE transcript_id = :tid
                ORDER BY start_time
            """),
            {"tid": transcript_id}
        ).fetchall()

        return [
            {
                "id": row[0],
                "text": row[1],
                "start_time": float(row[2]),
                "end_time": float(row[3])
            }
            for row in rows
        ]
    finally:
        db.close()


async def process_event(event: dict, producer: AIOKafkaProducer):
    video_id = event.get("videoId")
    transcript_id = event.get("transcriptId")
    user_id = event.get("userId")

    logger.info(f"Indexing segments for video: {video_id}")

    try:
        segments = fetch_segments_from_db(transcript_id)
        logger.info(f"Fetched {len(segments)} segments for indexing")

        count = index_segments(video_id, transcript_id, segments)

        completion_event = {
            "videoId": video_id,
            "userId": user_id,
            "transcriptId": transcript_id,
            "indexedSegments": count
        }

        await producer.send(
            KAFKA_TOPIC_PRODUCE,
            key=video_id.encode(),
            value=json.dumps(completion_event).encode()
        )

        logger.info(f"Search indexing complete — {count} segments indexed — fired search.indexed")

    except Exception as e:
        logger.error(f"Failed to index video {video_id}: {e}", exc_info=True)


async def start_consumer():
    logger.info(f"Starting Kafka consumer — topic: {KAFKA_TOPIC_CONSUME}")

    consumer = AIOKafkaConsumer(
        KAFKA_TOPIC_CONSUME,
        bootstrap_servers=KAFKA_BROKER,
        group_id=KAFKA_GROUP_ID,
        auto_offset_reset="earliest",
        session_timeout_ms=60000,
        heartbeat_interval_ms=10000,
        max_poll_interval_ms=300000,
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