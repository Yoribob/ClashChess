const { getDb } = require("../config/db");
const path = require("path");
const fs = require("fs");

async function uploadAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const db = getDb();
    const users = db.collection("users");
    const userId = req.user.userId;

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const { ObjectId } = require("mongodb");

    const user = await users.findOne({ _id: new ObjectId(userId) });
    const oldAvatarPath = user?.avatar;

    await users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { avatar: avatarUrl } }
    );

    if (oldAvatarPath && oldAvatarPath.startsWith("/uploads/avatars/")) {
      const rel = oldAvatarPath.replace(/^\//, "");
      const oldFilePath = path.join(__dirname, "..", rel);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    const fullUrl = `${req.protocol}://${req.get("host")}${avatarUrl}`;
    res.json({ msg: "Avatar uploaded successfully", avatarUrl, fullUrl });
  } catch (err) {
    console.error("Avatar upload error:", err);
    if (req.file) {
      const filePath = path.join(
        __dirname,
        "../uploads/avatars",
        req.file.filename
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(500).json({ msg: "Failed to upload avatar" });
  }
}

module.exports = uploadAvatar;
