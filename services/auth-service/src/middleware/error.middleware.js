const { logger } = require("../utils/logger");

function errorHandler(err, req, res, next) {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err.code === "P2002") {
    return res
      .status(409)
      .json({ error: "A record with this value already exists" });
  }

  if (err.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }

  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : "Internal server error";

  return res.status(status).json({ error: message });
}

module.exports = { errorHandler };
