const express = require("express");
const {
  createGameController,
  getGameController,
  makeMoveController,
} = require("../controllers/chessController");

const router = express.Router();

router.post("/create", createGameController);
router.get("/:id", getGameController);
router.post("/:id/move", makeMoveController);

module.exports = router;

