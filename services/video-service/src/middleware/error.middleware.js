const { logger } = require("../utils/logger");

function errorHandler(err, req, res, next) {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : "Internal server error";
  return res.status(status).json({ error: message });
}

module.exports = { errorHandler };
