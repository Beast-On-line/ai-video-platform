import asyncio
import os
from dotenv import load_dotenv
from consumers.transcript_consumer import start_consumer
from utils.logger import get_logger

load_dotenv()

logger = get_logger(__name__)


async def main():
    logger.info("Starting search service")
    await start_consumer()


if __name__ == "__main__":
    asyncio.run(main())
    