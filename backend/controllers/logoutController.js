const { getDb } = require("../config/db");

async function logout(req, res) {
  const db = getDb();
  const refreshTokens = db.collection("refreshTokens");
  const token = req.cookies.refreshToken;
  if (token) await refreshTokens.deleteOne({ token });
  res
    .clearCookie("accessToken", {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      path: "/",
    })
    .clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      path: "/",
    })
    .json({ msg: "Logged out successfully" });
}

module.exports = logout;
