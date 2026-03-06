const { createGame, getLegalMoves, applyMove, isSquareOccupied } = require("../game/chessEngine.js");

describe("Knight moves", () => {

  test("Knight can jump over pieces", () => {
    const game = createGame("w1", "b1");
    const moves = getLegalMoves("b1", game.board, "w", game.castlingRights, null);
    expect(moves).toContain("a3");
    expect(moves).toContain("c3");
  });

  test("Knight can capture opponent pieces", () => {
    let game = createGame("w1", "b1");
    game.board.c3 = "bp";
    const moves = getLegalMoves("b1", game.board, "w", game.castlingRights, null);
    expect(moves).toContain("c3");
  });

  test("Knight move does not include squares occupied by same color", () => {
    const game = createGame("w1", "b1");
    game.board.c3 = "wp";
    const moves = getLegalMoves("b1", game.board, "w", game.castlingRights, null);
    expect(moves).not.toContain("c3");
  });

});