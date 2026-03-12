const {
  createGame,
  applyMove,
  getLegalMoves,
} = require("../game/chessEngine.js");

describe("Castling", () => {
  test("White kingside castling possible", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      h1: "wr",
      e8: "bk",
      a8: "br"
    };
    let moves = getLegalMoves("e1", game.board, "w", game.castlingRights, null);
    expect(moves).toContain("g1");
  });

  test("White queenside castling possible", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      a1: "wr",
      e8: "bk",
      h8: "br"
    };
    let moves = getLegalMoves("e1", game.board, "w", game.castlingRights, null);
    expect(moves).toContain("c1");
  });

  test("Castling blocked by pieces", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      h1: "wr",
      f1: "wp",
      e8: "bk",
    };
    let moves = getLegalMoves("e1", game.board, "w", game.castlingRights, null);
    expect(moves).not.toContain("g1");
  });

  test("Castling after king moved is not allowed", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      h1: "wr",
      e8: "bk",
    };
    game.castlingRights.w.kingside = false;
    let moves = getLegalMoves("e1", game.board, "w", game.castlingRights, null);
    expect(moves).not.toContain("g1");
  });

  test("Castling after rook moved is not allowed", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      h1: "wr",
      e8: "bk",
    };
    game.castlingRights.w.kingside = false;
    let moves = getLegalMoves("e1", game.board, "w", game.castlingRights, null);
    expect(moves).not.toContain("g1");
  });

  test("Cannot castle while in check", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      h1: "wr",
      e8: "bk",
      e2: "br",
    };
    let moves = getLegalMoves("e1", game.board, "w", game.castlingRights, null);
    expect(moves).not.toContain("g1");
  });

  test("Cannot castle through check", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      h1: "wr",
      e8: "bk",
      f3: "br", // attacks f1
    };
    let moves = getLegalMoves("e1", game.board, "w", game.castlingRights, null);
    expect(moves).not.toContain("g1");
  });

});