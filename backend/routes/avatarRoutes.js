const uploadAvatar = require("../controllers/avatarController");
const authenticate = require("../middleware/authMiddleware");
const upload = require("../utils/upload");
const express = require("express");
const router = express.Router();

router.post("/", authenticate, upload.single("avatar"), uploadAvatar);

module.exports = router;
