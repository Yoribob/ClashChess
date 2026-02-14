const { createLobby } = require("../services/lobbyService");

async function LobbyCreate(req, res) {
  try {
    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({ msg: "No userId provided" });
    }
    const { lobbyId, players } = await createLobby(userId);

    return res
      .status(200)
      .json({ msg: "Lobby successfully created", lobbyID: lobbyId, players });
  } catch (err) {
    return res.status(400).json({
      msg: "Error during lobby creation",
      error: err.message,
    });
  }
}

module.exports = { LobbyCreate };
