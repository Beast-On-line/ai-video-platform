import os
from minio import Minio
from utils.logger import get_logger

load_dotenv_imported = False
try:
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv_imported = True
except ImportError:
    pass

logger = get_logger(__name__)

def get_minio_client() -> Minio:
    client = Minio(
        endpoint=f"{os.getenv('MINIO_ENDPOINT', 'localhost')}:{os.getenv('MINIO_PORT', '9000')}",
        access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
        secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
        secure=os.getenv("MINIO_SECURE", "false").lower() == "true"
    )
    logger.info("MinIO client initialized")
    return client