const { getDb } = require("../config/db");

async function getMe(req, res) {
  try {
    const db = getDb();
    const users = db.collection("users");
    const { ObjectId } = require("mongodb");
    const user = await users.findOne({
      _id: new ObjectId(req.user.userId),
    });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({
      msg: "Protected user information",
      user: {
        _id: user._id.toString(),
        id: user._id.toString(),
        username: user.username,
        usernameOriginal: user.usernameOriginal ?? user.username,
        email: user.email,
        avatar: user.avatar || null,
        gamesPlayed: user.gamesPlayed || 0,
        gamesWon: user.gamesWon || 0,
        gamesLost: user.gamesLost || 0,
        ranking: user.ranking || 1500,
      },
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ msg: "Failed to get user information" });
  }
}

module.exports = getMe;
