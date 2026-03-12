const { getDb } = require("../config/db");
const { ObjectId } = require("mongodb");
const {
  createChessGame,
  makeMove,
  getChessGame,
  endGameAsTimeout,
} = require("../services/chessService");

const gameClocks = new Map();

function initClockForGame(gameId, timeMinutes) {
  const baseMs = Math.max(1, Number(timeMinutes) || 5) * 60 * 1000;
  gameClocks.set(String(gameId), {
    whiteMs: baseMs,
    blackMs: baseMs,
    running: "white",
    lastAtMs: Date.now(),
  });
  return gameClocks.get(String(gameId));
}

function tickClock(gameId, runningColor) {
  const key = String(gameId);
  const st = gameClocks.get(key);
  if (!st) return null;
  const now = Date.now();
  const elapsed = Math.max(0, now - (st.lastAtMs || now));
  st.lastAtMs = now;
  st.running = runningColor;
  if (runningColor === "white") st.whiteMs = Math.max(0, st.whiteMs - elapsed);
  else st.blackMs = Math.max(0, st.blackMs - elapsed);
  gameClocks.set(key, st);
  return st;
}

function serializePlayers(players) {
  if (!players || !Array.isArray(players)) return [];
  return players.map((p) => ({
    userId: p.userId?.toString?.() || p.userId,
    _id: p.userId?.toString?.() || p.userId,
    username: p.username,
    usernameOriginal: p.usernameOriginal ?? p.username ?? null,
    ready: p.ready ?? false,
    avatar: p.avatar || null,
    pieceColor: p.pieceColor ?? null,
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
          { $set: { "players.$.socketId": socket.id } },
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
          (p) => p.userId.toString() === userIdStr,
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
          { $set: { "players.$.socketId": socket.id } },
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
          { $set: { "players.$.ready": ready } },
        );

        const updatedLobby = await lobbies.findOne({ LobbyId: lobbyId });
        const usersList = serializePlayers(updatedLobby?.players || []);

        io.to(lobbyId).emit("lobby:update", {
          lobbyId,
          users: usersList,
          action: "ready",
          userId,
          ready,
          settings: updatedLobby?.settings || null,
        });

        console.log(
          `User ${userId} ${ready ? "ready" : "not ready"} in lobby ${lobbyId}`,
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
            { $set: { players: updatedPlayers } },
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
            { $set: { players: updatedPlayers } },
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

    socket.on("chess:restartReady", async (data = {}) => {
      try {
        const { lobbyId, userId, ready } = data;

        if (!lobbyId || !userId || typeof ready !== "boolean") {
          socket.emit("lobby:error", {
            message: "Missing lobbyId, userId, or ready flag",
            event: "chess:restartReady",
          });
          return;
        }

        const lobby = await lobbies.findOne({ LobbyId: lobbyId });
        if (
          !lobby ||
          !Array.isArray(lobby.players) ||
          lobby.players.length === 0
        ) {
          socket.emit("lobby:error", {
            message: "Lobby not found or has no players",
            event: "chess:restartReady",
          });
          return;
        }

        const userIdObj = new ObjectId(userId);

        await lobbies.updateOne(
          { LobbyId: lobbyId, "players.userId": userIdObj },
          { $set: { "players.$.restartReady": ready } },
        );

        const updatedLobby = await lobbies.findOne({ LobbyId: lobbyId });
        const players = updatedLobby?.players || [];
        const totalPlayers = players.length;
        const readyPlayers = players.filter((p) => p.restartReady).length;

        io.to(lobbyId).emit("chess:restartUpdate", {
          lobbyId,
          totalPlayers,
          readyPlayers,
        });

        if (totalPlayers < 2 || readyPlayers !== totalPlayers) {
          return;
        }

        const whitePlayer = players[0];
        const blackPlayer = players[1];
        const whiteId = whitePlayer.userId.toString();
        const blackId = blackPlayer.userId.toString();

        const newGame = await createChessGame(whiteId, blackId);

        const playersReset = players.map((p) => ({
          ...p,
          ready: false,
          restartReady: false,
        }));

        const previousGameId = updatedLobby.gameId
          ? updatedLobby.gameId.toString()
          : null;

        await lobbies.updateOne(
          { LobbyId: lobbyId },
          {
            $set: {
              players: playersReset,
              gameId: new ObjectId(newGame._id),
              gameCreatedAt: new Date(),
            },
          },
        );

        if (previousGameId) {
          gameClocks.delete(String(previousGameId));
        }
        const pieceColors = {
          white: whitePlayer.pieceColor ?? null,
          black: blackPlayer.pieceColor ?? null,
        };

        const clock = initClockForGame(
          newGame._id,
          updatedLobby?.settings?.timeMinutes ?? 5,
        );

        io.to(lobbyId).emit("chess:start", {
          lobbyId,
          gameId: newGame._id,
          game: newGame,
          settings: updatedLobby?.settings || null,
          pieceColors,
          clock,
        });
      } catch (error) {
        console.error("Error in chess:restartReady:", error);
        socket.emit("lobby:error", {
          message: error.message || "Failed to handle retry request",
          event: "chess:restartReady",
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
            { $set: { players: updatedPlayers } },
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

    socket.on("lobby:startGame", async (data) => {
      try {
        const { lobbyId } = data || {};
        if (!lobbyId) {
          socket.emit("lobby:error", {
            message: "Missing lobbyId",
            event: "lobby:startGame",
          });
          return;
        }

        const lobby = await lobbies.findOne({ LobbyId: lobbyId });
        if (!lobby) {
          socket.emit("lobby:error", {
            message: "Lobby not found",
            event: "lobby:startGame",
          });
          return;
        }

        if (
          !Array.isArray(lobby.players) ||
          lobby.players.length !== 2 ||
          !lobby.players.every((p) => p.ready)
        ) {
          socket.emit("lobby:error", {
            message: "Lobby not ready to start",
            event: "lobby:startGame",
          });
          return;
        }

        let game;
        if (lobby.gameId) {
          game = await getChessGame(lobby.gameId.toString());
        } else {
          const whitePlayer = lobby.players[0];
          const blackPlayer = lobby.players[1];
          const whiteId = whitePlayer.userId.toString();
          const blackId = blackPlayer.userId.toString();

          game = await createChessGame(whiteId, blackId);

          await lobbies.updateOne(
            { LobbyId: lobbyId },
            {
              $set: {
                gameId: new ObjectId(game._id),
                gameCreatedAt: new Date(),
              },
            },
          );
        }

        const pieceColors = {
          white: lobby.players?.[0]?.pieceColor ?? null,
          black: lobby.players?.[1]?.pieceColor ?? null,
        };

        const clock = initClockForGame(
          game._id,
          lobby?.settings?.timeMinutes ?? 5,
        );

        io.to(lobbyId).emit("chess:start", {
          lobbyId,
          gameId: game._id,
          game,
          settings: lobby.settings || null,
          pieceColors,
          clock,
        });
      } catch (error) {
        console.error("Error in lobby:startGame:", error);
        socket.emit("lobby:error", {
          message: error.message || "Failed to start game",
          event: "lobby:startGame",
        });
      }
    });

    socket.on("chess:move", async (data) => {
      try {
        const { lobbyId, gameId, userId, from, to, promotion } = data || {};

        if (!lobbyId || !gameId || !userId || !from || !to) {
          socket.emit("chess:invalidMove", {
            message: "Missing lobbyId, gameId, userId, from, or to",
          });
          return;
        }

        const lobby = await lobbies.findOne({ LobbyId: lobbyId });
        if (!lobby || !lobby.gameId) {
          socket.emit("chess:invalidMove", {
            message: "Lobby or game not found",
          });
          return;
        }

        const game = await getChessGame(gameId);
        if (!game) {
          socket.emit("chess:invalidMove", {
            message: "Game not found",
          });
          return;
        }

        const runningColor = game.turn;
        let clockState = gameClocks.get(String(gameId));
        if (!clockState) {
          clockState = initClockForGame(
            gameId,
            lobby?.settings?.timeMinutes ?? 5,
          );
        }
        clockState = tickClock(gameId, runningColor) || clockState;
        if (
          (runningColor === "white" && clockState.whiteMs <= 0) ||
          (runningColor === "black" && clockState.blackMs <= 0)
        ) {
          const updatedGame = await endGameAsTimeout(gameId, runningColor);
          io.to(lobbyId).emit("chess:state", {
            lobbyId,
            gameId,
            game: updatedGame,
            lastMove: null,
            fullSync: true,
            clock: clockState,
          });
          return;
        }

        const userIdStr = String(userId);

        const whiteId = String(game.players.white);
        const blackId = String(game.players.black);

        const playerColor =
          userIdStr === whiteId
            ? "white"
            : userIdStr === blackId
              ? "black"
              : null;

        if (!playerColor) {
          socket.emit("chess:invalidMove", {
            message: "User is not a player in this game",
          });
          return;
        }

        const expectedColor = game.turn;
        if (playerColor !== expectedColor) {
          socket.emit("chess:invalidMove", {
            message: "Not your turn",
          });
          return;
        }

        const move = promotion ? { from, to, promotion } : { from, to };

        const result = await makeMove(gameId, move);
        if (!result.ok) {
          socket.emit("chess:invalidMove", {
            message: result.reason || "Illegal move",
            game: result.game,
          });
          return;
        }

        const pieceFrom = game?.board?.[from] || null;
        const isKing =
          pieceFrom && String(pieceFrom[1] || "").toLowerCase() === "k";
        const isPawn =
          pieceFrom && String(pieceFrom[1] || "").toLowerCase() === "p";
        const isCastling =
          Boolean(isKing && from && to) &&
          Math.abs(to.charCodeAt(0) - from.charCodeAt(0)) === 2;
        const isPromotion =
          Boolean(move.promotion) ||
          (isPawn &&
            ((game.turn === "white" && String(to).endsWith("8")) ||
              (game.turn === "black" && String(to).endsWith("1"))));
        const needsFullSync = Boolean(isCastling || isPromotion);

        const newRunning = result.game.turn;
        const st = gameClocks.get(String(gameId));
        if (st) {
          st.running = newRunning;
          st.lastAtMs = Date.now();
          gameClocks.set(String(gameId), st);
          clockState = st;
        }

        io.to(lobbyId).emit("chess:state", {
          lobbyId,
          gameId,
          game: result.game,
          lastMove: move,
          fullSync: needsFullSync,
          clock: clockState || null,
        });
      } catch (error) {
        console.error("Error in chess:move:", error);
        socket.emit("chess:invalidMove", {
          message: error.message || "Failed to apply move",
        });
      }
    });

    socket.on("chess:sync", async (data) => {
      try {
        const { lobbyId, gameId } = data || {};
        if (!lobbyId || !gameId) return;

        const lobby = await lobbies.findOne({ LobbyId: lobbyId });
        if (!lobby || !lobby.gameId) return;

        const game = await getChessGame(gameId);
        if (!game) return;

        let clockState = gameClocks.get(String(gameId));
        if (!clockState) {
          const lobbyDoc = await lobbies.findOne({ LobbyId: lobbyId });
          clockState = initClockForGame(
            gameId,
            lobbyDoc?.settings?.timeMinutes ?? 5,
          );
        }
        clockState = tickClock(gameId, game.turn) || clockState;
        if (
          game.status === "active" &&
          ((game.turn === "white" && clockState.whiteMs <= 0) ||
            (game.turn === "black" && clockState.blackMs <= 0))
        ) {
          const updatedGame = await endGameAsTimeout(gameId, game.turn);
          io.to(lobbyId).emit("chess:state", {
            lobbyId,
            gameId,
            game: updatedGame,
            lastMove: null,
            fullSync: true,
            clock: clockState,
          });
          return;
        }

        socket.emit("chess:state", {
          lobbyId,
          gameId,
          game,
          lastMove: null,
          fullSync: true,
          clock: clockState || null,
        });
      } catch (error) {
        console.error("Error in chess:sync:", error);
      }
    });
  });
}

module.exports = { lobbySocket };
