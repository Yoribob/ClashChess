const getMe = require("../controllers/userController");
const authenticate = require("../middleware/authMiddleware");
const express = require("express");
const router = express.Router();

router.get("/me", authenticate, getMe);

module.exports = router;
