const {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
} = require("../utils/jwt");
const { getDb } = require("../config/db");
const getClientIP = require("../utils/ip");

const isProd = process.env.NODE_ENV === "production";

const accessCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "None" : "Lax",
  maxAge: 15 * 60 * 1000,
  path: "/",
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "None" : "Lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

async function refreshAccessToken(req, res) {
  try {
    const db = getDb();
    const token = req.cookies.refreshToken;
    if (!token)
      return res.status(401).json({ msg: "No refresh token provided" });

    const payload = verifyRefreshToken(token);

    const newAccessToken = signAccessToken({
      userId: payload.userId,
      username: payload.username,
    });
    const newRefreshToken = signRefreshToken({
      userId: payload.userId,
      username: payload.username,
    });

    await db
      .collection("refreshTokens")
      .updateOne(
        { userId: payload.userId },
        {
          $set: {
            token: newRefreshToken,
            createdAt: new Date(),
            device: req.headers["user-agent"],
            ip: getClientIP(req),
          },
        },
        { upsert: true }
      );

    res.cookie("accessToken", newAccessToken, accessCookieOptions);

    res.cookie("refreshToken", newRefreshToken, refreshCookieOptions);

    res.json({ msg: "Tokens refreshed" });
  } catch (err) {
    return res.status(401).json({ msg: "Invalid or expired refresh token" });
  }
}

module.exports = refreshAccessToken;
