import * as THREE from "three";
import { loadedMeshes, pieces } from "../graphics/pieces.js";
import { addOutlineToPieces } from "../postprocessing.js";
import { getLegalMovesWithCheckValidation, getCheckHighlightSquares } from "./gameLogic.js";
import { InitClash } from "./clashManager.js";
import { globalState } from "../config/globalState.js";
import socket from "../socket/index.js";
import { syncBoardFromBackend } from "./gameState.js";
import { updateMiniAndFullBoard } from "../ui/miniBoard.js";
import { showGameOverModal } from "../ui/gameOverModal.js";

let selectedPiece = null;
let moveHighlights = [];
let checkHighlights = [];
let isMovePending = false;
let pendingMove = null;
let chessHandlersAttached = false;
let clickHandlerAttached = false;
let gameEndAlertShownForGameId = null;

export function resetGameEndAlertForNewGame() {
  gameEndAlertShownForGameId = null;
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

function resetSelection(board) {
  if (selectedPiece && selectedPiece.mesh) {
    selectedPiece.mesh.scale.set(1, 1, 1);
  }
  selectedPiece = null;
  globalState.selectedPiece = null;
  addOutlineToPieces([]);
  clearMoveHighlights(board);
}

function clearMoveHighlights(board) {
  if (!board) return;
  moveHighlights.forEach((highlight) => {
    board.remove(highlight);
  });
  moveHighlights = [];
}

function clearCheckHighlights(board) {
  if (!board) return;
  checkHighlights.forEach((h) => board.remove(h));
  checkHighlights = [];
}

function createCheckHighlight(squareNotation) {
  const file = squareNotation.charCodeAt(0) - "a".charCodeAt(0);
  const rank = parseInt(squareNotation[1]) - 1;
  const x = file - 3.5;
  const z = 3.5 - rank;
  const geometry = new THREE.PlaneGeometry(0.95, 0.95);
  const material = new THREE.MeshBasicMaterial({
    color: 0xcc0000,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  const highlight = new THREE.Mesh(geometry, material);
  highlight.position.set(x, 0.11, z);
  highlight.rotation.x = -Math.PI / 2;
  highlight.userData.type = "checkHighlight";
  highlight.userData.square = squareNotation;
  return highlight;
}

function updateCheckHighlights(board) {
  if (!board) return;
  clearCheckHighlights(board);
  if (!globalState.chess || globalState.chess.status !== "active") return;
  const { kingSquare, attackerSquares } = getCheckHighlightSquares();
  const squares = kingSquare ? [kingSquare, ...attackerSquares] : [];
  squares.forEach((sq) => {
    const h = createCheckHighlight(sq);
    board.add(h);
    checkHighlights.push(h);
  });
}

export function updateCheckHighlightsFromMain() {
  updateCheckHighlights(globalState.board);
}

function removePieceAtSquare(square) {
  if (!square) return;
  const target =
    pieces[square] ||
    Object.values(pieces).find((p) => p && p.position === square);
  if (!target) return;

  if (target.mesh && target.mesh.parent) {
    target.mesh.parent.remove(target.mesh);
  }
  target.position = null;

   if (pieces[square] === target) {
     delete pieces[square];
   } else {
     Object.keys(pieces).forEach((key) => {
       if (pieces[key] === target) {
         delete pieces[key];
       }
     });
   }
}

export function setupClickHandler(renderer, camera, board) {
  if (clickHandlerAttached) return;
  clickHandlerAttached = true;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function getPieceFromHit(hit) {
    let obj = hit;
    while (obj && !obj.userData?.type) obj = obj.parent;
    if (!obj || obj.userData.type !== "piece") return null;
    const piece = obj.userData.piece;
    if (!piece || !piece.position) return null;
    return piece;
  }

  function getSquareFromHit(hit) {
    let obj = hit;
    while (obj && !obj.userData?.type) obj = obj.parent;
    if (!obj || !obj.userData) return { square: null, isHighlight: false };

    if (obj.userData.type === "highlight") {
      return { square: obj.userData.square, isHighlight: true };
    }

    if (obj.userData.type === "square") {
      return { square: obj.userData.notation, isHighlight: false };
    }

    return { square: null, isHighlight: false };
  }

  function createMoveHighlight(squareNotation, isCapture = false) {
    const file = squareNotation.charCodeAt(0) - "a".charCodeAt(0);
    const rank = parseInt(squareNotation[1]) - 1;
    const x = file - 3.5;
    const z = 3.5 - rank;

    const color = isCapture ? 0xff4444 : 0x00ff88;
    const opacity = isCapture ? 0.8 : 0.7;

    const geometry = new THREE.CircleGeometry(0.4, 32);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
    });

    if (typeof material.customProgramCacheKey !== "function") {
      material.customProgramCacheKey = function () {
        return `${material.name || "highlight"}_${material.type}`;
      };
    }

    const highlight = new THREE.Mesh(geometry, material);
    highlight.position.set(x, 0.11, z);
    highlight.rotation.x = -Math.PI / 2;
    highlight.userData.type = "highlight";
    highlight.userData.square = squareNotation;
    highlight.userData.originalOpacity = opacity;
    highlight.userData.animationTime = 0;
    highlight.userData.isCapture = isCapture;

    return highlight;
  }

  function animateHighlights() {
    moveHighlights.forEach((highlight) => {
      if (highlight.userData) {
        highlight.userData.animationTime += 0.05;
        const pulse = Math.sin(highlight.userData.animationTime) * 0.3 + 0.7;
        highlight.material.opacity = highlight.userData.originalOpacity * pulse;
        highlight.scale.setScalar(0.8 + pulse * 0.2);
      }
    });
  }

  function showMoveHighlights(legalMoves, board) {
    clearMoveHighlights(board);

    legalMoves.forEach((squareNotation) => {
      const isCapture = Object.values(pieces).some(
        (p) => p.position === squareNotation
      );
      const highlight = createMoveHighlight(squareNotation, isCapture);
      board.add(highlight);
      moveHighlights.push(highlight);
    });
  }

  function selectPiece(piece, board) {
    resetSelection(board);

    selectedPiece = piece;
    globalState.selectedPiece = piece;

    if (piece.mesh) {
      piece.mesh.scale.set(1.1, 1.1, 1.1);
      addOutlineToPieces([piece.mesh]);
    }

    const legalMoves = getLegalMovesWithCheckValidation(piece.position, piece);
    showMoveHighlights(legalMoves, board);
    console.log(`Selected ${piece.color}${piece.type} at ${piece.position}`);
    console.log("Legal moves:", legalMoves);
  }

  function movePiece(piece, newPosition) {
    const capturedPiece = Object.values(pieces).find(
      (p) => p.position === newPosition
    );
    if (capturedPiece) {
      removePieceAtSquare(newPosition);

      const mode = globalState.chess?.mode || "custom";
      if (mode !== "classic") {
        globalState.capturedPiece = capturedPiece;
        console.log(
          `⚔️ CLASH! ${piece.color}${piece.type} vs ${capturedPiece.color}${capturedPiece.type}`
        );
        InitClash();
      }
    }

    const oldPos = piece.position;
    if (oldPos && pieces[oldPos] === piece) {
      delete pieces[oldPos];
    }

    piece.position = newPosition;
    pieces[newPosition] = piece;
    piece.move(newPosition);

    console.log(`Moved ${piece.color}${piece.type} to ${newPosition}`);
  }

  function switchPlayerFromServer(game) {
    if (!game) return;
    globalState.currentPlayer = game.turn === "white" ? "w" : "b";
  }

  function applyServerMove(game, lastMove, fullSync) {
    if (!game) return;

    const boardRef = globalState.board;

    if (globalState.chess) {
      globalState.chess.status = game.status || globalState.chess.status;
      globalState.chess.enPassantTarget = game?.enPassantTarget || null;
      globalState.chess.castling = game?.castling || globalState.chess.castling || null;
      if (game.board) {
        globalState.chess.board = game.board;
      }
    }

    switchPlayerFromServer(game);

    function showGameEndAlertIfNeeded() {
      const status = game.status;
      if (status !== "checkmate" && status !== "stalemate" && status !== "draw") return;
      const gid = game._id || globalState.chess?.gameId;
      if (!gid || gameEndAlertShownForGameId === gid) return;
      gameEndAlertShownForGameId = gid;
      showGameOverModal(game);
    }
    showGameEndAlertIfNeeded();

    if (globalState.chess && globalState.chess.board) {
      updateMiniAndFullBoard(globalState.chess.board);
    }

    if (fullSync && game.board) {
      syncBoardFromBackend(game.board, globalState.scene);

      if (
        selectedPiece &&
        (
          !selectedPiece.position ||
          !pieces[selectedPiece.position] ||
          pieces[selectedPiece.position] !== selectedPiece
        )
      ) {
        resetSelection(boardRef);
      }
      updateCheckHighlights(boardRef);
      return;
    }

    if (!lastMove || !lastMove.from || !lastMove.to) {
      updateCheckHighlights(boardRef);
      return;
    }

    const from = lastMove.from;
    const to = lastMove.to;

    let pieceToMove =
      pieces[from] ||
      Object.values(pieces).find((p) => p && p.position === from);

    if (!pieceToMove) {
      console.warn(
        "No local piece found for server move, desync, ignoring",
        lastMove
      );
      updateCheckHighlights(boardRef);
      return;
    }

    const targetAtTo = Object.values(pieces).find(
      (p) => p && p.position === to
    );
    if (targetAtTo && targetAtTo.color !== pieceToMove.color) {
      removePieceAtSquare(to);
    } else {
      const isPawn = pieceToMove.type === "p";
      const fromFile = from[0];
      const toFile = to[0];
      const fromRank = parseInt(from[1], 10);
      const toRank = parseInt(to[1], 10);

      if (isPawn && fromFile !== toFile && !targetAtTo) {
        let capturedRank;
        if (pieceToMove.color === "w") {
          capturedRank = toRank - 1;
        } else {
          capturedRank = toRank + 1;
        }
        const epSquare = `${toFile}${capturedRank}`;
        removePieceAtSquare(epSquare);
      }
    }

    movePiece(pieceToMove, to);
    resetSelection(boardRef);
    updateCheckHighlights(boardRef);
  }

  function attachChessSocketHandlers() {
    if (chessHandlersAttached) return;

    socket.on("chess:state", ({ game, lastMove, fullSync }) => {
      isMovePending = false;
      pendingMove = null;
      applyServerMove(game, lastMove, fullSync);
    });

    socket.on("chess:invalidMove", ({ message }) => {
      isMovePending = false;
      pendingMove = null;
      if (message) {
        console.warn("Invalid move:", message);
      }
    });

    chessHandlersAttached = true;
  }

  attachChessSocketHandlers();

  document.addEventListener("click", (event) => {
    const board = globalState.board;
    if (!board) return;

    mouse.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);

    let intersects = raycaster.intersectObjects(loadedMeshes, true);
    let piece =
      intersects.length > 0 ? getPieceFromHit(intersects[0].object) : null;

    if (piece) {
      const pieceSquare = piece.position;

      if (selectedPiece && piece !== selectedPiece) {
        const squareNotation = pieceSquare;
        if (!squareNotation) return;

        const legalMoves = getLegalMovesWithCheckValidation(
          selectedPiece.position,
          selectedPiece
        );

        const possibleMoves = new Set(legalMoves);

        if (
          isMultiplayerActive() &&
          selectedPiece.type === "p" &&
          globalState.chess?.enPassantTarget
        ) {
          const ep = globalState.chess.enPassantTarget;
          if (ep) {
            possibleMoves.add(ep);
          }
        }

        if (!possibleMoves.has(squareNotation)) {
          if (!isMultiplayerActive()) {
            return;
          }
        }

        if (isMultiplayerActive()) {
          if (isMovePending) return;
          if (!isMyTurn()) {
            console.log("Not your turn (server)");
            return;
          }

          const from = selectedPiece.position;
          const to = squareNotation;
          socket.emit("chess:move", {
            lobbyId: globalState.chess.lobbyId,
            gameId: globalState.chess.gameId,
            userId: globalState.chess.userId,
            from,
            to,
          });
          isMovePending = true;
          pendingMove = { from, to, piece: selectedPiece };
          resetSelection(board);
        } else {
          movePiece(selectedPiece, squareNotation);
          resetSelection(board);
          globalState.currentPlayer =
            (globalState.currentPlayer || "w") === "w" ? "b" : "w";
        }

        return;
      }

      const chessState = globalState.chess;
      const boardState = chessState?.board;
      const codeFromBoard =
        pieceSquare && boardState ? boardState[pieceSquare] : null;

      if (isMultiplayerActive()) {
        if (!boardState || !codeFromBoard) {
          return;
        }
      }

      const colorFromBoard = codeFromBoard ? codeFromBoard[0] : piece.color;

      if (!isMyTurn()) {
        return;
      }

      if (isMultiplayerActive()) {
        const myColor = chessState?.color === "white" ? "w" : "b";
        if (!myColor || colorFromBoard !== myColor) {
          return;
        }
      } else {
        const cp = globalState.currentPlayer || "w";
        if (colorFromBoard !== cp) {
          console.log("Not your turn!");
          return;
        }
      }

      if (selectedPiece === piece) {
        resetSelection(board);
        return;
      }

      selectPiece(piece, board);
      return;
    }

    intersects = raycaster.intersectObjects(board.children, true);
    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      const { square: squareNotation } = getSquareFromHit(clickedObject);

      if (!selectedPiece && squareNotation) {
        if (!isMyTurn()) {
          return;
        }
        const chessState = globalState.chess;
        const boardState = chessState?.board;
        const code = boardState ? boardState[squareNotation] : null;

        if (code) {
          const colorFromBoard = code[0];

          if (isMultiplayerActive()) {
            const myColor = chessState?.color === "white" ? "w" : "b";
            if (!myColor || colorFromBoard !== myColor) {
              return;
            }
          } else {
            const cp = globalState.currentPlayer || "w";
            if (colorFromBoard !== cp) {
              return;
            }
          }

          const pieceAtSquare =
            pieces[squareNotation] ||
            Object.values(pieces).find(
              (p) => p && p.position === squareNotation
            );

          if (pieceAtSquare) {
            selectPiece(pieceAtSquare, board);
          }
        }

        return;
      }

      if (selectedPiece && squareNotation) {
        const legalMoves = getLegalMovesWithCheckValidation(
          selectedPiece.position,
          selectedPiece
        );

        const possibleMoves = new Set(legalMoves);

        if (
          isMultiplayerActive() &&
          selectedPiece.type === "p" &&
          globalState.chess?.enPassantTarget
        ) {
          const ep = globalState.chess.enPassantTarget;
          const fromFile = selectedPiece.position[0];
          const fromRank = parseInt(selectedPiece.position[1], 10);
          const epFile = ep[0];
          const epRank = parseInt(ep[1], 10);

          const fileDiff = Math.abs(epFile.charCodeAt(0) - fromFile.charCodeAt(0));
          const rankDiff =
            selectedPiece.color === "w"
              ? epRank - fromRank
              : fromRank - epRank;

          if (fileDiff === 1 && rankDiff === 1) {
            possibleMoves.add(ep);
          }
        }

        const canTryMove = isMultiplayerActive()
          ? true
          : possibleMoves.has(squareNotation);

        if (canTryMove) {
          if (isMultiplayerActive()) {
            if (isMovePending) return;
            if (!isMyTurn()) {
              console.log("Not your turn (server)");
              return;
            }

            const from = selectedPiece.position;
            const to = squareNotation;
            socket.emit("chess:move", {
              lobbyId: globalState.chess.lobbyId,
              gameId: globalState.chess.gameId,
              userId: globalState.chess.userId,
              from,
              to,
            });
            isMovePending = true;
            pendingMove = { from, to, piece: selectedPiece };
            resetSelection(board);
          } else {
            movePiece(selectedPiece, squareNotation);
            resetSelection(board);
            globalState.currentPlayer =
              (globalState.currentPlayer || "w") === "w" ? "b" : "w";
          }
        } else {
          console.log("Invalid move!");
        }
      }
    }
  });
}

export function ChashFlickerScene(scene) {
  if (selectedPiece && selectedPiece.mesh) {
    selectedPiece.mesh.scale.set(1, 1, 1);
  }
  selectedPiece = null;
  addOutlineToPieces([]);

  let objectsChanged = 0;

  scene.traverse((object) => {
    if (object.isMesh && object.material) {
      object.scale.set(1.1, 1.1, 1.1);

      if (Array.isArray(object.material)) {
        object.material.forEach((material) => {
          material.color.setHex(0x000000);
          material.emissive.setHex(0x000000);
          material.emissiveIntensity = 0.0;
          material.needsUpdate = true;
        });
      } else {
        object.material.color.setHex(0x000000);
        object.material.emissive.setHex(0x000000);
        object.material.emissiveIntensity = 0.0;
        object.material.needsUpdate = true;
      }

      objectsChanged++;
    }
  });

}

export function animateMoveHighlights() {
  if (moveHighlights.length > 0) {
    moveHighlights.forEach((highlight) => {
      if (highlight.userData) {
        highlight.userData.animationTime += 0.05;

        if (highlight.userData.isCapture) {
          const pulse =
            Math.sin(highlight.userData.animationTime * 1.5) * 0.4 + 0.6;
          highlight.material.opacity =
            highlight.userData.originalOpacity * pulse;
          highlight.scale.setScalar(0.7 + pulse * 0.3);
        } else {
          const pulse = Math.sin(highlight.userData.animationTime) * 0.3 + 0.7;
          highlight.material.opacity =
            highlight.userData.originalOpacity * pulse;
          highlight.scale.setScalar(0.8 + pulse * 0.2);
        }
      }
    });
  }
}
