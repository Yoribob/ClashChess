const { getDb } = require("../config/db");
const { ObjectId } = require("mongodb");

function serializePlayers(players) {
  if (!players || !Array.isArray(players)) return [];
  return players.map((p) => ({
    userId: p.userId?.toString() || p.userId,
    _id: p.userId?.toString() || p.userId,
    username: p.username,
    usernameOriginal: p.usernameOriginal ?? p.username ?? null,
    ready: p.ready ?? false,
    avatar: p.avatar || null,
  }));
}

function lobbySocket(io) {
  const db = getDb();
  const lobbies = db.collection("lobbies");

  io.on("connection", (socket) => {
    console.log("User connected", socket.id);
    socket.lobbiesJoined = new Set();

    // --------------------- CREATE LOBBY ---------------------
    socket.on("lobby:create", async (data) => {
      try {
        const { lobbyId, userId } = data;
        if (!lobbyId || !userId) throw new Error("Missing lobbyId or userId");

        const lobby = await lobbies.findOne({ LobbyId: lobbyId });
        if (!lobby) throw new Error("Lobby not found");

        await lobbies.updateOne(
          { LobbyId: lobbyId, "players.userId": new ObjectId(userId) },
          { $set: { "players.$.socketId": socket.id } }
        );

        socket.join(lobbyId);
        socket.lobbiesJoined.add(lobbyId);

        const updatedLobby = await lobbies.findOne({ LobbyId: lobbyId });
        io.to(lobbyId).emit("lobby:update", {
          lobbyId,
          users: serializePlayers(updatedLobby.players),
          action: "created",
          userId,
        });

        console.log(`Lobby ${lobbyId} created by user ${userId}`);
      } catch (error) {
        console.error("Error in lobby:create:", error);
        socket.emit("lobby:error", { message: error.message, event: "lobby:create" });
      }
    });

    // --------------------- JOIN LOBBY ---------------------
    socket.on("lobby:join", async (data) => {
      try {
        const { lobbyId, userId } = data;
        if (!lobbyId || !userId) throw new Error("Missing lobbyId or userId");

        const lobbyIdNorm = String(lobbyId).trim().toUpperCase();
        const lobby = await lobbies.findOne({ LobbyId: lobbyIdNorm });
        if (!lobby) throw new Error("Lobby not found");

        const userIdStr = String(userId);
        const userInLobby = lobby.players?.some((p) => p.userId.toString() === userIdStr);
        if (!userInLobby) throw new Error("User not found in lobby");

        await lobbies.updateOne(
          { LobbyId: lobbyIdNorm, "players.userId": new ObjectId(userIdStr) },
          { $set: { "players.$.socketId": socket.id } }
        );

        socket.join(lobbyIdNorm);
        socket.lobbiesJoined.add(lobbyIdNorm);

        const updatedLobby = await lobbies.findOne({ LobbyId: lobbyIdNorm });
        io.to(lobbyIdNorm).emit("lobby:update", {
          lobbyId: lobbyIdNorm,
          users: serializePlayers(updatedLobby.players),
          action: "joined",
          userId: userIdStr,
        });

        console.log(`User ${userIdStr} joined lobby ${lobbyIdNorm}`);
      } catch (error) {
        console.error("Error in lobby:join:", error);
        socket.emit("lobby:error", { message: error.message, event: "lobby:join" });
      }
    });

    // --------------------- READY ---------------------
    socket.on("lobby:ready", async (data) => {
      try {
        const { lobbyId, userId, ready } = data;
        if (!lobbyId || !userId || typeof ready !== "boolean") throw new Error("Invalid data");

        const lobby = await lobbies.findOne({ LobbyId: lobbyId });
        if (!lobby) throw new Error("Lobby not found");

        await lobbies.updateOne(
          { LobbyId: lobbyId, "players.userId": new ObjectId(userId) },
          { $set: { "players.$.ready": ready } }
        );

        const updatedLobby = await lobbies.findOne({ LobbyId: lobbyId });
        io.to(lobbyId).emit("lobby:update", {
          lobbyId,
          users: serializePlayers(updatedLobby.players),
          action: "ready",
          userId,
          ready,
        });

        console.log(`User ${userId} is now ${ready ? "ready" : "not ready"} in lobby ${lobbyId}`);
      } catch (error) {
        console.error("Error in lobby:ready:", error);
        socket.emit("lobby:error", { message: error.message, event: "lobby:ready" });
      }
    });

    // --------------------- LEAVE ---------------------
    socket.on("lobby:leave", async (data) => {
      try {
        const { lobbyId, userId } = data;
        if (!lobbyId) throw new Error("Missing lobbyId");

        const lobby = await lobbies.findOne({ LobbyId: lobbyId });
        if (!lobby || !lobby.players) return;

        let updatedPlayers;
        if (userId) {
          const userIdObj = new ObjectId(userId);
          updatedPlayers = lobby.players.filter(p => {
            if (p.userId instanceof ObjectId) return !p.userId.equals(userIdObj);
            return p.userId?.toString() !== userId;
          });
        } else {
          updatedPlayers = lobby.players.filter(p => p.socketId !== socket.id);
        }

        if (updatedPlayers.length === 0) {
          await lobbies.deleteOne({ LobbyId: lobbyId });
          console.log(`Lobby ${lobbyId} deleted because it became empty`);
        } else {
          await lobbies.updateOne({ LobbyId: lobbyId }, { $set: { players: updatedPlayers } });
          io.to(lobbyId).emit("lobby:update", {
            lobbyId,
            users: serializePlayers(updatedPlayers),
            action: "left",
            userId: userId || null,
            socketId: userId ? null : socket.id,
          });
        }

        socket.leave(lobbyId);
        socket.lobbiesJoined.delete(lobbyId);
        console.log(`User ${userId || socket.id} left lobby ${lobbyId}`);
      } catch (error) {
        console.error("Error in lobby:leave:", error);
        socket.emit("lobby:error", { message: error.message, event: "lobby:leave" });
      }
    });

    // --------------------- DISCONNECT ---------------------
    socket.on("disconnect", async () => {
      console.log("User disconnected", socket.id);

      try {
        for (const lobbyId of socket.lobbiesJoined) {
          const lobby = await lobbies.findOne({ LobbyId: lobbyId });
          if (!lobby || !lobby.players) continue;

          const updatedPlayers = lobby.players.filter(p => p.socketId !== socket.id);

          if (updatedPlayers.length === 0) {
            await lobbies.deleteOne({ LobbyId: lobbyId });
            console.log(`Lobby ${lobbyId} deleted on disconnect`);
          } else {
            await lobbies.updateOne({ LobbyId: lobbyId }, { $set: { players: updatedPlayers } });
            io.to(lobbyId).emit("lobby:update", {
              lobbyId,
              users: serializePlayers(updatedPlayers),
              action: "left",
              socketId: socket.id,
            });
          }

          socket.lobbiesJoined.delete(lobbyId);
        }
      } catch (error) {
        console.error("Error handling disconnect:", error);
      }
    });
  });
}

module.exports = { lobbySocket };