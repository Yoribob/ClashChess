const { getDb } = require("../config/db");
const { hashPassword } = require("../utils/password");
const { signAccessToken, signRefreshToken } = require("../utils/jwt");

function throwValidation(message, code) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

async function registerUser({ username, usernameOriginal: bodyUsernameOriginal, password, email, userAgent, ip }) {
  const usernameOriginal = (bodyUsernameOriginal != null && String(bodyUsernameOriginal).trim() !== ""
    ? String(bodyUsernameOriginal).trim()
    : (username || "").trim());
  username = usernameOriginal.toLowerCase();
  email = email ? email.toLowerCase().trim() : null;

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throwValidation("Invalid email format", "INVALID_EMAIL");
    }
  }

  if (username.length > 32) throwValidation("Username is too long", "INVALID_USERNAME");
  if (username.length < 4) throwValidation("Username is too short", "INVALID_USERNAME");
  if (/\s/.test(username)) throwValidation("Username must not contain whitespaces", "INVALID_USERNAME");

  if (password.length > 32) throwValidation("Password is too long", "INVALID_PASSWORD");
  if (password.length < 6) throwValidation("Password is too short", "INVALID_PASSWORD");
  if (/\s/.test(password)) throwValidation("Password must not contain whitespaces", "INVALID_PASSWORD");

  const db = getDb();
  const users = db.collection("users");

  const usernameExists = await users.findOne({ username });
  if (usernameExists) throwValidation("Username already taken", "USER_EXISTS");

  if (email) {
    const emailExists = await users.findOne({ email });
    if (emailExists) throwValidation("Email already in use", "EMAIL_EXISTS");
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