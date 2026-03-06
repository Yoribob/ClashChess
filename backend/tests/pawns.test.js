const {
  createGame,
  validateMove,
  applyMove,
  getLegalMoves,
  createInitialBoard,
  isInCheck
} = require("../game/chessEngine.js");

describe("Pawn moves", () => {
     test("Pawn can move forward one", () => {
    const game = createGame("w1", "b1");
    const moves = getLegalMoves("e2", game.board, "w", game.castlingRights, null);
    expect(moves).toContain("e3");
  });

  test("Pawn can move two from start", () => {
    const game = createGame("w1", "b1");
    const moves = getLegalMoves("e2", game.board, "w", game.castlingRights, null);
    expect(moves).toContain("e4");
  });
  
  test("Pawn cannot move backward", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      e8: "bk",
      e4: "wp"
    };
    const moves = getLegalMoves("e4", game.board, "w", game.castlingRights, null);
    expect(moves).not.toContain("e3");
  })
  test("Pawn cannot move forward if blocked", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      e8: "bk",
      e4: "wp",
      e5: "bp"
    };
    const moves = getLegalMoves("e4", game.board, "w", game.castlingRights, null);
    expect(moves).not.toContain("e5");
  })
  test("Pawn cannot move 2 squares if first square is blocked", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      e8: "bk",
      e2: "wp",
      e3: "bp"
    };
    const moves = getLegalMoves("e4", game.board, "w", game.castlingRights, null);
    expect(moves).not.toContain("e4");
  })

  test("Pawn can capture diagonally", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      e8: "bk",
      e4: "wp",
      d5: "bp"
    };
    const moves = getLegalMoves("e4", game.board, "w", game.castlingRights, null);
    expect(moves).toContain("d5");
    game = applyMove(game, {from: "e4", to: "d5"});
    expect(game.board["d5"]).toBe("wp");
    expect(game.board["e4"]).toBeUndefined();
  })

  test("En passant capture", () => {
    let game = createGame("w1", "b1");
    game.board = {
      e1: "wk",
      e8: "bk",
      g5: "wp",
      f7: "bp"
    };
    game.turn = "b";
    let moves = getLegalMoves("f7", game.board, "b", game.castlingRights, null);
    expect(moves).toContain("f5");
    game = applyMove(game, {from: "f7", to: "f5"});

    moves = getLegalMoves("g5", game.board, "w", game.castlingRights, game.enPassantTarget);
    expect(moves).toContain("f6");
  })
})