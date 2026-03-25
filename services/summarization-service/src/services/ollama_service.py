import os
import httpx
from utils.logger import get_logger

logger = get_logger(__name__)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")


async def generate(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False
            }
        )
        response.raise_for_status()
        result = response.json()
        return result["response"].strip()


async def generate_summary(full_text: str) -> str:
    prompt = f"""You are a helpful assistant that summarizes video transcripts.

Given the following video transcript, write a clear and concise summary in 2-3 sentences.
Focus on the main topic and key points covered.

Transcript:
{full_text[:3000]}

Summary:"""

    logger.info("Generating summary with Ollama")
    summary = await generate(prompt)
    logger.info(f"Summary generated: {summary[:100]}...")
    return summary


async def generate_chapters(segments: list) -> list:
    segments_text = "\n".join([
        f"[{seg['start_time']:.1f}s] {seg['text']}"
        for seg in segments[:100]
    ])

    prompt = f"""You are a helpful assistant that creates video chapters from transcripts.

Given these timestamped transcript segments, create 3-6 meaningful chapters.
Each chapter should represent a distinct topic or section of the video.

Transcript segments:
{segments_text}

Return ONLY a JSON array with this exact format, no explanation:
[
  {{"title": "Chapter title here", "start_time": 0.0}},
  {{"title": "Another chapter", "start_time": 45.5}},
  {{"title": "Final section", "start_time": 120.0}}
]"""

    logger.info("Generating chapters with Ollama")
    raw = await generate(prompt)
    logger.info(f"Raw chapters response: {raw[:200]}")

    import json
    import re

    match = re.search(r'\[.*\]', raw, re.DOTALL)
    if not match:
        logger.warning("No JSON array found in response — using default chapter")
        return [{"title": "Full video", "start_time": 0.0}]

    try:
        chapters = json.loads(match.group())
        logger.info(f"Generated {len(chapters)} chapters")
        return chapters
    except json.JSONDecodeError:
        logger.warning("Failed to parse chapters JSON — using default")
        return [{"title": "Full video", "start_time": 0.0}]