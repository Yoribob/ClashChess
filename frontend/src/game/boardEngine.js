export function createInitialBoard() {
  return {
    a1: "wr", b1: "wn", c1: "wb", d1: "wq", e1: "wk", f1: "wb", g1: "wn", h1: "wr",
    a2: "wp", b2: "wp", c2: "wp", d2: "wp", e2: "wp", f2: "wp", g2: "wp", h2: "wp",
    a7: "bp", b7: "bp", c7: "bp", d7: "bp", e7: "bp", f7: "bp", g7: "bp", h7: "bp",
    a8: "br", b8: "bn", c8: "bb", d8: "bq", e8: "bk", f8: "bb", g8: "bn", h8: "br",
  };
}

export function normalizeCastlingRights(castling) {
  if (!castling) {
    return {
      w: { kingside: false, queenside: false },
      b: { kingside: false, queenside: false },
    };
  }

  if (castling.w && castling.b) return castling;

  return {
    w: {
      kingside: Boolean(castling.whiteKingSide),
      queenside: Boolean(castling.whiteQueenSide),
    },
    b: {
      kingside: Boolean(castling.blackKingSide),
      queenside: Boolean(castling.blackQueenSide),
    },
  };
}

export function getPieceColor(piece) {
  return piece ? piece[0] : null;
}

export function getPieceType(piece) {
  return piece ? piece[1] : null;
}

export function squareToCoords(square) {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = parseInt(square[1], 10) - 1;
  return { x: file, y: rank };
}

export function coordsToSquare(x, y) {
  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  return String.fromCharCode("a".charCodeAt(0) + x) + (y + 1);
}

function isSquareOccupied(board, square) {
  return Boolean(board && board[square]);
}

function isOpponentPiece(board, square, turn) {
  const piece = board[square];
  return piece && getPieceColor(piece) !== turn;
}

function getPawnMoves(square, board, turn, enPassantTarget) {
  const moves = [];
  const { x, y } = squareToCoords(square);
  const dir = turn === "w" ? 1 : -1;
  const startRank = turn === "w" ? 1 : 6;

  const forward = coordsToSquare(x, y + dir);
  if (forward && !isSquareOccupied(board, forward)) {
    moves.push(forward);
    if (y === startRank) {
      const two = coordsToSquare(x, y + dir * 2);
      if (two && !isSquareOccupied(board, two)) moves.push(two);
    }
  }

  for (const dx of [-1, 1]) {
    const target = coordsToSquare(x + dx, y + dir);
    if (!target) continue;
    if (isOpponentPiece(board, target, turn) || target === enPassantTarget) {
      moves.push(target);
    }
  }
  return moves;
}

function getKnightMoves(square, board, turn) {
  const moves = [];
  const { x, y } = squareToCoords(square);
  const offsets = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
  for (const [dx, dy] of offsets) {
    const target = coordsToSquare(x + dx, y + dy);
    if (!target) continue;
    if (!isSquareOccupied(board, target) || isOpponentPiece(board, target, turn)) {
      moves.push(target);
    }
  }
  return moves;
}

function getSlidingMoves(square, board, turn, directions) {
  const moves = [];
  const { x, y } = squareToCoords(square);
  for (const [dx, dy] of directions) {
    let nx = x + dx;
    let ny = y + dy;
    while (nx >= 0 && nx <= 7 && ny >= 0 && ny <= 7) {
      const target = coordsToSquare(nx, ny);
      if (!target) break;
      if (!isSquareOccupied(board, target)) {
        moves.push(target);
      } else {
        if (isOpponentPiece(board, target, turn)) moves.push(target);
        break;
      }
      nx += dx;
      ny += dy;
    }
  }
  return moves;
}

function getBishopMoves(square, board, turn) {
  return getSlidingMoves(square, board, turn, [[1,1],[1,-1],[-1,-1],[-1,1]]);
}
function getRookMoves(square, board, turn) {
  return getSlidingMoves(square, board, turn, [[0,1],[1,0],[0,-1],[-1,0]]);
}
function getQueenMoves(square, board, turn) {
  return [...getBishopMoves(square, board, turn), ...getRookMoves(square, board, turn)];
}

function getKingMoves(square, board, turn, castlingRightsRaw) {
  const castlingRights = normalizeCastlingRights(castlingRightsRaw);
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

  const rights = castlingRights[turn] || { kingside: false, queenside: false };
  if (rights.kingside) {
    const fSquare = coordsToSquare(x + 1, y);
    const gSquare = coordsToSquare(x + 2, y);
    const rookSquare = coordsToSquare(x + 3, y);
    if (
      fSquare && gSquare && rookSquare &&
      !isSquareOccupied(board, fSquare) &&
      !isSquareOccupied(board, gSquare) &&
      board[rookSquare] &&
      getPieceType(board[rookSquare]) === "r"
    ) {
      moves.push(gSquare);
    }
  }
  if (rights.queenside) {
    const dSquare = coordsToSquare(x - 1, y);
    const cSquare = coordsToSquare(x - 2, y);
    const bSquare = coordsToSquare(x - 3, y);
    const rookSquare = coordsToSquare(x - 4, y);
    if (
      dSquare && cSquare && bSquare && rookSquare &&
      !isSquareOccupied(board, dSquare) &&
      !isSquareOccupied(board, cSquare) &&
      !isSquareOccupied(board, bSquare) &&
      board[rookSquare] &&
      getPieceType(board[rookSquare]) === "r"
    ) {
      moves.push(cSquare);
    }
  }

  return moves;
}

function findKingSquare(board, turn) {
  for (const sq in board) {
    const p = board[sq];
    if (p && getPieceColor(p) === turn && getPieceType(p) === "k") return sq;
  }
  return null;
}

export function getLegalMoves(from, board, turn, castling, enPassantTarget, ignoreCheck = false) {
  const piece = board[from];
  if (!piece || getPieceColor(piece) !== turn) return [];

  let moves = [];
  const t = getPieceType(piece);
  if (t === "p") moves = getPawnMoves(from, board, turn, enPassantTarget);
  else if (t === "n") moves = getKnightMoves(from, board, turn);
  else if (t === "b") moves = getBishopMoves(from, board, turn);
  else if (t === "r") moves = getRookMoves(from, board, turn);
  else if (t === "q") moves = getQueenMoves(from, board, turn);
  else if (t === "k") moves = getKingMoves(from, board, turn, castling);

  if (ignoreCheck) return moves;

  return moves.filter((to) => {
    const fake = applyMoveToState(
      { board, turn, castling, enPassantTarget, status: "active" },
      { from, to },
      true
    );
    return !isInCheck(fake, turn);
  });
}

function isSquareAttacked(board, square, attackerColor) {
  for (const sq in board) {
    const piece = board[sq];
    if (!piece || getPieceColor(piece) !== attackerColor) continue;
    const moves = getLegalMoves(
      sq,
      board,
      attackerColor,
      { w: { kingside: true, queenside: true }, b: { kingside: true, queenside: true } },
      null,
      true
    );
    if (moves.includes(square)) return true;
  }
  return false;
}

export function isInCheck(state, turn) {
  const kingSquare = findKingSquare(state.board, turn);
  if (!kingSquare) return true;
  return isSquareAttacked(state.board, kingSquare, turn === "w" ? "b" : "w");
}

export function validateMove(state, move) {
  const { board, turn, status, castling, enPassantTarget } = state;
  if (status !== "active") return { ok: false, reason: "Game not active" };

  const piece = board[move.from];
  if (!piece) return { ok: false, reason: "No piece at source" };
  if (getPieceColor(piece) !== turn) return { ok: false, reason: "Not your turn" };

  const legalMoves = getLegalMoves(move.from, board, turn, castling, enPassantTarget, false);
  if (!legalMoves.includes(move.to)) return { ok: false, reason: "Illegal move" };

  const targetPiece = board[move.to];
  const isCapture = Boolean(targetPiece && getPieceColor(targetPiece) !== turn) || move.to === enPassantTarget;
  return { ok: true, capture: isCapture };
}

function applyMoveToState(state, move, forValidation = false) {
  const turn = state.turn;
  const board = { ...state.board };
  const piece = board[move.from];
  const pieceType = getPieceType(piece);

  const fromCoords = squareToCoords(move.from);
  const toCoords = squareToCoords(move.to);

  const castlingRights = normalizeCastlingRights(state.castling);
  let nextCastling = {
    w: { ...castlingRights.w },
    b: { ...castlingRights.b },
  };

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
    nextCastling[turn] = { kingside: false, queenside: false };
  }

  let newEnPassant = null;
  if (pieceType === "p" && Math.abs(toCoords.y - fromCoords.y) === 2) {
    const epRank = (toCoords.y + fromCoords.y) / 2;
    newEnPassant = coordsToSquare(fromCoords.x, epRank);
  }

  if (pieceType === "p") {
    if (move.to === state.enPassantTarget) {
      const epCaptureY = turn === "w" ? toCoords.y - 1 : toCoords.y + 1;
      const epSquare = coordsToSquare(toCoords.x, epCaptureY);
      delete board[epSquare];
    }
  }

  board[move.to] = piece;
  delete board[move.from];

  if (pieceType === "r") {
    const { x } = fromCoords;
    if (x === 0) nextCastling[turn].queenside = false;
    if (x === 7) nextCastling[turn].kingside = false;
  }

  const nextTurn = turn === "w" ? "b" : "w";

  let status = state.status;
  if (!forValidation) {
    let hasMoves = false;
    for (const sq in board) {
      if (getPieceColor(board[sq]) !== nextTurn) continue;
      if (
        getLegalMoves(
          sq,
          board,
          nextTurn,
          nextCastling,
          newEnPassant,
          false
        ).length > 0
      ) {
        hasMoves = true;
        break;
      }
    }
    if (!hasMoves) {
      status = isInCheck({ board }, nextTurn) ? "checkmate" : "stalemate";
    }
  }

  return {
    board,
    turn: nextTurn,
    status,
    castling: nextCastling,
    enPassantTarget: newEnPassant,
  };
}

export function applyMove(state, move) {
  return applyMoveToState(state, move, false);
}

