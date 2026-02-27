const { joinLobby } = require("../services/lobbyService");

function serializePlayers(players) {
  if (!players || !Array.isArray(players)) return [];
  return players.map((p) => ({
    userId: p.userId?.toString?.() || p.userId,
    username: p.username ?? null,
    usernameOriginal: p.usernameOriginal ?? p.username ?? null,
    ready: p.ready ?? false,
    avatar: p.avatar ?? null,
  }));
}

async function LobbyJoin(req, res, next) {
  try {
    const userId = req.body.userId;
    let lobbyId = req.body.lobbyId || req.body.lobbyID;

    if (!userId) throw Object.assign(new Error("No userId provided"), { code: "MISSING_USERID" });
    if (!lobbyId) throw Object.assign(new Error("No lobbyId provided"), { code: "MISSING_LOBBYID" });

    lobbyId = String(lobbyId).trim().toUpperCase();

    const players = await joinLobby(lobbyId, userId);
    const serialized = serializePlayers(players);

    const lobby = {
      lobbyId,
      host: serialized[0] || null,
      guest: serialized[1] || null,
      players: serialized,
    };

    res.status(200).json({
      msg: "Successfully joined lobby",
      LobbyId: lobbyId,
      players: serialized,
      lobby,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { LobbyJoin };