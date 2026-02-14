const {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
} = require("../utils/jwt");
const { getDb } = require("../config/db");
const getClientIP = require("../utils/ip");

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

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 15 * 60 * 1000,
      path: "/",
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({ msg: "Tokens refreshed" });
  } catch (err) {
    return res.status(401).json({ msg: "Invalid or expired refresh token" });
  }
}

module.exports = refreshAccessToken;
