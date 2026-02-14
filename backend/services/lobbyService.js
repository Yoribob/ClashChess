const { getDb } = require("../config/db");
const { generateCode } = require("../utils/generateCode");
const { ObjectId } = require("mongodb");

async function createLobby(userId) {
  const db = getDb();
  const users = db.collection("users");

  const user = await users.findOne({ _id: new ObjectId(userId) });
  if (!user) throw new Error("User not found");

  const lobbies = db.collection("lobbies");
  const lobbyCode = generateCode();

  const players = [
    {
      userId: user._id,
      username: user.username,
      avatar: user.avatar || null,
      ready: false,
    },
  ];

  await lobbies.insertOne({
    LobbyId: lobbyCode,
    createdBy: user._id,
    createdAt: new Date(),
    players,
  });

  return {
    lobbyId: lobbyCode,
    players,
  };
}

async function joinLobby(lobbyId, userId) {
  const db = getDb();
  const users = db.collection("users");

  const user = await users.findOne({ _id: new ObjectId(userId) });
  if (!user) throw new Error("User not found");

  const lobbies = db.collection("lobbies");
  const lobbyIdNorm = String(lobbyId).trim().toUpperCase();
  const lobby = await lobbies.findOne({ LobbyId: lobbyIdNorm });
  if (!lobby) throw new Error("Lobby not found");

  if (lobby.players.some((p) => p.userId.equals(user._id))) {
    throw new Error("User already in the lobby");
  }
  if (lobby.players.length >= 2) {
    throw new Error("Lobby is full");
  }

  await lobbies.updateOne(
    { LobbyId: lobbyIdNorm },
    {
      $push: {
        players: {
          userId: user._id,
          username: user.username,
          avatar: user.avatar || null,
          ready: false,
        },
      },
    }
  );

  const updatedLobby = await lobbies.findOne(
    { LobbyId: lobbyIdNorm },
    { projection: { _id: 0, players: 1 } }
  );

  return updatedLobby.players;
}

module.exports = { createLobby, joinLobby };
