const registerUser = require("../services/regService");
const getClientIP = require("../utils/ip");

async function register(req, res) {
  try {
    const { accessToken, refreshToken } = await registerUser({
      username: req.body.username,
      password: req.body.password,
      email: req.body.email,
      userAgent: req.headers["user-agent"],
      ip: getClientIP(req),
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 15 * 60 * 1000,
      path: "/",
    });
    res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      })
      .json({ msg: "Registered successfully" });
  } catch (err) {
    if (err.code === "USER_EXISTS")
      return res.status(409).json({ msg: "Username already taken" });
    if (err.code === "EMAIL_EXISTS")
      return res.status(409).json({ msg: "Email already in use" });
    if (err.code === "INVALID_EMAIL")
      return res.status(400).json({ msg: "Invalid email format" });
    res.sendStatus(500);
  }
}

module.exports = register;
