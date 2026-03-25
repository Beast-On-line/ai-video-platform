import os
from sentence_transformers import SentenceTransformer
from utils.logger import get_logger

logger = get_logger(__name__)

_model = None

def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        logger.info(f"Loading embedding model: {model_name}")
        _model = SentenceTransformer(model_name)
        logger.info("Embedding model loaded successfully")
    return _model


def embed_text(text: str) -> list:
    model = get_embedding_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()