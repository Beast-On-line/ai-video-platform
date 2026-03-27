require("dotenv").config();
const Minio = require("minio");
const { logger } = require("../utils/logger");

const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT;
const usePublic = !!publicEndpoint;

const endPoint = usePublic
  ? publicEndpoint.replace("http://", "").replace("https://", "").split(":")[0]
  : process.env.MINIO_ENDPOINT || "localhost";

const port = usePublic
  ? parseInt(publicEndpoint.split(":")[2] || "9000")
  : parseInt(process.env.MINIO_PORT || "9000");

const minioClient = new Minio.Client({
  endPoint,
  port,
  useSSL: publicEndpoint?.startsWith("https") || false,
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

async function getSignedUrl(s3Key) {
  const bucket = process.env.MINIO_BUCKET || "ai-video-platform";
  const expiry = parseInt(process.env.SIGNED_URL_EXPIRY || "3600");

  try {
    const url = await minioClient.presignedGetObject(bucket, s3Key, expiry);
    logger.info("Generated signed URL");
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
