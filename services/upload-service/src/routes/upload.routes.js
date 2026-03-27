const express = require("express");
const {
  importFromYoutube,
  getJobStatus,
} = require("../controllers/youtube.controller");
const {
  uploadVideo,
  getVideoStatus,
  getMyVideos,
} = require("../controllers/upload.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { upload } = require("../middleware/upload.middleware");

const router = express.Router();

router.post("/", authenticate, upload.single("video"), uploadVideo);
router.get("/my-videos", authenticate, getMyVideos);
router.get("/:id/status", authenticate, getVideoStatus);
router.post("/youtube", authenticate, importFromYoutube);
router.get("/youtube/:jobId/status", authenticate, getJobStatus);

module.exports = router;
