require("dotenv").config();
const multer = require("multer");
const path = require("path");

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || "2048") * 1024 * 1024;

const ALLOWED_MIMES = (
  process.env.ALLOWED_MIME_TYPES ||
  "video/mp4,video/webm,video/quicktime,video/x-msvideo"
).split(",");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIMES.join(", ")}`,
      ),
      false,
    );
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter,
});

module.exports = { upload };
