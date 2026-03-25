require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { logger } = require("../utils/logger");

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info("PostgreSQL connected");
  } catch (err) {
    logger.error("PostgreSQL connection failed", { error: err.message });
    throw err;
  }
}

async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info("PostgreSQL disconnected");
}

module.exports = { prisma, connectDatabase, disconnectDatabase };
