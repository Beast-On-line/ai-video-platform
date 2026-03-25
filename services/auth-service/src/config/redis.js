const { createClient } = require("redis");
const { logger } = require("../utils/logger");

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => {
  logger.error("Redis error", { error: err.message });
});

redisClient.on("connect", () => {
  logger.info("Redis connected");
});

redisClient.on("reconnecting", () => {
  logger.warn("Redis reconnecting...");
});

async function connectRedis() {
  try {
    await redisClient.connect();
  } catch (err) {
    logger.error("Redis connection failed", { error: err.message });
    throw err;
  }
}

async function disconnectRedis() {
  await redisClient.quit();
  logger.info("Redis disconnected");
}

module.exports = { redisClient, connectRedis, disconnectRedis };
