require("dotenv").config();
const Minio = require("minio");
const { logger } = require("../utils/logger");

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_SECURE === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

async function getSignedUrl(s3Key) {
  const bucket = process.env.MINIO_BUCKET || "ai-video-platform";
  const expiry = parseInt(process.env.SIGNED_URL_EXPIRY || "3600");
  const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT;

  try {
    const url = await minioClient.presignedGetObject(bucket, s3Key, expiry);

    if (publicEndpoint) {
      const urlObj = new URL(url);
      const publicUrl = new URL(publicEndpoint);
      urlObj.hostname = publicUrl.hostname;
      urlObj.port = publicUrl.port;
      urlObj.protocol = publicUrl.protocol;
      return urlObj.toString();
    }

    return url;
  } catch (err) {
    logger.error("Failed to generate signed URL", {
      s3Key,
      error: err.message,
    });
    throw err;
  }
}

module.exports = { minioClient, getSignedUrl };
