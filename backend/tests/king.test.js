const {
  createGame,
  applyMove,
  getLegalMoves,
  isInCheck
} = require("../game/chessEngine.js");

describe("King moves", () => {
  test("King moves one square in all directions", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      e8: "bk"
    };
    const moves = getLegalMoves("e1", game.board, "w", game.castlingRights, null);
    expect(moves).toEqual(expect.arrayContaining(["d1", "f1", "d2", "e2", "f2"]));
  });

  test("King cannot move into occupied square by same color", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      d1: "wp",
      e8: "bk"
    };
    const moves = getLegalMoves("e1", game.board, "w", game.castlingRights, null);
    expect(moves).not.toContain("d1");
  });

  test("King cannot move into check", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      e8: "bk",
      e5: "bq"
    };
    const moves = getLegalMoves("e1", game.board, "w", game.castlingRights, null);
    expect(moves).not.toContain("e2");
  });

  test("King can escape check", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      e8: "bk",
      d2: "bq"
    };
    const moves = getLegalMoves("e1", game.board, "w", game.castlingRights, null);
    expect(moves).toEqual(expect.arrayContaining(["d2", "f1"]));
  });

  test("King in check detected", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      e8: "bk",
      e5: "bq"
    };
    expect(isInCheck(game, "w")).toBe(true);
    expect(isInCheck(game, "b")).toBe(false);
  });

});