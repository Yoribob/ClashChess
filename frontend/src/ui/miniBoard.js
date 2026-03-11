import { globalState } from "../config/globalState.js";
import socket from "../socket/index.js";
import {
  applyMove,
  normalizeCastlingRights,
  validateMove,
  getPieceColor,
  getLegalMoves,
} from "../game/boardEngine.js";
import { syncBoardFromBackend } from "../game/gameState.js";
import { showGameOverModal } from "./gameOverModal.js";

const FILES = "abcdefgh";

const SYMBOLS = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

let selectedSquare2d = null;
let isMovePending2d = false;
let legalMoves2d = new Set();
let captureMoves2d = new Set();
let active2DAnimation = null;
let miniBoardStylesInjected = false;

function ensureMiniBoardStyles() {
  if (miniBoardStylesInjected) return;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes miniPulse {
      0%, 100% { transform: scale(0.94); opacity: 0.75; }
      50%      { transform: scale(1.04); opacity: 1; }
    }
    @keyframes miniPulseCapture {
      0%, 100% { transform: scale(0.96); opacity: 0.85; }
      50%      { transform: scale(1.08); opacity: 1; }
    }
    .mini-legal-circle {
      animation: miniPulse 2.5s ease-in-out infinite;
      transform-origin: center center;
    }
    .mini-legal-circle.capture {
      animation: miniPulseCapture 2.5s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
  miniBoardStylesInjected = true;
}

function getThemeRgb() {
  const fog = globalState.activeTheme?.scene?.fogColor;
  const col = typeof fog === "number" ? fog : 0x000000;
  const r = (col >> 16) & 255;
  const g = (col >> 8) & 255;
  const b = col & 255;
  return { r, g, b };
}

function createBoardGrid(className, sizePx) {
  const grid = document.createElement("div");
  grid.className = className;
  const { r, g, b } = getThemeRgb();
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(8, 1fr)";
  grid.style.gridTemplateRows = "repeat(8, 1fr)";
  grid.style.width = `${sizePx}px`;
  grid.style.height = `${sizePx}px`;
  grid.style.border = `3px solid rgba(${r},${g},${b},0.9)`;
  grid.style.boxSizing = "border-box";
  grid.style.borderRadius = "10px";
  grid.style.boxShadow =
    "0 0 24px rgba(0,0,0,0.8), inset 0 0 4px rgba(255,255,255,0.08)";
  grid.style.overflow = "hidden";
  return grid;
}

function isMultiplayerActive() {
  return Boolean(globalState.chess && globalState.chess.gameId);
}

function isMyTurn() {
  if (!isMultiplayerActive() || !globalState.chess) return true;
  if (globalState.chess.status !== "active") return false;
  const myColor = globalState.chess.color === "white" ? "w" : "b";
  return globalState.currentPlayer === myColor;
}

function getMyColorCode() {
  const c = globalState.chess?.color;
  if (c === "white") return "w";
  if (c === "black") return "b";
  return null;
}

function squareFromCoords(row, col, orientation) {
  const fileIndex = orientation === "black" ? 7 - col : col;
  const rank = orientation === "black" ? row + 1 : 8 - row;
  return `${FILES[fileIndex]}${rank}`;
}

function renderBoardIntoElement(board, el, cellFontSize, interactive = false) {
  if (!el) return;
  el.innerHTML = "";

  const orientation = globalState.chess?.color === "black" ? "black" : "white";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = squareFromCoords(row, col, orientation);
      const code = board ? board[square] : null;

      const cell = document.createElement("div");
      const isDark = (col + (orientation === "black" ? row + 1 : 8 - row)) % 2 === 1;
      cell.style.background = isDark ? "#8b4513" : "#f0d9b5";
      cell.style.display = "flex";
      cell.style.alignItems = "center";
      cell.style.justifyContent = "center";
      cell.style.fontSize = `${cellFontSize}px`;
      cell.style.fontWeight = "600";
      cell.style.color = "#111";
      cell.style.textShadow = "0 0 2px rgba(0,0,0,0.35)";
      cell.style.userSelect = "none";
      cell.style.position = "relative";
      cell.dataset.square = square;

      if (square === selectedSquare2d) {
        cell.style.outline = "2px solid rgba(255, 255, 0, 0.9)";
        cell.style.outlineOffset = "-2px";
      }

      if (legalMoves2d.has(square)) {
        const isCap = captureMoves2d.has(square);
        const col = isCap ? "rgba(255, 68, 68, 0.8)" : "rgba(0, 255, 136, 0.7)";
        const circle = document.createElement("div");
        circle.style.position = "absolute";
        circle.style.inset = "3px";
        circle.style.borderRadius = "50%";
        circle.style.backgroundColor = col;
        circle.style.pointerEvents = "none";
        circle.className = "mini-legal-circle" + (isCap ? " capture" : "");
        cell.appendChild(circle);
      }

      if (code) {
        const color = code[0];
        const type = String(code[1] || "").toLowerCase();
        const sym = SYMBOLS[color]?.[type] || "";
        const pieceSpan = document.createElement("span");
        pieceSpan.textContent = sym;
        pieceSpan.style.position = "relative";
        pieceSpan.style.zIndex = "1";
        if (color === "w") {
          pieceSpan.style.color = "#ffffff";
          pieceSpan.style.textShadow = "0 0 3px rgba(0,0,0,0.7)";
        } else {
          pieceSpan.style.color = "#111111";
          pieceSpan.style.textShadow = "0 0 2px rgba(0,0,0,0.5)";
        }
        cell.appendChild(pieceSpan);
      }

      if (interactive) {
        cell.style.cursor = "pointer";
      }

      el.appendChild(cell);
    }
  }
}

function applyViewMode(mode) {
  globalState.viewMode = mode;
  const canvas = globalState.renderer?.domElement;
  const fullOverlay = document.querySelector(".full-2d-board-overlay");

  if (mode === "2d") {
    if (canvas) canvas.style.display = "none";
    if (globalState.controls) globalState.controls.enabled = false;
    if (fullOverlay) fullOverlay.style.display = "flex";
  } else {
    if (canvas) canvas.style.display = "block";
    if (globalState.controls) globalState.controls.enabled = true;
    if (fullOverlay) fullOverlay.style.display = "none";
  }
}

export function setViewMode(mode) {
  applyViewMode(mode);
}

function play2DMoveAnimation(from, to, board) {
  try {
    const fullGrid = document.querySelector(".full-2d-board-grid");
    if (!fullGrid || !from || !to || !board) return;

    const fromCell = fullGrid.querySelector(`[data-square="${from}"]`);
    const toCell = fullGrid.querySelector(`[data-square="${to}"]`);
    const code = board[from];
    if (!fromCell || !toCell || !code) return;

    if (active2DAnimation && active2DAnimation.parentNode) {
      active2DAnimation.parentNode.removeChild(active2DAnimation);
    }

    const overlay = document.createElement("div");
    const rectFrom = fromCell.getBoundingClientRect();
    const rectTo = toCell.getBoundingClientRect();

    const color = code[0];
    const type = String(code[1] || "").toLowerCase();
    const sym = SYMBOLS[color]?.[type] || "";

    overlay.textContent = sym;
    overlay.style.position = "fixed";
    overlay.style.left = `${rectFrom.left}px`;
    overlay.style.top = `${rectFrom.top}px`;
    overlay.style.width = `${rectFrom.width}px`;
    overlay.style.height = `${rectFrom.height}px`;
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "60";
    overlay.style.fontSize = `${Math.round(rectFrom.height * 0.7)}px`;
    overlay.style.fontWeight = "600";
    if (color === "w") {
      overlay.style.color = "#ffffff";
      overlay.style.textShadow = "0 0 4px rgba(0,0,0,0.85)";
    } else {
      overlay.style.color = "#111111";
      overlay.style.textShadow = "0 0 3px rgba(0,0,0,0.8)";
    }
    overlay.style.transition = "transform 0.18s ease-out, opacity 0.18s ease-out";

    const dx = rectTo.left - rectFrom.left;
    const dy = rectTo.top - rectFrom.top;

    document.body.appendChild(overlay);
    active2DAnimation = overlay;

    requestAnimationFrame(() => {
      overlay.style.transform = `translate(${dx}px, ${dy}px)`;
      overlay.style.opacity = "0.95";
      requestAnimationFrame(() => {
        overlay.style.opacity = "0.2";
      });
    });

    overlay.addEventListener(
      "transitionend",
      () => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        if (active2DAnimation === overlay) {
          active2DAnimation = null;
        }
      },
      { once: true }
    );
  } catch {
    
  }
}

export function initMiniBoardUI() {
  if (document.querySelector(".mini-board-container")) return;

  ensureMiniBoardStyles();
  const container = document.createElement("div");
  container.className = "mini-board-container";
  container.style.position = "fixed";
  container.style.top = "16px";
  container.style.right = "16px";
  container.style.zIndex = "30";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.alignItems = "flex-end";
  container.style.gap = "4px";
  container.style.pointerEvents = "auto";

  const miniWrapper = document.createElement("div");
  miniWrapper.style.padding = "4px";
  miniWrapper.style.background = "rgba(0,0,0,0.55)";
  miniWrapper.style.borderRadius = "6px";
  miniWrapper.style.boxShadow = "0 0 8px rgba(0,0,0,0.6)";
  miniWrapper.style.cursor = "pointer";

  const miniGrid = createBoardGrid("mini-board-grid", 128);
  miniWrapper.appendChild(miniGrid);

  container.appendChild(miniWrapper);

  miniWrapper.addEventListener("click", () => {
    const nextMode = globalState.viewMode === "2d" ? "3d" : "2d";
    applyViewMode(nextMode);
  });

  document.body.appendChild(container);

  let fullOverlay = document.querySelector(".full-2d-board-overlay");
  if (!fullOverlay) {
    fullOverlay = document.createElement("div");
    fullOverlay.className = "full-2d-board-overlay";
    fullOverlay.style.position = "fixed";
    fullOverlay.style.inset = "0";
    const { r, g, b } = getThemeRgb();
    fullOverlay.style.background = `radial-gradient(circle at 50% 20%, rgba(${r},${g},${b},0.32), rgba(0,0,0,0.92))`;
    fullOverlay.style.display = "none";
    fullOverlay.style.alignItems = "center";
    fullOverlay.style.justifyContent = "center";
    fullOverlay.style.zIndex = "40";

    const inner = document.createElement("div");
    inner.style.display = "flex";
    inner.style.flexDirection = "column";
    inner.style.alignItems = "center";
    inner.style.gap = "12px";

    const topRow = document.createElement("div");
    topRow.style.display = "flex";
    topRow.style.alignItems = "center";
    topRow.style.justifyContent = "space-between";
    topRow.style.width = "100%";

    const title = document.createElement("div");
    title.textContent = "2D Board";
    title.style.color = "#ffffff";
    title.style.fontSize = "16px";
    title.style.fontWeight = "600";

    const backBtn = document.createElement("button");
    backBtn.textContent = "Back to 3D";
    backBtn.style.padding = "6px 10px";
    backBtn.style.borderRadius = "4px";
    backBtn.style.border = "none";
    backBtn.style.cursor = "pointer";
    backBtn.style.background = "#f0d9b5";
    backBtn.style.color = "#222";
    backBtn.style.fontWeight = "600";
    backBtn.addEventListener("click", () => applyViewMode("3d"));

    topRow.appendChild(title);
    topRow.appendChild(backBtn);

    const fullGrid = createBoardGrid("full-2d-board-grid", 384);
    fullGrid.addEventListener("click", (e) => {
      let target = e.target;
      if (!target || !(target instanceof HTMLElement)) return;
      
      while (target && !(target instanceof HTMLElement && target.dataset.square)) {
        target = target.parentElement;
      }
      if (!target) return;
      const square = target.dataset.square;
      if (!square) return;

      if (!isMyTurn()) return;
      if (isMovePending2d) return;

      const board = globalState.chess?.board || {};
      const myColor = getMyColorCode();
      if (!myColor) return;

      const clickedCode = board[square] || null;

      if (!selectedSquare2d) {
        if (!clickedCode) return;
        if (clickedCode[0] !== myColor) return;
        selectedSquare2d = square;
        const castling = normalizeCastlingRights(globalState.chess?.castling);
        const enPassantTarget = globalState.chess?.enPassantTarget || null;
        const turn = globalState.currentPlayer || myColor;
        legalMoves2d = new Set();
        captureMoves2d = new Set();

        const legal = getLegalMoves(
          square,
          board,
          turn,
          castling,
          enPassantTarget,
          false
        );
        legal.forEach((toSq) => {
          legalMoves2d.add(toSq);
          const targetPiece = board[toSq];
          if ((targetPiece && getPieceColor(targetPiece) !== myColor) || toSq === enPassantTarget) {
            captureMoves2d.add(toSq);
          }
        });
        updateMiniAndFullBoard(board);
        return;
      }

      if (selectedSquare2d === square) {
        selectedSquare2d = null;
        legalMoves2d = new Set();
        captureMoves2d = new Set();
        updateMiniAndFullBoard(board);
        return;
      }

      const from = selectedSquare2d;
      const to = square;

      if (!legalMoves2d.has(to)) {
        return;
      }

      if (isMultiplayerActive()) {
        play2DMoveAnimation(from, to, board);
        socket.emit("chess:move", {
          lobbyId: globalState.chess.lobbyId,
          gameId: globalState.chess.gameId,
          userId: globalState.chess.userId,
          from,
          to,
        });
        isMovePending2d = true;
      } else {
        const castling = normalizeCastlingRights(globalState.chess?.castling);
        const enPassantTarget = globalState.chess?.enPassantTarget || null;
        const turn = globalState.currentPlayer || myColor;
        const v = validateMove(
          { board, turn, status: "active", castling, enPassantTarget },
          { from, to }
        );
        if (!v.ok) return;
        play2DMoveAnimation(from, to, board);
        const next = applyMove(
          { board, turn, status: "active", castling, enPassantTarget },
          { from, to }
        );
        globalState.chess.board = next.board;
        globalState.chess.enPassantTarget = next.enPassantTarget;
        globalState.chess.status = next.status;
        globalState.currentPlayer = next.turn;
        globalState.chess.castling = next.castling;
        updateMiniAndFullBoard(next.board);
        if (globalState.scene) {
          syncBoardFromBackend(next.board, globalState.scene);
        }
        if (next.status && next.status !== "active") {
          showGameOverModal({ ...globalState.chess, turn: next.turn === "w" ? "white" : "black", status: next.status });
        }
      }

      selectedSquare2d = null;
      legalMoves2d = new Set();
      captureMoves2d = new Set();
      updateMiniAndFullBoard(globalState.chess?.board || board);
    });

    inner.appendChild(topRow);
    inner.appendChild(fullGrid);
    fullOverlay.appendChild(inner);
    document.body.appendChild(fullOverlay);
  }

  const board = globalState.chess?.board || {};
  renderBoardIntoElement(board, miniGrid, 12, false);
  const fullGrid = document.querySelector(".full-2d-board-grid");
  if (fullGrid) renderBoardIntoElement(board, fullGrid, 26, true);

  if (!globalState.viewMode) {
    globalState.viewMode = "3d";
  }

  if (!document.querySelector(".mini-board-socket-hooks")) {
    const marker = document.createElement("div");
    marker.className = "mini-board-socket-hooks";
    marker.style.display = "none";
    document.body.appendChild(marker);

    socket.on("chess:state", ({ game, lastMove }) => {
      isMovePending2d = false;
      
      const shouldClearSelection =
        (lastMove && lastMove.from && lastMove.to) ||
        (game && game.status && game.status !== "active");
      if (shouldClearSelection) {
        selectedSquare2d = null;
        legalMoves2d = new Set();
        captureMoves2d = new Set();
      }
      if (game && game.board) {
        if (lastMove && lastMove.from && lastMove.to) {
          play2DMoveAnimation(lastMove.from, lastMove.to, game.board);
        }
        updateMiniAndFullBoard(game.board);
      }
    });
    socket.on("chess:invalidMove", () => {
      isMovePending2d = false;
    });
  }
}

export function updateMiniAndFullBoard(board) {
  const miniGrid = document.querySelector(".mini-board-grid");
  const fullGrid = document.querySelector(".full-2d-board-grid");
  if (miniGrid) renderBoardIntoElement(board, miniGrid, 12, false);
  if (fullGrid) renderBoardIntoElement(board, fullGrid, 26, true);
}

