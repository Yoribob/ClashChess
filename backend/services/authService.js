const { getDb } = require("../config/db");
const { comparePassword } = require("../utils/password");
const { signAccessToken, signRefreshToken } = require("../utils/jwt");

function throwValidation(message, code) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

async function loginUser({ username, password, userAgent, ip }) {
  const db = getDb();
  const users = db.collection("users");

  const user = await users.findOne({ username });
  if (!user) throwValidation("Login or password is incorrect", "LOGIN_FAILED");

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) throwValidation("Login or password is incorrect", "LOGIN_FAILED");

  const userId = user._id.toString();
  const accessToken = signAccessToken({ userId, username: user.username });
  const refreshToken = signRefreshToken({ userId, username: user.username });

  await db.collection("refreshTokens").updateOne(
    { userId },
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