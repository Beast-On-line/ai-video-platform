const express = require("express");
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

module.exports = router;
