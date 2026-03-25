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


async def answer_question(question: str, segments: list) -> str:
    if not segments:
        return "I could not find relevant content in this video to answer your question."

    context = "\n".join([
        f"[{seg['start_time']}s - {seg['end_time']}s]: {seg['text']}"
        for seg in segments
    ])

    prompt = f"""You are a helpful assistant that answers questions about video content.

You have access to these relevant transcript segments from the video:

{context}

Based ONLY on the transcript segments above, answer this question:
{question}

If the answer is not in the transcript segments, say "This topic is not covered in the relevant parts of the video."
Keep your answer concise and cite the timestamps when relevant.

Answer:"""

    logger.info(f"Sending question to Ollama with {len(segments)} context segments")
    answer = await generate(prompt)
    logger.info(f"Ollama answer: {answer[:100]}...")
    return answer