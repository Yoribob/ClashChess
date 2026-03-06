const {
  createGame,
  applyMove,
  validateMove,
  getLegalMoves,
  isInCheck
} = require("../game/chessEngine.js");

describe("Game End and Turn Logic", () => {
  test("Cannot move opponent's piece", () => {
    let game = createGame("w1", "b1");
    const result = validateMove(game, { from: "a7", to: "a6" });
    expect(result.ok).toBe(false);
  });

  test("Illegal move rejected", () => {
    let game = createGame("w1", "b1");
    const result = validateMove(game, { from: "e2", to: "e5" });
    expect(result.ok).toBe(false);
  });

  test("Game detects check", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      e8: "bk",
      e5: "bq"
    };
    expect(isInCheck(game, "w")).toBe(true);
    expect(isInCheck(game, "b")).toBe(false);
  });

  test("Checkmate ends game", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e8: "bk",
      h7: "wr",
      g6: "wq",
      e1: "wk"
    };
    game.turn = "w";
    game = applyMove(game, { from: "g6", to: "e8" });
    expect(game.status).toBe("checkmate");
  });

  test("Stalemate ends game", () => {
    let game = createGame("w1", "b1");
    game.board = {
      a1: "bk",
      b3: "wr",
      c2: "wq",
      h8: "wk"
    };
    game.turn = "b";
    const moves = Object.keys(game.board).filter(
      sq => getLegalMoves(sq, game.board, "b", game.castlingRights, game.enPassantTarget).length > 0
    );
    expect(moves.length).toBe(0);
    game = applyMove(game, { from: "c2", to: "c2" });
    expect(game.status).toBe("stalemate");
  });

  test("Turn switches after valid move", () => {
    let game = createGame("w1", "b1");
    game = applyMove(game, { from: "e2", to: "e4" });
    expect(game.turn).toBe("b");
    game = applyMove(game, { from: "e7", to: "e5" });
    expect(game.turn).toBe("w");
  });

  test("Cannot move after game over", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e8: "bk",
      h7: "wr",
      g6: "wq",
      e1: "wk"
    };
    game.turn = "w";
    game = applyMove(game, { from: "g6", to: "e8" });
    const result = validateMove(game, { from: "e8", to: "d8" });
    expect(result.ok).toBe(false);
  });
});