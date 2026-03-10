const { randomUUID } = require("crypto");

function createInitialBoard() {
  return {
    a1: "wr", b1: "wn", c1: "wb", d1: "wq", e1: "wk", f1: "wb", g1: "wn", h1: "wr",
    a2: "wp", b2: "wp", c2: "wp", d2: "wp", e2: "wp", f2: "wp", g2: "wp", h2: "wp",
    a7: "bp", b7: "bp", c7: "bp", d7: "bp", e7: "bp", f7: "bp", g7: "bp", h7: "bp",
    a8: "br", b8: "bn", c8: "bb", d8: "bq", e8: "bk", f8: "bb", g8: "bn", h8: "br",
  };
}

function createGame(playerWhiteId, playerBlackId) {
  return {
    id: randomUUID(),
    board: createInitialBoard(),
    turn: "w",
    players: { w: playerWhiteId, b: playerBlackId },
    status: "active",
    lastMove: null,
    moveHistory: [],
    castlingRights: { w: { kingside: true, queenside: true }, b: { kingside: true, queenside: true } },
    enPassantTarget: null,
  };
}

function getPieceColor(piece) { return piece ? piece[0] : null; }
function getPieceType(piece) { return piece ? piece[1] : null; }
function isSquareOccupied(board, square) { return !!board[square]; }
function isOpponentPiece(board, square, turn) { const piece = board[square]; return piece && getPieceColor(piece) !== turn; }

function squareToCoords(square) { const file = square.charCodeAt(0) - "a".charCodeAt(0); const rank = parseInt(square[1]) - 1; return { x: file, y: rank }; }
function coordsToSquare(x, y) { if (x < 0 || x > 7 || y < 0 || y > 7) return null; return String.fromCharCode("a".charCodeAt(0) + x) + (y + 1); }

function getPawnMoves(square, board, turn, enPassantTarget) {
  const moves = [];
  const { x, y } = squareToCoords(square);
  const dir = turn === "w" ? 1 : -1;
  const startRank = turn === "w" ? 1 : 6;
  let forwardSquare = coordsToSquare(x, y + dir);
  if (forwardSquare && !isSquareOccupied(board, forwardSquare)) {
    moves.push(forwardSquare);
    if (y === startRank) {
      let twoForward = coordsToSquare(x, y + dir * 2);
      if (!isSquareOccupied(board, twoForward)) moves.push(twoForward);
    }
  }
  for (const dx of [-1, 1]) {
    let target = coordsToSquare(x + dx, y + dir);
    if (!target) continue;
    if (isOpponentPiece(board, target, turn) || target === enPassantTarget) moves.push(target);
  }
  return moves;
}

function getKnightMoves(square, board, turn) {
  const moves = [];
  const { x, y } = squareToCoords(square);
  const offsets = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
  for (const [dx, dy] of offsets) {
    const target = coordsToSquare(x+dx, y+dy);
    if (!target) continue;
    if (!isSquareOccupied(board, target) || isOpponentPiece(board, target, turn)) moves.push(target);
  }
  return moves;
}

function getSlidingMoves(square, board, turn, directions) {
  const moves = [];
  const { x, y } = squareToCoords(square);
  for (const [dx, dy] of directions) {
    let nx = x + dx, ny = y + dy;
    while (nx >=0 && nx <=7 && ny >=0 && ny <=7) {
      const target = coordsToSquare(nx, ny);
      if (!isSquareOccupied(board, target)) moves.push(target);
      else { if (isOpponentPiece(board, target, turn)) moves.push(target); break; }
      nx += dx; ny += dy;
    }
  }
  return moves;
}

function getBishopMoves(square, board, turn) { return getSlidingMoves(square, board, turn, [[1,1],[1,-1],[-1,-1],[-1,1]]); }
function getRookMoves(square, board, turn) { return getSlidingMoves(square, board, turn, [[0,1],[1,0],[0,-1],[-1,0]]); }
function getQueenMoves(square, board, turn) { return [...getBishopMoves(square, board, turn), ...getRookMoves(square, board, turn)]; }

function getKingMoves(square, board, turn, castlingRights) {
  const moves = [];
  const { x, y } = squareToCoords(square);

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const target = coordsToSquare(x + dx, y + dy);
      if (!target) continue;
      if (!isSquareOccupied(board, target) || isOpponentPiece(board, target, turn)) {
        moves.push(target);
      }
    }
  }

  if (castlingRights[turn].kingside) {
    const fSquare = coordsToSquare(x + 1, y);
    const gSquare = coordsToSquare(x + 2, y);
    const rookSquare = coordsToSquare(x + 3, y);
    if (
      !isSquareOccupied(board, fSquare) &&
      !isSquareOccupied(board, gSquare) &&
      board[rookSquare] &&
      getPieceType(board[rookSquare]) === "r"
    ) {
      moves.push(gSquare);
    }
  }

  if (castlingRights[turn].queenside) {
    const dSquare = coordsToSquare(x - 1, y);
    const cSquare = coordsToSquare(x - 2, y);
    const bSquare = coordsToSquare(x - 3, y);
    const rookSquare = coordsToSquare(x - 4, y);
    if (
      !isSquareOccupied(board, dSquare) &&
      !isSquareOccupied(board, cSquare) &&
      board[rookSquare] &&
      getPieceType(board[rookSquare]) === "r"
    ) {
      moves.push(cSquare);
    }
  }

  return moves;
}

function findKingSquare(board, turn) { for (const sq in board) { const p = board[sq]; if (p && getPieceColor(p) === turn && getPieceType(p) === "k") return sq; } return null; }
function isSquareAttacked(board, square, attackerColor) { for (const sq in board) { const piece = board[sq]; if (!piece || getPieceColor(piece) !== attackerColor) continue; const moves = getLegalMoves(sq, board, attackerColor, {w:{kingside:true, queenside:true}, b:{kingside:true, queenside:true}}, null, true); if (moves.includes(square)) return true; } return false; }
function isInCheck(state, turn) {
  const kingSquare = findKingSquare(state.board, turn);
  if (!kingSquare) return true;
  return isSquareAttacked(
    state.board,
    kingSquare,
    turn === "w" ? "b" : "w"
  );
}

function getLegalMoves(square, board, turn, castlingRights, enPassantTarget, ignoreCheck=false) {
  const piece = board[square]; if (!piece || getPieceColor(piece) !== turn) return [];
  let moves = [];
  switch(getPieceType(piece)) { case "p": moves = getPawnMoves(square, board, turn, enPassantTarget); break; case "n": moves = getKnightMoves(square, board, turn); break; case "b": moves = getBishopMoves(square, board, turn); break; case "r": moves = getRookMoves(square, board, turn); break; case "q": moves = getQueenMoves(square, board, turn); break; case "k": moves = getKingMoves(square, board, turn, castlingRights); break; default: moves = []; }
  if (!ignoreCheck) { moves = moves.filter(to => { const fakeState = {...{board, turn, castlingRights, enPassantTarget}, board:{...board}}; fakeState.board[to] = piece; delete fakeState.board[square]; return !isInCheck(fakeState, turn); }); }
  return moves;
}

function validateMove(state, move) {
  const { board, turn, status, castlingRights, enPassantTarget } = state
  if (status !== "active") return { ok: false, reason: "Game not active" }

  const piece = board[move.from]
  if (!piece) return { ok: false, reason: "No piece at source" }
  if (getPieceColor(piece) !== turn) return { ok: false, reason: "Not your turn" }

  const legalMoves = getLegalMoves(move.from, board, turn, castlingRights, enPassantTarget)
  if (!legalMoves.includes(move.to)) return { ok: false, reason: "Illegal move" }

  const targetPiece = board[move.to]
  const isCapture = targetPiece && getPieceColor(targetPiece) !== turn

  return { ok: true, capture: !!isCapture }
}

function applyMove(state, move, promotion = "q") {
  const turn = state.turn;

  let currentHasMoves = false;
  for (const sq in state.board) {
    if (getPieceColor(state.board[sq]) !== turn) continue;
    if (
      getLegalMoves(
        sq,
        state.board,
        turn,
        state.castlingRights,
        state.enPassantTarget
      ).length > 0
    ) {
      currentHasMoves = true;
      break;
    }
  }

  if (!currentHasMoves) {
    const status = isInCheck(state, turn) ? "checkmate" : "stalemate";
    return { ...state, status };
  }

  const board = { ...state.board };
  const piece = board[move.from];
  const pieceType = getPieceType(piece);

  const fromCoords = squareToCoords(move.from);
  const toCoords = squareToCoords(move.to);

  if (pieceType === "k") {
    const dx = toCoords.x - fromCoords.x;
    if (dx === 2) {
      const rookFrom = coordsToSquare(7, fromCoords.y);
      const rookTo = coordsToSquare(5, fromCoords.y);
      board[rookTo] = board[rookFrom];
      delete board[rookFrom];
    } else if (dx === -2) {
      const rookFrom = coordsToSquare(0, fromCoords.y);
      const rookTo = coordsToSquare(3, fromCoords.y);
      board[rookTo] = board[rookFrom];
      delete board[rookFrom];
    }
    state.castlingRights[turn] = { kingside: false, queenside: false };
  }

  if (pieceType === "p") {
    const rank = toCoords.y;
    if ((turn === "w" && rank === 7) || (turn === "b" && rank === 0)) {
      board[move.to] = turn + promotion;
    } else {
      board[move.to] = piece;
    }

    if (move.to === state.enPassantTarget) {
      const epCaptureY = turn === "w" ? toCoords.y - 1 : toCoords.y + 1;
      const epSquare = coordsToSquare(toCoords.x, epCaptureY);
      delete board[epSquare];
    }
  } else {
    board[move.to] = piece;
  }

  delete board[move.from];

  if (pieceType === "r") {
    const { x } = fromCoords;
    const y = turn === "w" ? 0 : 7;
    if (x === 0) state.castlingRights[turn].queenside = false;
    if (x === 7) state.castlingRights[turn].kingside = false;
  }

  let newEnPassant = null;
  if (pieceType === "p" && Math.abs(toCoords.y - fromCoords.y) === 2) {
    const epRank = (toCoords.y + fromCoords.y) / 2;
    newEnPassant = coordsToSquare(fromCoords.x, epRank);
  }

  const nextTurn = turn === "w" ? "b" : "w";
  let hasMoves = false;
  for (const sq in board) {
    if (getPieceColor(board[sq]) !== nextTurn) continue;
    if (
      getLegalMoves(sq, board, nextTurn, state.castlingRights, newEnPassant).length > 0
    ) {
      hasMoves = true;
      break;
    }
  }

  let newStatus = state.status;
  if (!hasMoves) {
    if (isInCheck({ board, turn: nextTurn }, nextTurn)) newStatus = "checkmate";
    else newStatus = "stalemate";
  }

  return {
    ...state,
    board,
    turn: nextTurn,
    lastMove: move,
    moveHistory: [...state.moveHistory, move],
    enPassantTarget: newEnPassant,
    status: newStatus
  };
}

module.exports = applyMove;

module.exports = {
  createInitialBoard,
  createGame,
  getPieceColor,
  getPieceType,
  isSquareOccupied,
  isOpponentPiece,
  squareToCoords,
  coordsToSquare,
  getPawnMoves,
  getKnightMoves,
  getSlidingMoves,
  getBishopMoves,
  getRookMoves,
  getQueenMoves,
  getKingMoves,
  findKingSquare,
  isSquareAttacked,
  isInCheck,
  getLegalMoves,
  validateMove,
  applyMove
};