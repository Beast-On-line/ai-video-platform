require("dotenv").config();
const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { v4: uuidv4 } = require("uuid");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const Minio = require("minio");
const { Kafka } = require("kafkajs");
const { logger } = require("../utils/logger");

const execFileAsync = promisify(execFile);

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_SECURE === "true",
  accessKey: process.env.AWS_ACCESS_KEY_ID || "minioadmin",
  secretKey: process.env.AWS_SECRET_ACCESS_KEY || "minioadmin",
});

const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});
const producer = kafka.producer();
let producerConnected = false;

async function getProducer() {
  if (!producerConnected) {
    await producer.connect();
    producerConnected = true;
  }
  return producer;
}

// In-memory job status store
const jobs = new Map();

async function importFromYoutube(req, res, next) {
  const { url, title, description } = req.body;
  const userId = req.user.sub;

  if (!url || (!url.includes("youtube.com") && !url.includes("youtu.be"))) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  const jobId = uuidv4();
  const videoId = uuidv4();

  jobs.set(jobId, { status: "downloading", progress: 0, videoId });

  res.json({ jobId, videoId, message: "YouTube import started" });

  // Process in background
  processYoutubeImport({
    jobId,
    videoId,
    url,
    title,
    description,
    userId,
  }).catch((err) => {
    logger.error("YouTube import failed", { jobId, error: err.message });
    jobs.set(jobId, { status: "failed", error: err.message });
  });
}

async function processYoutubeImport({
  jobId,
  videoId,
  url,
  title,
  description,
  userId,
}) {
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `${videoId}.mp4`);

  try {
    // Step 1 — Get video info
    logger.info(`Getting YouTube video info: ${url}`);
    jobs.set(jobId, { status: "downloading", progress: 10, videoId });

    const { stdout } = await execFileAsync("yt-dlp", [
      "--print",
      "title",
      "--no-playlist",
      url,
    ]);
    const videoTitle = title || stdout.trim() || "YouTube Video";

    // Step 2 — Download video
    logger.info(`Downloading YouTube video: ${url}`);
    jobs.set(jobId, { status: "downloading", progress: 20, videoId });

    await execFileAsync(
      "yt-dlp",
      [
        "-f",
        "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format",
        "mp4",
        "--no-playlist",
        "-o",
        tmpFile,
        url,
      ],
      { timeout: 300000 },
    ); // 5 min timeout

    jobs.set(jobId, { status: "uploading", progress: 60, videoId });

    // Step 3 — Get file size
    const stats = fs.statSync(tmpFile);
    const sizeBytes = stats.size;
    const s3Key = `videos/${videoId}/original.mp4`;
    const bucket = process.env.AWS_BUCKET_NAME || "ai-video-platform";

    // Step 4 — Upload to MinIO
    logger.info(`Uploading to MinIO: ${s3Key}`);
    await minioClient.fPutObject(bucket, s3Key, tmpFile, {
      "Content-Type": "video/mp4",
    });

    jobs.set(jobId, { status: "processing", progress: 80, videoId });

    // Step 5 — Save to database
    await prisma.video.create({
      data: {
        id: videoId,
        userId,
        title: videoTitle,
        description: description || `Imported from YouTube: ${url}`,
        status: "PROCESSING",
        s3Key,
        s3Bucket: bucket,
        mimeType: "video/mp4",
        sizeBytes: BigInt(sizeBytes),
      },
    });

    // Step 6 — Fire Kafka event
    const p = await getProducer();
    await p.send({
      topic: "video.uploaded",
      messages: [
        {
          key: videoId,
          value: JSON.stringify({
            videoId,
            userId,
            s3Key,
            s3Bucket: bucket,
            mimeType: "video/mp4",
            title: videoTitle,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });

    jobs.set(jobId, { status: "done", progress: 100, videoId });
    logger.info(`YouTube import complete: ${videoId}`);
  } finally {
    // Cleanup temp file
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
      logger.info(`Cleaned up temp file: ${tmpFile}`);
    }
  }
}

async function getJobStatus(req, res) {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  return res.json(job);
}

module.exports = { importFromYoutube, getJobStatus };
