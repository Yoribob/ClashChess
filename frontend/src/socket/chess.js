import socket from "./index.js";
import { fetchWithAuth } from "../utils/fetchWithAuth.js";
import { COLOR_SCHEME, globalState } from "../config/globalState.js";
import { closeGameOverModal } from "../ui/gameOverModal.js";
import { resetGameEndAlertForNewGame } from "../game/interaction.js";

let chessHandlersRegistered = false;
let chessSyncIntervalId = null;

function parseHexColorToInt(hex) {
  if (!hex) return null;
  const s = String(hex).trim();
  const withHash = s.startsWith("#") ? s : `#${s}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(withHash)) return null;
  return parseInt(withHash.slice(1), 16);
}

export function registerChessSocketHandlers() {
  if (chessHandlersRegistered) return;

  socket.on("chess:start", async ({ lobbyId, gameId, game, settings, pieceColors, clock }) => {
    try {
      closeGameOverModal();

      if (globalState.chess?.gameId && globalState.chess.gameId === gameId) {
        globalState.currentPlayer = game.turn === "white" ? "w" : "b";
        globalState.chess.status = game.status;
        return;
      }

      resetGameEndAlertForNewGame();

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

      const baseTheme = COLOR_SCHEME[themeKey];
      let themed = baseTheme;
      if (pieceColors && baseTheme && baseTheme.pieces) {
        const w = parseHexColorToInt(pieceColors.white);
        const b = parseHexColorToInt(pieceColors.black);
        themed = {
          ...baseTheme,
          pieces: {
            white: {
              ...baseTheme.pieces.white,
              color: w ?? baseTheme.pieces.white.color,
            },
            black: {
              ...baseTheme.pieces.black,
              color: b ?? baseTheme.pieces.black.color,
            },
          },
        };
      }

      globalState.activeTheme = themed;
      globalState.currentPlayer = game.turn === "white" ? "w" : "b";
      globalState.chess = {
        lobbyId,
        gameId,
        color: playerColor,
        userId: myId,
        status: game.status,
        mode: settings?.mode || "classic",
        pieceColors: pieceColors || null,
        clock: clock || null,
        enPassantTarget: game.enPassantTarget || null,
        castling: game.castling || null,
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

