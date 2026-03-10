const {
  createChessGame,
  getChessGame,
  makeMove,
} = require("../services/chessService");

async function createGameController(req, res) {
  try {
    const white = req.body.white;
    const black = req.body.black;

    if (!white || !black) {
      return res
        .status(400)
        .json({ msg: "Both white and black player IDs are required" });
    }

    const game = await createChessGame(white, black);

    return res.status(201).json({
      msg: "Game successfully created",
      game,
    });
  } catch (err) {
    return res.status(400).json({
      msg: "Error during game creation",
      error: err.message,
    });
  }
}

async function getGameController(req, res) {
  try {
    const gameId = req.params.id;
    if (!gameId) {
      return res.status(400).json({ msg: "No game id provided" });
    }

    const game = await getChessGame(gameId);

    return res.status(200).json({
      msg: "Game fetched",
      game,
    });
  } catch (err) {
    return res.status(404).json({
      msg: "Error fetching game",
      error: err.message,
    });
  }
}

async function makeMoveController(req, res) {
  try {
    const gameId = req.params.id;
    const { from, to, promotion } = req.body || {};

    if (!gameId) {
      return res.status(400).json({ msg: "No game id provided" });
    }
    if (!from || !to) {
      return res.status(400).json({ msg: "Move must include 'from' and 'to'" });
    }

    const move = { from, to };
    if (promotion) move.promotion = promotion;

    const result = await makeMove(gameId, move);
    if (!result.ok) {
      return res.status(400).json({
        msg: "Illegal move",
        reason: result.reason,
        game: result.game,
      });
    }

    return res.status(200).json({
      msg: "Move applied",
      game: result.game,
    });
  } catch (err) {
    return res.status(400).json({
      msg: "Error applying move",
      error: err.message,
    });
  }
}

module.exports = {
  createGameController,
  getGameController,
  makeMoveController,
};

