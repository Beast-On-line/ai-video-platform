require("dotenv").config();
const { S3Client } = require("@aws-sdk/client-s3");
const { logger } = require("../utils/logger");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

logger.info("S3 client initialized", {
  endpoint: process.env.S3_ENDPOINT || "AWS default",
  bucket: process.env.AWS_BUCKET_NAME,
});

module.exports = { s3Client };
