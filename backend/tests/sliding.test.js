const {
  createGame,
  getLegalMoves,
  createInitialBoard,
  applyMove
} = require("../game/chessEngine.js");

describe("Sliding Pieces", () => {

  describe("Bishop moves", () => {
    test("Bishop moves diagonally on empty board", () => {
      let game = createGame("w1", "b1");
      game.board = { d4: "wb", e1: "wk", e8: "bk" };
      const moves = getLegalMoves("d4", game.board, "w", game.castlingRights, null);
      expect(moves).toEqual(expect.arrayContaining([
        "c3","b2","a1","e5","f6","g7","h8","c5","b6","a7","e3","f2","g1"
      ]));
    });

    test("Bishop cannot move through own pieces", () => {
      let game = createGame("w1", "b1");
      game.board = { d4: "wb", c5: "wp", e3: "wp", e1: "wk", e8: "bk" };
      const moves = getLegalMoves("d4", game.board, "w", game.castlingRights, null);
      expect(moves).toEqual(expect.arrayContaining([
        "c3","b2","a1","e5","f6","g7","h8"
      ]));
      expect(moves).not.toContain("c5");
      expect(moves).not.toContain("e3");
    });

    test("Bishop can capture opponent pieces", () => {
      let game = createGame("w1", "b1");
      game.board = { d4: "wb", c5: "bp", e3: "bp", e1: "wk", e8: "bk" };
      const moves = getLegalMoves("d4", game.board, "w", game.castlingRights, null);
      expect(moves).toEqual(expect.arrayContaining([
        "c5","e3","c3","b2","a1","e5","f6","g7","h8"
      ]));
    });
  });

  describe("Rook moves", () => {
    test("Rook moves straight on empty board", () => {
      let game = createGame("w1", "b1");
      game.board = { d4: "wr", e1: "wk", e8: "bk" };
      const moves = getLegalMoves("d4", game.board, "w", game.castlingRights, null);
      expect(moves).toEqual(expect.arrayContaining([
        "d1","d2","d3","d5","d6","d7","d8",
        "a4","b4","c4","e4","f4","g4","h4"
      ]));
    });

    test("Rook cannot move through own pieces", () => {
      let game = createGame("w1", "b1");
      game.board = { d4: "wr", d6: "wp", f4: "wp", e1: "wk", e8: "bk" };
      const moves = getLegalMoves("d4", game.board, "w", game.castlingRights, null);
      expect(moves).toEqual(expect.arrayContaining([
        "d5","d3","d2","d1","a4","b4","c4","e4"
      ]));
      expect(moves).not.toContain("d6");
      expect(moves).not.toContain("f4");
    });

    test("Rook can capture opponent pieces", () => {
      let game = createGame("w1", "b1");
      game.board = { d4: "wr", d6: "bp", f4: "bp", e1: "wk", e8: "bk" };
      const moves = getLegalMoves("d4", game.board, "w", game.castlingRights, null);
      expect(moves).toEqual(expect.arrayContaining([
        "d5","d6","d3","d2","d1","a4","b4","c4","e4","f4"
      ]));
    });
  });

  describe("Queen moves", () => {
    test("Queen moves in all directions on empty board", () => {
      let game = createGame("w1", "b1");
      game.board = { d4: "wq", e1: "wk", e8: "bk" };
      const moves = getLegalMoves("d4", game.board, "w", game.castlingRights, null);
      expect(moves).toEqual(expect.arrayContaining([
        "d1","d2","d3","d5","d6","d7","d8",
        "a4","b4","c4","e4","f4","g4","h4",
        "c3","b2","a1","e5","f6","g7","h8",
        "c5","b6","a7","e3","f2","g1"
      ]));
    });

    test("Queen cannot move through own pieces", () => {
      let game = createGame("w1", "b1");
      game.board = { d4: "wq", d6: "wp", f4: "wp", c3: "wp", e3: "wp", e1: "wk", e8: "bk" };
      const moves = getLegalMoves("d4", game.board, "w", game.castlingRights, null);
      expect(moves).toEqual(expect.arrayContaining([
        "d5","d3","d2","d1","a4","b4","c4","e4",
        "c5","b6","a7","e5","f6","g7","h8"
      ]));
      expect(moves).not.toContain("d6");
      expect(moves).not.toContain("f4");
      expect(moves).not.toContain("c3");
      expect(moves).not.toContain("e3");
    });

    test("Queen can capture opponent pieces", () => {
      let game = createGame("w1", "b1");
      game.board = { d4: "wq", d6: "bp", f4: "bp", c3: "bp", e3: "bp", e1: "wk", e8: "bk" };
      const moves = getLegalMoves("d4", game.board, "w", game.castlingRights, null);
      expect(moves).toEqual(expect.arrayContaining([
        "d5","d6","d3","d2","d1","a4","b4","c4","e4",
        "c5","b6","a7","e5","f6","g7","h8",
        "c3","e3","f4"
      ]));
    });
  });

});