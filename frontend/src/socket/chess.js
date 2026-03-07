import socket from "./index.js";
import { fetchWithAuth } from "../utils/fetchWithAuth.js";
import { COLOR_SCHEME, globalState } from "../config/globalState.js";

let chessHandlersRegistered = false;
let chessSyncIntervalId = null;

export function registerChessSocketHandlers() {
  if (chessHandlersRegistered) return;

  socket.on("chess:start", async ({ lobbyId, gameId, game, settings }) => {
    try {
      if (globalState.chess?.gameId && globalState.chess.gameId === gameId) {
        globalState.currentPlayer = game.turn === "white" ? "w" : "b";
        globalState.chess.status = game.status;
        return;
      }

      const res = await fetchWithAuth("/api/user/me");
      if (!res.ok) {
        console.error("Failed to fetch user for chess start");
        return;
      }
      const { user } = await res.json();
      const myId = String(user._id ?? user.id);

      const whiteId = String(game?.players?.white ?? "");
      const blackId = String(game?.players?.black ?? "");

      let playerColor = null;
      if (myId === whiteId) {
        playerColor = "white";
      } else if (myId === blackId) {
        playerColor = "black";
      }

      const themeKey =
        settings && settings.theme && COLOR_SCHEME[settings.theme]
          ? settings.theme
          : "classic";

      globalState.activeTheme = COLOR_SCHEME[themeKey];
      globalState.currentPlayer = game.turn === "white" ? "w" : "b";
      globalState.chess = {
        lobbyId,
        gameId,
        color: playerColor,
        userId: myId,
        status: game.status,
        mode: settings?.mode || "classic",
        enPassantTarget: game.enPassantTarget || null,
        board: game.board || {},
      };

      window.dispatchEvent(
        new CustomEvent("lobbyCreated", {
          detail: {
            game,
            settings,
            color: playerColor,
          },
        })
      );

      if (chessSyncIntervalId) {
        clearInterval(chessSyncIntervalId);
        chessSyncIntervalId = null;
      }
      chessSyncIntervalId = window.setInterval(() => {
        if (!globalState.chess || globalState.chess.status !== "active") {
          return;
        }
        socket.emit("chess:sync", {
          lobbyId: globalState.chess.lobbyId,
          gameId: globalState.chess.gameId,
        });
      }, 3000);
    } catch (err) {
      console.error("Error handling chess:start:", err);
    }
  });

  chessHandlersRegistered = true;
}

