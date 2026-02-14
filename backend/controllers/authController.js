const { loginUser } = require("../services/authService");
const getClientIP = require("../utils/ip");

async function login(req, res) {
  try {
    const { accessToken, refreshToken } = await loginUser({
      username: req.body.username,
      password: req.body.password,
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
      .json({ msg: "Logged in successfully" });
  } catch (err) {
    if (err.code === "LOGIN_FAILED")
      return res.status(401).json({ msg: "Login or password is incorrect" });
    res.sendStatus(500);
  }
}

module.exports = login;
