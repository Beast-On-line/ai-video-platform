require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

const videoRoutes = require("./routes/video.routes");
const { errorHandler } = require("./middleware/error.middleware");
const { connectDatabase } = require("./config/database");
const { logger } = require("./utils/logger");

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(
  morgan("combined", {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }),
);
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "video-service",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/videos", videoRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(errorHandler);

async function start() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      logger.info(`Video service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Failed to start", { error: err.message });
    process.exit(1);
  }
}

start();
