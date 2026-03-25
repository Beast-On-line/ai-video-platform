const { logger } = require("../utils/logger");

function errorHandler(err, req, res, next) {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB}MB`,
    });
  }

  if (err.message?.startsWith("Invalid file type")) {
    return res.status(415).json({ error: err.message });
  }

  if (err.code === "P2002") {
    return res
      .status(409)
      .json({ error: "A record with this value already exists" });
  }

  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : "Internal server error";

  return res.status(status).json({ error: message });
}

module.exports = { errorHandler };
