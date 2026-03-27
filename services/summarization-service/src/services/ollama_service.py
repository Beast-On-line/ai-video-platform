import os
import httpx
from utils.logger import get_logger

logger = get_logger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-8b-8192")


async def generate(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3
            }
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()


async def generate_summary(full_text: str) -> str:
    prompt = f"""Summarize this video transcript in 2-3 clear sentences.
Focus on the main topic and key points.

Transcript:
{full_text[:3000]}

Summary:"""

    logger.info("Generating summary with Groq")
    summary = await generate(prompt)
    logger.info(f"Summary generated: {summary[:100]}...")
    return summary


async def generate_chapters(segments: list) -> list:
    segments_text = "\n".join([
        f"[{seg['start_time']:.1f}s] {seg['text']}"
        for seg in segments[:100]
    ])

    prompt = f"""Create 3-6 chapters from these video transcript segments.
Return ONLY a JSON array, no explanation:
[
  {{"title": "Chapter title", "start_time": 0.0}},
  {{"title": "Another chapter", "start_time": 45.5}}
]

Segments:
{segments_text}"""

    logger.info("Generating chapters with Groq")
    import json
    import re
    raw = await generate(prompt)
    match = re.search(r'\[.*\]', raw, re.DOTALL)
    if not match:
        return [{"title": "Full video", "start_time": 0.0}]
    try:
        chapters = json.loads(match.group())
        logger.info(f"Generated {len(chapters)} chapters")
        return chapters
    except json.JSONDecodeError:
        return [{"title": "Full video", "start_time": 0.0}]