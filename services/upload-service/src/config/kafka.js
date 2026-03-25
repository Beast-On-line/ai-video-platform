require("dotenv").config();
const { Kafka } = require("kafkajs");
const { logger } = require("../utils/logger");

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "upload-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
});

const producer = kafka.producer();

async function connectKafka() {
  try {
    await producer.connect();
    logger.info("Kafka producer connected");
  } catch (err) {
    logger.error("Kafka connection failed", { error: err.message });
    throw err;
  }
}

async function disconnectKafka() {
  await producer.disconnect();
  logger.info("Kafka producer disconnected");
}

async function publishEvent(topic, message) {
  try {
    await producer.send({
      topic,
      messages: [
        {
          key: message.videoId,
          value: JSON.stringify(message),
        },
      ],
    });
    logger.info("Event published", { topic, videoId: message.videoId });
  } catch (err) {
    logger.error("Failed to publish event", { topic, error: err.message });
    throw err;
  }
}

module.exports = { connectKafka, disconnectKafka, publishEvent };
