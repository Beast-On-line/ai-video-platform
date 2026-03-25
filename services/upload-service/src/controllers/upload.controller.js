require("dotenv").config();
const { Upload } = require("@aws-sdk/lib-storage");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const { s3Client } = require("../config/s3");
const { prisma } = require("../config/database");
const { publishEvent } = require("../config/kafka");
const { logger } = require("../utils/logger");

const BUCKET = process.env.AWS_BUCKET_NAME;

// POST /api/upload
async function uploadVideo(req, res, next) {
  let videoId = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided" });
    }

    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    videoId = uuidv4();
    const ext = req.file.originalname.split(".").pop();
    const s3Key = `videos/${videoId}/original.${ext}`;

    logger.info("Starting upload", {
      videoId,
      fileName: req.file.originalname,
      size: req.file.size,
      userId: req.user.sub,
    });

    // Create video record in DB with UPLOADING status
    await prisma.video.create({
      data: {
        id: videoId,
        userId: req.user.sub,
        title,
        description: description || null,
        status: "UPLOADING",
        mimeType: req.file.mimetype,
        sizeBytes: BigInt(req.file.size),
        s3Bucket: BUCKET,
        s3Key,
      },
    });

    // Stream file to S3/MinIO
    const parallelUpload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET,
        Key: s3Key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      },
      queueSize: 4,
      partSize: 5 * 1024 * 1024,
    });

    await parallelUpload.done();

    logger.info("File uploaded to S3", { videoId, s3Key });

    // Update status to PROCESSING
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "PROCESSING" },
    });

    // Fire Kafka event
    await publishEvent("video.uploaded", {
      videoId,
      userId: req.user.sub,
      s3Key,
      s3Bucket: BUCKET,
      mimeType: req.file.mimetype,
      title,
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json({
      message: "Video uploaded successfully",
      video: {
        id: videoId,
        title,
        status: "PROCESSING",
        s3Key,
      },
    });
  } catch (err) {
    // If S3 upload succeeded but something else failed
    // update DB status to FAILED so user knows
    if (videoId) {
      await prisma.video
        .update({
          where: { id: videoId },
          data: { status: "FAILED" },
        })
        .catch(() => {});
    }
    next(err);
  }
}

// GET /api/upload/:id/status
async function getVideoStatus(req, res, next) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        title: true,
        status: true,
        hlsUrl: true,
        createdAt: true,
      },
    });

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    return res.json({ video });
  } catch (err) {
    next(err);
  }
}

// GET /api/upload/my-videos
async function getMyVideos(req, res, next) {
  try {
    const videos = await prisma.video.findMany({
      where: { userId: req.user.sub },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        hlsUrl: true,
        duration: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ videos });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadVideo, getVideoStatus, getMyVideos };
