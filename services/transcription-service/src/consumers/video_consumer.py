import os
import json
import asyncio
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from config.database import SessionLocal
from config.minio_client import get_minio_client
from services.transcription_service import (
    download_video_from_minio,
    save_transcript_to_db,
    cleanup_temp_file
)
from services.whisper_service import transcribe_audio
from utils.logger import get_logger

logger = get_logger(__name__)

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
KAFKA_GROUP_ID = os.getenv("KAFKA_GROUP_ID", "transcription-service")
KAFKA_TOPIC_CONSUME = os.getenv("KAFKA_TOPIC_CONSUME", "video.uploaded")
KAFKA_TOPIC_PRODUCE = os.getenv("KAFKA_TOPIC_PRODUCE", "transcript.completed")


async def process_video(event: dict, producer: AIOKafkaProducer):
    video_id = event.get("videoId")
    s3_key = event.get("s3Key")
    user_id = event.get("userId")

    logger.info(f"Processing video: {video_id}")

    tmp_path = None
    try:
        minio_client = get_minio_client()
        tmp_path = download_video_from_minio(minio_client, s3_key)

        transcription_result = transcribe_audio(tmp_path)

        db = SessionLocal()
        try:
            transcript_id = save_transcript_to_db(db, video_id, transcription_result)
        finally:
            db.close()

        completion_event = {
            "videoId": video_id,
            "userId": user_id,
            "transcriptId": transcript_id,
            "language": transcription_result["language"],
            "segmentCount": len(transcription_result["segments"]),
            "duration": transcription_result.get("duration")
        }

        await producer.send(
            KAFKA_TOPIC_PRODUCE,
            key=video_id.encode(),
            value=json.dumps(completion_event).encode()
        )

        logger.info(f"Transcription complete for video {video_id} — fired transcript.completed")

    except Exception as e:
        logger.error(f"Failed to process video {video_id}: {e}", exc_info=True)

    finally:
        if tmp_path:
            cleanup_temp_file(tmp_path)


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

    producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BROKER,
    )

    await consumer.start()
    await producer.start()
    logger.info("Kafka consumer and producer started")

    try:
        async for message in consumer:
            event = message.value
            logger.info(f"Received event: {event}")
            await process_video(event, producer)
    finally:
        await consumer.stop()
        await producer.stop()