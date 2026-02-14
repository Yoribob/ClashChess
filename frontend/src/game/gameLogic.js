import { pieces } from "../graphics/pieces.js";

const files = "abcdefgh";

export function isKingInCheck(color, pieces) {
  const king = Object.values(pieces).find(
    (p) => p.type === "k" && p.color === color
  );
  if (!king) return false;

  return isSquareUnderAttack(king.position, color === "w" ? "b" : "w", pieces);
}

export function isSquareUnderAttack(square, attackingColor, pieces) {
  if (!square) return false;

  const attackingPieces = Object.values(pieces).filter(
    (p) => p && p.color === attackingColor && p.position && p.position !== null
  );

  for (const piece of attackingPieces) {
    if (!piece.position) continue;
    const legalMoves = getLegalMoves(piece.position, piece);
    if (legalMoves && legalMoves.includes(square)) {
      return true;
    }
  }

  return false;
}

export function wouldMoveExposeKingToCheck(
  fromSquare,
  toSquare,
  piece,
  pieces
) {
  if (!piece || !piece.position || piece.position !== fromSquare) {
    console.error("Invalid piece position in wouldMoveExposeKingToCheck");
    return true;
  }

  const originalPosition = piece.position;
  const capturedPiece =
    pieces[toSquare] ||
    Object.values(pieces).find(
      (p) => p && p.position === toSquare && p !== piece
    );

  piece.position = toSquare;

  let capturedPieceOriginalPosition = null;
  if (capturedPiece) {
    capturedPieceOriginalPosition = capturedPiece.position;
    capturedPiece.position = null;
    if (pieces[toSquare] === capturedPiece) {
      delete pieces[toSquare];
    }
  }

  if (pieces[originalPosition] === piece) {
    delete pieces[originalPosition];
  }
  pieces[toSquare] = piece;

  const kingInCheck = isKingInCheck(piece.color, pieces);

  piece.position = originalPosition;
  if (pieces[toSquare] === piece) {
    delete pieces[toSquare];
  }
  pieces[originalPosition] = piece;

  if (capturedPiece) {
    capturedPiece.position = capturedPieceOriginalPosition;
    if (capturedPieceOriginalPosition) {
      pieces[capturedPieceOriginalPosition] = capturedPiece;
    }
  }

  return kingInCheck;
}

export function getLegalMoves(squareName, selectedPiece) {
  const allowedMoves = [];

  if (!selectedPiece || !selectedPiece.position) {
    console.error("Invalid piece in getLegalMoves:", selectedPiece);
    return [];
  }

  const position = selectedPiece.position;
  if (!position || typeof position !== "string" || position.length !== 2) {
    console.error(`Invalid square notation format: "${position}"`);
    return [];
  }

  const file = position[0].toLowerCase();
  const rank = position[1];

  if (file < "a" || file > "h" || rank < "1" || rank > "8") {
    console.error(
      `Invalid square notation: "${position}" (file must be a-h, rank must be 1-8)`
    );
    return [];
  }

  const [currentFile, currentRank] = squareToCoords(position);

  if (
    currentFile < 0 ||
    currentFile > 7 ||
    currentRank < 0 ||
    currentRank > 7
  ) {
    console.error(
      `Invalid coordinates: file=${currentFile}, rank=${currentRank} for piece at ${position}`
    );
    return [];
  }

  switch (selectedPiece.type) {
    case "p": {
      const direction = selectedPiece.color === "w" ? 1 : -1;

      const oneStepRank = currentRank + direction;
      const oneStepSquare = files[currentFile] + (oneStepRank + 1);

      const pieceInFront = Object.values(pieces).find(
        (p) => p.position === oneStepSquare
      );
      if (!pieceInFront) {
        allowedMoves.push(oneStepSquare);

        if (
          (selectedPiece.color === "w" && currentRank === 1) ||
          (selectedPiece.color === "b" && currentRank === 6)
        ) {
          const twoStepRank = currentRank + 2 * direction;
          const twoStepSquare = files[currentFile] + (twoStepRank + 1);
          const pieceTwoSteps = Object.values(pieces).find(
            (p) => p.position === twoStepSquare
          );
          if (!pieceTwoSteps) allowedMoves.push(twoStepSquare);
        }
      }
      const diagOffsets = [-1, 1];
      diagOffsets.forEach((offset) => {
        const diagFile = currentFile + offset;
        if (diagFile < 0 || diagFile > 7) return;
        const diagRank = currentRank + direction;
        const diagSquare = files[diagFile] + (diagRank + 1);
        const targetPiece = Object.values(pieces).find(
          (p) => p.position === diagSquare
        );
        if (targetPiece && targetPiece.color !== selectedPiece.color) {
          allowedMoves.push(diagSquare);
        }
      });

      return allowedMoves;
    }

    case "b": {
      const directions = [
        [-1, +1],
        [+1, +1],
        [-1, -1],
        [+1, -1],
      ];
      directions.forEach(([df, dr]) => {
        let f = currentFile;
        let r = currentRank;

        while (true) {
          f += df;
          r += dr;
          if (f < 0 || f > 7 || r < 0 || r > 7) break;

          const square = files[f] + (r + 1);
          const targetPiece = Object.values(pieces).find(
            (p) => p.position === square
          );

          if (targetPiece) {
            if (targetPiece.color !== selectedPiece.color)
              allowedMoves.push(square);
            break;
          }

          allowedMoves.push(square);
        }
      });
      return allowedMoves;
    }

    case "r": {
      const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];

      directions.forEach(([df, dr]) => {
        let f = currentFile;
        let r = currentRank;

        while (true) {
          f += df;
          r += dr;

          if (f < 0 || f > 7 || r < 0 || r > 7) break;

          const square = files[f] + (r + 1);
          const targetPiece = Object.values(pieces).find(
            (p) => p.position === square
          );

          if (targetPiece) {
            if (targetPiece.color !== selectedPiece.color)
              allowedMoves.push(square);
            break;
          }

          allowedMoves.push(square);
        }
      });

      return allowedMoves;
    }

    case "q": {
      const directions = [
        [-1, +1],
        [+1, +1],
        [-1, -1],
        [+1, -1],
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      directions.forEach(([df, dr]) => {
        let f = currentFile;
        let r = currentRank;

        while (true) {
          f += df;
          r += dr;

          if (f < 0 || f > 7 || r < 0 || r > 7) break;

          const square = files[f] + (r + 1);
          const targetPiece = Object.values(pieces).find(
            (p) => p.position === square
          );

          if (targetPiece) {
            if (targetPiece.color !== selectedPiece.color)
              allowedMoves.push(square);
            break;
          }

          allowedMoves.push(square);
        }
      });

      return allowedMoves;
    }

    case "n": {
      const directions = [
        [+1, -2],
        [+1, +2],
        [-1, -2],
        [-1, +2],
        [+2, -1],
        [+2, +1],
        [-2, -1],
        [-2, +1],
      ];

      directions.forEach(([df, dr]) => {
        const f = currentFile + df;
        const r = currentRank + dr;

        if (f < 0 || f > 7 || r < 0 || r > 7) return;

        const square = files[f] + (r + 1);
        const targetPiece = Object.values(pieces).find(
          (p) => p.position === square
        );

        if (!targetPiece || targetPiece.color !== selectedPiece.color) {
          allowedMoves.push(square);
        }
      });

      return allowedMoves;
    }

    case "k": {
      const directions = [
        [-1, 0],
        [-1, +1],
        [0, -1],
        [+1, -1],
        [+1, 0],
        [+1, +1],
        [0, +1],
        [-1, -1],
      ];
      directions.forEach(([df, dr]) => {
        const f = currentFile + df;
        const r = currentRank + dr;

        if (f < 0 || f > 7 || r < 0 || r > 7) return;

        const square = files[f] + (r + 1);
        const targetPiece = Object.values(pieces).find(
          (p) => p.position === square
        );

        if (!targetPiece || targetPiece.color !== selectedPiece.color) {
          allowedMoves.push(square);
        }
      });

      return allowedMoves;
    }

    default:
      return [];
  }
}

export function getLegalMovesWithCheckValidation(squareName, selectedPiece) {
  const allMoves = getLegalMoves(squareName, selectedPiece);
  const legalMoves = [];

  for (const move of allMoves) {
    if (!wouldMoveExposeKingToCheck(squareName, move, selectedPiece, pieces)) {
      legalMoves.push(move);
    }
  }

  return legalMoves;
}

export function squareToCoords(square) {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = parseInt(square[1]) - 1;
  return [file, rank];
}

export function coordsToSquare(file, rank) {
  return String.fromCharCode("a".charCodeAt(0) + file) + (rank + 1);
}
