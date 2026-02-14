const { getDb } = require("../config/db");
const { comparePassword } = require("../utils/password");
const { signAccessToken, signRefreshToken } = require("../utils/jwt");

async function loginUser({ username, password, userAgent, ip }) {
  const db = getDb();
  const users = db.collection("users");

  const user = await users.findOne({ username });
  if (!user) {
    const err = new Error("Login or password is incorrect");
    err.code = "LOGIN_FAILED";
    throw err;
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    const err = new Error("Login or password is incorrect");
    err.code = "LOGIN_FAILED";
    throw err;
  }

  const accessToken = signAccessToken({
    userId: user._id.toString(),
    username: user.username,
  });
  const refreshToken = signRefreshToken({
    userId: user._id.toString(),
    username: user.username,
  });

  await db
    .collection("refreshTokens")
    .updateOne(
      { userId: user._id.toString() },
      {
        $set: {
          token: refreshToken,
          createdAt: new Date(),
          device: userAgent,
          ip,
        },
      },
      { upsert: true }
    );

  return { accessToken, refreshToken };
}

module.exports = { loginUser };
