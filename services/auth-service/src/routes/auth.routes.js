const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  register,
  login,
  refresh,
  logout,
  me,
  logoutAll,
} = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {
  validate,
  registerRules,
  loginRules,
} = require("../middleware/validate.middleware");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many attempts, please try again in 15 minutes." },
  skipSuccessfulRequests: true,
});

router.post("/register", authLimiter, registerRules, validate, register);
router.post("/login", authLimiter, loginRules, validate, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.get("/me", authenticate, me);
router.post("/logout-all", authenticate, logoutAll);

module.exports = router;
