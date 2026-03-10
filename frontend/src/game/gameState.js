import { Piece, pieces } from "../graphics/pieces.js";

export function PositionFromFEN(fenString, scene) {
  const rows = fenString.split("/");
  let rankIndex = 0;

  for (const row of rows) {
    let fileIndex = 0;

    for (const char of row) {
      if (!isNaN(char)) {
        fileIndex += parseInt(char);
      } else {
        const color = char === char.toUpperCase() ? "w" : "b";
        const type = char.toLowerCase();
        const rank = 8 - rankIndex;

        if (rank < 1 || rank > 8) {
          console.error(
            `Invalid rank calculated: ${rank} for rankIndex ${rankIndex}`
          );
          fileIndex++;
          continue;
        }

        const squareNotation = String.fromCharCode(97 + fileIndex) + rank;

        if (fileIndex < 0 || fileIndex > 7 || rank < 1 || rank > 8) {
          console.error(
            `Invalid square notation: ${squareNotation} (fileIndex: ${fileIndex}, rank: ${rank})`
          );
          fileIndex++;
          continue;
        }

        const piece = new Piece(type, color, squareNotation);

        piece.load((mesh) => {
          scene.add(mesh);
        });

        pieces[squareNotation] = piece;

        fileIndex++;
      }
    }
    rankIndex++;
  }
}

export function syncBoardFromBackend(board, scene) {
  if (!board || typeof board !== "object") return;

  const toRemove = [];
  Object.entries(pieces).forEach(([square, piece]) => {
    const code = board[square];
    if (!code) {
      toRemove.push(square);
      return;
    }

    const color = code[0];
    const type = code[1].toLowerCase();
    if (piece.color !== color || piece.type !== type) {
      toRemove.push(square);
      return;
    }
    if (piece.position !== square) {
      piece.position = square;
    }
  });

  for (const square of toRemove) {
    const piece = pieces[square];
    if (piece) {
      if (piece.mesh && piece.mesh.parent) {
        piece.mesh.parent.remove(piece.mesh);
      }
      piece.position = null;
      delete pieces[square];
    }
  }

  const ghostKeys = [];
  Object.entries(pieces).forEach(([key, piece]) => {
    if (!piece || !piece.position) return;
    const code = board[piece.position];
    if (!code || code[0] !== piece.color || code[1].toLowerCase() !== piece.type) {
      ghostKeys.push(key);
    }
  });
  for (const key of ghostKeys) {
    const piece = pieces[key];
    if (piece) {
      if (piece.mesh && piece.mesh.parent) {
        piece.mesh.parent.remove(piece.mesh);
      }
      piece.position = null;
      delete pieces[key];
    }
  }

  for (const [squareNotation, code] of Object.entries(board)) {
    if (!code || typeof code !== "string" || code.length < 2) continue;
    const color = code[0];
    const type = code[1].toLowerCase();

    const existing = pieces[squareNotation];
    if (existing && existing.color === color && existing.type === type) {
      existing.position = squareNotation;
      continue;
    }

    const piece = new Piece(type, color, squareNotation);
    piece.load((mesh) => {
      scene.add(mesh);
    });
    pieces[squareNotation] = piece;
  }
}
