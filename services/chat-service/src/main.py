import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.chat_router import router
from utils.logger import get_logger

load_dotenv()

logger = get_logger(__name__)

app = FastAPI(title="Chat-with-video service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.on_event("startup")
async def startup():
    logger.info("Chat service starting up")
    from services.embedding_service import get_embedding_model
    get_embedding_model()
    logger.info(f"Chat service ready on port {os.getenv('PORT', '4004')}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "4004")),
        reload=True
    )