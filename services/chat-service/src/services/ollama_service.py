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


async def answer_question(question: str, segments: list) -> str:
    if not segments:
        return "I could not find relevant content in this video to answer your question."

    context = "\n".join([
        f"[{seg['start_time']}s - {seg['end_time']}s]: {seg['text']}"
        for seg in segments
    ])

    prompt = f"""You are a helpful assistant answering questions about video content.

Relevant transcript segments:
{context}

Based ONLY on the segments above, answer this question:
{question}

If the answer is not in the segments, say "This topic is not covered in the relevant parts of the video."
Keep your answer concise and cite timestamps when relevant.

Answer:"""

    logger.info(f"Sending question to Groq with {len(segments)} context segments")
    answer = await generate(prompt)
    logger.info(f"Answer: {answer[:100]}...")
    return answer