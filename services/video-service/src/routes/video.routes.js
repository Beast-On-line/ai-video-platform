const express = require("express");
const {
  getVideo,
  getMyVideos,
  getChapters,
  getTranscript,
} = require("../controllers/video.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", authenticate, getMyVideos);
router.get("/:id", authenticate, getVideo);
router.get("/:id/chapters", authenticate, getChapters);
router.get("/:id/transcript", authenticate, getTranscript);

module.exports = router;
