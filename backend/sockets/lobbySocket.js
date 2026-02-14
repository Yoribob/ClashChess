const { getDb } = require("../config/db");
const { ObjectId } = require("mongodb");

function serializePlayers(players) {
  if (!players || !Array.isArray(players)) return [];
  return players.map((p) => ({
    userId: p.userId?.toString?.() || p.userId,
    _id: p.userId?.toString?.() || p.userId,
    username: p.username,
    ready: p.ready ?? false,
    avatar: p.avatar || null,
  }));
}

function lobbySocket(io) {
  const db = getDb();
  const lobbies = db.collection("lobbies");

  io.on("connection", (socket) => {
    console.log("User connected", socket.id);
    console.log("Number of sockets connected:", io.sockets.sockets.size);

    socket.lobbiesJoined = new Set();

    socket.on("lobby:create", async (data) => {
      try {
        const { lobbyId, userId } = data;

        if (!lobbyId || !userId) {
          socket.emit("lobby:error", {
            message: "Missing lobbyId or userId",
            event: "lobby:create",
          });
          return;
        }

        const lobby = await lobbies.findOne({ LobbyId: lobbyId });
        if (!lobby) {
          socket.emit("lobby:error", {
            message: "Lobby not found",
            event: "lobby:create",
          });
          return;
        }

        await lobbies.updateOne(
          { LobbyId: lobbyId, "players.userId": new ObjectId(userId) },
          { $set: { "players.$.socketId": socket.id } }
        );

        socket.join(lobbyId);
        socket.lobbiesJoined.add(lobbyId);

        const updatedLobby = await lobbies.findOne({ LobbyId: lobbyId });
        const usersList = serializePlayers(updatedLobby?.players || []);

        io.to(lobbyId).emit("lobby:update", {
          lobbyId,
          users: usersList,
          action: "created",
          userId,
        });

        console.log(`Lobby ${lobbyId} created by user ${userId}`);
      } catch (error) {
        console.error("Error in lobby:create:", error);
        socket.emit("lobby:error", {
          message: error.message || "Failed to create lobby",
          event: "lobby:create",
        });
      }
    });

    socket.on("lobby:join", async (data) => {
      try {
        const { lobbyId, userId } = data;

        if (!lobbyId || !userId) {
          socket.emit("lobby:error", {
            message: "Missing lobbyId or userId",
            event: "lobby:join",
          });
          return;
        }

        const lobbyIdNorm = String(lobbyId).trim().toUpperCase();
        const lobby = await lobbies.findOne({ LobbyId: lobbyIdNorm });
        if (!lobby) {
          socket.emit("lobby:error", {
            message: "Lobby not found",
            event: "lobby:join",
          });
          return;
        }

        const userIdStr = String(userId);
        const userInLobby = lobby.players?.some(
          (p) => p.userId.toString() === userIdStr
        );
        if (!userInLobby) {
          socket.emit("lobby:error", {
            message: "User not found in lobby",
            event: "lobby:join",
          });
          return;
        }

        await lobbies.updateOne(
          { LobbyId: lobbyIdNorm, "players.userId": new ObjectId(userIdStr) },
          { $set: { "players.$.socketId": socket.id } }
        );

        socket.join(lobbyIdNorm);
        socket.lobbiesJoined.add(lobbyIdNorm);

        const updatedLobby = await lobbies.findOne({ LobbyId: lobbyIdNorm });
        const usersList = serializePlayers(updatedLobby?.players || []);

        io.to(lobbyIdNorm).emit("lobby:update", {
          lobbyId: lobbyIdNorm,
          users: usersList,
          action: "joined",
          userId: userIdStr,
        });

        console.log(`User ${userIdStr} joined lobby ${lobbyIdNorm}`);
      } catch (error) {
        console.error("Error in lobby:join:", error);
        socket.emit("lobby:error", {
          message: error.message || "Failed to join lobby",
          event: "lobby:join",
        });
      }
    });

    socket.on("lobby:ready", async (data) => {
      try {
        const { lobbyId, userId, ready } = data;

        if (!lobbyId || !userId || typeof ready !== "boolean") {
          socket.emit("lobby:error", {
            message: "Missing lobbyId, userId, or ready status",
            event: "lobby:ready",
          });
          return;
        }

        const lobby = await lobbies.findOne({ LobbyId: lobbyId });
        if (!lobby) {
          socket.emit("lobby:error", {
            message: "Lobby not found",
            event: "lobby:ready",
          });
          return;
        }

        await lobbies.updateOne(
          { LobbyId: lobbyId, "players.userId": new ObjectId(userId) },
          { $set: { "players.$.ready": ready } }
        );

        const updatedLobby = await lobbies.findOne({ LobbyId: lobbyId });
        const usersList = serializePlayers(updatedLobby?.players || []);

        io.to(lobbyId).emit("lobby:update", {
          lobbyId,
          users: usersList,
          action: "ready",
          userId,
          ready,
        });

        console.log(
          `User ${userId} ${ready ? "ready" : "not ready"} in lobby ${lobbyId}`
        );
      } catch (error) {
        console.error("Error in lobby:ready:", error);
        socket.emit("lobby:error", {
          message: error.message || "Failed to update ready status",
          event: "lobby:ready",
        });
      }
    });

    socket.on("lobby:leave", async (data) => {
      try {
        const { lobbyId, userId } = data;

        if (!lobbyId) {
          socket.emit("lobby:error", {
            message: "Missing lobbyId",
            event: "lobby:leave",
          });
          return;
        }

        const lobby = await lobbies.findOne({ LobbyId: lobbyId });
        if (!lobby || !lobby.players) return;

        if (userId) {
          const userIdObj = new ObjectId(userId);
          const updatedPlayers = lobby.players.filter((p) => {
            if (p.userId instanceof ObjectId) {
              return !p.userId.equals(userIdObj);
            }
            return p.userId?.toString() !== userId;
          });

          await lobbies.updateOne(
            { LobbyId: lobbyId },
            { $set: { players: updatedPlayers } }
          );

          socket.leave(lobbyId);
          socket.lobbiesJoined.delete(lobbyId);

          io.to(lobbyId).emit("lobby:update", {
            lobbyId,
            users: serializePlayers(updatedPlayers),
            action: "left",
            userId,
          });

          console.log(`User ${userId} left lobby ${lobbyId}`);
        } else {
          const updatedPlayers = lobby.players.map((player) => {
            if (player.socketId === socket.id) {
              const { socketId, ...playerWithoutSocket } = player;
              return playerWithoutSocket;
            }
            return player;
          });

          await lobbies.updateOne(
            { LobbyId: lobbyId },
            { $set: { players: updatedPlayers } }
          );

          socket.leave(lobbyId);
          socket.lobbiesJoined.delete(lobbyId);

          io.to(lobbyId).emit("lobby:update", {
            lobbyId,
            users: serializePlayers(updatedPlayers),
            action: "left",
            socketId: socket.id,
          });

          console.log(`Socket ${socket.id} left lobby ${lobbyId}`);
        }
      } catch (error) {
        console.error("Error in lobby:leave:", error);
        socket.emit("lobby:error", {
          message: error.message || "Failed to leave lobby",
          event: "lobby:leave",
        });
      }
    });

    socket.on("disconnect", async () => {
      console.log("User disconnected", socket.id);
      console.log("Number of sockets connected:", io.sockets.sockets.size);

      try {
        for (const lobbyId of socket.lobbiesJoined) {
          const lobby = await lobbies.findOne({ LobbyId: lobbyId });
          if (!lobby || !lobby.players) continue;

          const updatedPlayers = lobby.players.map((player) => {
            if (player.socketId === socket.id) {
              const { socketId, ...playerWithoutSocket } = player;
              return playerWithoutSocket;
            }
            return player;
          });

          await lobbies.updateOne(
            { LobbyId: lobbyId },
            { $set: { players: updatedPlayers } }
          );

          io.to(lobbyId).emit("lobby:update", {
            lobbyId,
            users: serializePlayers(updatedPlayers),
            action: "left",
            socketId: socket.id,
          });

          console.log(`Socket ${socket.id} left lobby ${lobbyId}`);
        }
      } catch (error) {
        console.error("Error handling disconnect:", error);
      }
    });
  });
}

module.exports = { lobbySocket };
