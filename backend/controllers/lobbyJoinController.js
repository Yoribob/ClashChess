const { joinLobby } = require("../services/lobbyService");

function serializePlayers(players) {
  if (!players || !Array.isArray(players)) return [];
  return players.map((p) => ({
    userId: p.userId?.toString?.() || p.userId,
    username: p.username ?? null,
    ready: p.ready ?? false,
    avatar: p.avatar ?? null,
  }));
}

async function LobbyJoin(req, res) {
  try {
    const userId = req.body.userId;
    let lobbyId = req.body.lobbyId || req.body.lobbyID;
    if (!userId) {
      return res.status(400).json({ msg: "No userId provided" });
    }
    if (!lobbyId) {
      return res.status(400).json({ msg: "No lobbyId provided" });
    }
    lobbyId = String(lobbyId).trim().toUpperCase();

    const players = await joinLobby(lobbyId, userId);
    const serialized = serializePlayers(players);

    const lobby = {
      lobbyId,
      host: serialized[0] || null,
      guest: serialized[1] || null,
      players: serialized,
    };

    return res.status(200).json({
      msg: "Successfully joined lobby",
      LobbyId: lobbyId,
      players: serialized,
      lobby,
    });
  } catch (err) {
    return res.status(400).json({
      msg: "Error during lobby joining",
      error: err.message,
    });
  }
}

module.exports = { LobbyJoin };
