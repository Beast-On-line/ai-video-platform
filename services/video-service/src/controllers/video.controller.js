require("dotenv").config();
const { prisma } = require("../config/database");
const { getSignedUrl } = require("../config/minio");
const { logger } = require("../utils/logger");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /api/videos/:id
async function getVideo(req, res, next) {
  try {
    const { id } = req.params;

    const video = await prisma.video.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    let playbackUrl = null;
    logger.info("Video s3Key:", { s3Key: video.s3Key });
    if (video.s3Key) {
      try {
        playbackUrl = await getSignedUrl(video.s3Key);
        logger.info("Generated playback URL successfully");
      } catch (err) {
        logger.warn("Could not generate playback URL", {
          videoId: id,
          error: err.message,
        });
      }
    }

    const transcriptResult = await pool.query(
      `SELECT id, language, full_text, status
       FROM transcription.transcripts
       WHERE video_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [id],
    );

    const transcript = transcriptResult.rows[0] || null;

    let segments = [];
    if (transcript) {
      const segmentsResult = await pool.query(
        `SELECT text, start_time, end_time
         FROM transcription.transcript_segments
         WHERE transcript_id = $1
         ORDER BY start_time`,
        [transcript.id],
      );
      segments = segmentsResult.rows;
    }

    const chaptersResult = await pool.query(
      `SELECT title, start_time, end_time, chapter_order
       FROM summarization.video_chapters
       WHERE video_id = $1
       ORDER BY chapter_order`,
      [id],
    );

    const summaryResult = await pool.query(
      `SELECT summary, status
       FROM summarization.video_summaries
       WHERE video_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [id],
    );

    return res.json({
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        status: video.status,
        mimeType: video.mimeType,
        sizeBytes: video.sizeBytes?.toString(),
        createdAt: video.createdAt,
        s3Key: video.s3Key,
        playbackUrl,
        tags: video.tags.map((t) => t.tag),
      },
      transcript: transcript
        ? {
            id: transcript.id,
            language: transcript.language,
            status: transcript.status,
            fullText: transcript.full_text,
            segments,
          }
        : null,
      chapters: chaptersResult.rows,
      summary: summaryResult.rows[0]?.summary || null,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/videos — list all videos for current user
async function getMyVideos(req, res, next) {
  try {
    const videos = await prisma.video.findMany({
      where: { userId: req.user.sub },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        mimeType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ videos });
  } catch (err) {
    next(err);
  }
}

// GET /api/videos/:id/chapters
async function getChapters(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT title, start_time, end_time, chapter_order
       FROM summarization.video_chapters
       WHERE video_id = $1
       ORDER BY chapter_order`,
      [id],
    );

    return res.json({ chapters: result.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/videos/:id/transcript
async function getTranscript(req, res, next) {
  try {
    const { id } = req.params;

    const transcriptResult = await pool.query(
      `SELECT id, language, full_text, status
       FROM transcription.transcripts
       WHERE video_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [id],
    );

    if (!transcriptResult.rows[0]) {
      return res.status(404).json({ error: "Transcript not found" });
    }

    const transcript = transcriptResult.rows[0];

    const segmentsResult = await pool.query(
      `SELECT text, start_time, end_time
       FROM transcription.transcript_segments
       WHERE transcript_id = $1
       ORDER BY start_time`,
      [transcript.id],
    );

    return res.json({
      transcript: {
        language: transcript.language,
        status: transcript.status,
        fullText: transcript.full_text,
        segments: segmentsResult.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getVideo, getMyVideos, getChapters, getTranscript };
