const { loginUser } = require("../services/authService");
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

async function login(req, res, next) {
  try {
    const { accessToken, refreshToken } = await loginUser({
      username: req.body.username,
      password: req.body.password,
      userAgent: req.headers["user-agent"],
      ip: getClientIP(req),
    });

    res.cookie("accessToken", accessToken, accessCookieOptions);
    res
      .cookie("refreshToken", refreshToken, refreshCookieOptions)
      .json({ msg: "Logged in successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = login;