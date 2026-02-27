const { createLobby } = require("../services/lobbyService");

async function LobbyCreate(req, res, next) {
  try {
    const userId = req.body.userId;
    if (!userId) {
      const err = new Error("No userId provided");
      err.code = "MISSING_USERID";
      throw err;
    }

    const { lobbyId, players } = await createLobby(userId);

    res.status(200).json({
      msg: "Lobby successfully created",
      lobbyID: lobbyId,
      players,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { LobbyCreate };