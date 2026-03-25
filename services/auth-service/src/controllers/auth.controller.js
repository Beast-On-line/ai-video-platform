const bcrypt = require("bcryptjs");
const { prisma } = require("../config/database");
const { redisClient } = require("../config/redis");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
} = require("../utils/jwt");
const { logger } = require("../utils/logger");

const BCRYPT_ROUNDS = 12;

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function register(req, res, next) {
  try {
    const { email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    const tokenPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    logger.info("User registered", { userId: user.id });
    return res.status(201).json({ accessToken, user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const tokenPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    logger.info("User logged in", { userId: user.id });
    return res.json({
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: "No refresh token" });
    }

    const blacklisted = await redisClient.get(`blacklist:${hashToken(token)}`);
    if (blacklisted) {
      return res.status(401).json({ error: "Token revoked" });
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash: hashToken(token),
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      return res
        .status(401)
        .json({ error: "Refresh token not found or expired" });
    }

    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });

    const newTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const newAccessToken = generateAccessToken(newTokenPayload);
    const newRefreshToken = generateRefreshToken(newTokenPayload);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);
    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(204).send();
    }

    await redisClient.setEx(
      `blacklist:${hashToken(token)}`,
      7 * 24 * 60 * 60,
      "1",
    );

    await prisma.refreshToken.deleteMany({
      where: { tokenHash: hashToken(token) },
    });

    res.clearCookie("refreshToken");
    logger.info("User logged out", { userId: req.user?.sub });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function logoutAll(req, res, next) {
  try {
    await prisma.refreshToken.deleteMany({
      where: { userId: req.user.sub },
    });
    res.clearCookie("refreshToken");
    logger.info("All sessions revoked", { userId: req.user.sub });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, me, logoutAll };
