const registerUser = require("../services/regService");
const getClientIP = require("../utils/ip");

const accessCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  maxAge: 15 * 60 * 1000,
  path: "/",
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

async function register(req, res, next) {
  try {
    const { accessToken, refreshToken } = await registerUser({
      username: req.body.username,
      usernameOriginal: req.body.usernameOriginal,
      password: req.body.password,
      email: req.body.email,
      userAgent: req.headers["user-agent"],
      ip: getClientIP(req),
    });

    res.cookie("accessToken", accessToken, accessCookieOptions);
    res
      .cookie("refreshToken", refreshToken, refreshCookieOptions)
      .json({ msg: "Registered successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = register;
