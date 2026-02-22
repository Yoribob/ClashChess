const { getDb } = require("../config/db");
const { hashPassword } = require("../utils/password");
const { signAccessToken, signRefreshToken } = require("../utils/jwt");

async function registerUser({ username, password, email, userAgent, ip }) {
  const usernameOriginal = (username || "").trim();
  username = usernameOriginal.toLowerCase();
  email = email ? email.toLowerCase().trim() : null;

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const err = new Error("Invalid email format");
      err.code = "INVALID_EMAIL";
      throw err;
    }
  }

  const db = getDb();
  const users = db.collection("users");

  const usernameExists = await users.findOne({ username });
  if (usernameExists) {
    const err = new Error("Username already taken");
    err.code = "USER_EXISTS";
    throw err;
  }

  if (email) {
    const emailExists = await users.findOne({ email });
    if (emailExists) {
      const err = new Error("Email already in use");
      err.code = "EMAIL_EXISTS";
      throw err;
    }
  }

  const hashed = await hashPassword(password);
  const result = await users.insertOne({
    username,
    usernameOriginal,
    email,
    password: hashed,
    createdAt: new Date(),
    avatar: null,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    ranking: 1500,
    settings: {},
  });

  const userId = result.insertedId.toString();
  const accessToken = signAccessToken({ userId, username });
  const refreshToken = signRefreshToken({ userId, username });

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

module.exports = registerUser;
