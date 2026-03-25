import os
import tempfile
from faster_whisper import WhisperModel
from utils.logger import get_logger

logger = get_logger(__name__)

_model = None

def get_whisper_model() -> WhisperModel:
    global _model
    if _model is None:
        model_size = os.getenv("WHISPER_MODEL", "base")
        device = os.getenv("WHISPER_DEVICE", "cpu")
        compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

        logger.info(f"Loading Whisper model: {model_size} on {device}")
        _model = WhisperModel(model_size, device=device, compute_type=compute_type)
        logger.info("Whisper model loaded successfully")

    return _model


def transcribe_audio(audio_path: str) -> dict:
    model = get_whisper_model()

    logger.info(f"Starting transcription: {audio_path}")

    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500)
    )

    result_segments = []
    full_text_parts = []

    for segment in segments:
        result_segments.append({
            "text": segment.text.strip(),
            "start": round(segment.start, 2),
            "end": round(segment.end, 2)
        })
        full_text_parts.append(segment.text.strip())
        logger.info(f"[{segment.start:.1f}s → {segment.end:.1f}s] {segment.text.strip()}")

    full_text = " ".join(full_text_parts)

    logger.info(f"Transcription complete — {len(result_segments)} segments, language: {info.language}")

    return {
        "segments": result_segments,
        "full_text": full_text,
        "language": info.language,
        "duration": info.duration
    }