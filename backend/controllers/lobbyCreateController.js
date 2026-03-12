const { createLobby } = require("../services/lobbyService");

async function LobbyCreate(req, res) {
  try {
    const userId = req.body.userId;
    const settings = req.body.settings || null;
    const pieceColor = req.body.pieceColor || null;
    if (!userId) {
      return res.status(400).json({ msg: "No userId provided" });
    }
    const { lobbyId, players, settings: storedSettings } = await createLobby(
      userId,
      settings,
      pieceColor
    );

    return res.status(200).json({
      msg: "Lobby successfully created",
      lobbyID: lobbyId,
      players,
      settings: storedSettings,
    });
  } catch (err) {
    return res.status(400).json({
      msg: "Error during lobby creation",
      error: err.message,
    });
  }
}

module.exports = { LobbyCreate };
