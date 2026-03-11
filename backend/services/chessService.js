const { getDb } = require("../config/db");
const { ObjectId } = require("mongodb");
const {
  createGame,
  applyMove,
  validateMove,
} = require("../game/chessEngine");

function getGamesCollection() {
  const db = getDb();
  return db.collection("games");
}

function getUsersCollection() {
  return getDb().collection("users");
}

async function updateWinLossStats(winnerId, loserId) {
  if (!winnerId || !loserId) return;
  const users = getUsersCollection();
  await Promise.all([
    users.updateOne(
      { _id: new ObjectId(winnerId) },
      { $inc: { gamesWon: 1, gamesPlayed: 1 } }
    ),
    users.updateOne(
      { _id: new ObjectId(loserId) },
      { $inc: { gamesLost: 1, gamesPlayed: 1 } }
    ),
  ]);
}

function mapGameDoc(doc) {
  if (!doc) return null;
  return {
    _id: doc._id.toString(),
    players: doc.players,
    board: doc.board,
    turn: doc.turn,
    status: doc.status,
    castling: doc.castling,
    enPassantTarget: doc.enPassantTarget ?? null,
    moves: doc.moves ?? [],
    createdAt: doc.createdAt,
  };
}

async function findGameById(gameId) {
  const games = getGamesCollection();
  const doc = await games.findOne({ _id: new ObjectId(gameId) });
  return mapGameDoc(doc);
}

async function updateGameById(gameId, update) {
  const games = getGamesCollection();
  await games.updateOne(
    { _id: new ObjectId(gameId) },
    { $set: update }
  );
  const updated = await games.findOne({ _id: new ObjectId(gameId) });
  return mapGameDoc(updated);
}

function engineStateFromDoc(doc) {
  const castlingRights = {
    w: {
      kingside: doc.castling.whiteKingSide,
      queenside: doc.castling.whiteQueenSide,
    },
    b: {
      kingside: doc.castling.blackKingSide,
      queenside: doc.castling.blackQueenSide,
    },
  };

  return {
    board: doc.board,
    turn: doc.turn === "white" ? "w" : "b",
    players: {
      w: doc.players.white,
      b: doc.players.black,
    },
    status: doc.status,
    lastMove: null,
    moveHistory: doc.moves || [],
    castlingRights,
    enPassantTarget: doc.enPassantTarget,
  };
}

function docFromEngineState(baseDoc, state) {
  return {
    ...baseDoc,
    board: state.board,
    turn: state.turn === "w" ? "white" : "black",
    status: state.status,
    castling: {
      whiteKingSide: state.castlingRights.w.kingside,
      whiteQueenSide: state.castlingRights.w.queenside,
      blackKingSide: state.castlingRights.b.kingside,
      blackQueenSide: state.castlingRights.b.queenside,
    },
    enPassantTarget: state.enPassantTarget,
    moves: state.moveHistory,
  };
}

async function createChessGame(whiteUserId, blackUserId) {
  const engineGame = createGame(whiteUserId, blackUserId);

  const gameDoc = {
    players: {
      white: whiteUserId,
      black: blackUserId,
    },
    board: engineGame.board,
    turn: engineGame.turn === "w" ? "white" : "black",
    status: engineGame.status,
    castling: {
      whiteKingSide: engineGame.castlingRights.w.kingside,
      whiteQueenSide: engineGame.castlingRights.w.queenside,
      blackKingSide: engineGame.castlingRights.b.kingside,
      blackQueenSide: engineGame.castlingRights.b.kingside,
    },
    enPassantTarget: engineGame.enPassantTarget,
    moves: engineGame.moveHistory,
    createdAt: new Date(),
  };

  const games = getGamesCollection();
  const result = await games.insertOne(gameDoc);
  const created = await games.findOne({ _id: result.insertedId });
  return mapGameDoc(created);
}

async function getChessGame(gameId) {
  const game = await findGameById(gameId);
  if (!game) throw new Error("Game not found");
  return game;
}

async function makeMove(gameId, move) {
  const gameDoc = await findGameById(gameId);
  if (!gameDoc) throw new Error("Game not found");

  const engineState = engineStateFromDoc(gameDoc);
  const validation = validateMove(engineState, move);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason, game: gameDoc };
  }

  const nextState = applyMove(engineState, move);
  const updatedDoc = docFromEngineState(gameDoc, nextState);

  const saved = await updateGameById(gameId, {
    board: updatedDoc.board,
    turn: updatedDoc.turn,
    status: updatedDoc.status,
    castling: updatedDoc.castling,
    enPassantTarget: updatedDoc.enPassantTarget,
    moves: updatedDoc.moves,
  });

  if (saved.status === "checkmate") {
    const loserId = saved.turn === "white" ? gameDoc.players.white : gameDoc.players.black;
    const winnerId = saved.turn === "white" ? gameDoc.players.black : gameDoc.players.white;
    await updateWinLossStats(winnerId, loserId);
  }

  return { ok: true, game: saved, move };
}


async function endGameAsCheckmate(gameId, loserColor) {
  const gameDoc = await findGameById(gameId);
  if (!gameDoc) throw new Error("Game not found");
  if (gameDoc.status !== "active") return gameDoc;

  const updated = await updateGameById(gameId, {
    status: "checkmate",
    turn: loserColor,
  });

  const winnerId =
    loserColor === "white" ? gameDoc.players.black : gameDoc.players.white;
  const loserId =
    loserColor === "white" ? gameDoc.players.white : gameDoc.players.black;
  await updateWinLossStats(winnerId, loserId);

  return updated;
}

module.exports = {
  createChessGame,
  getChessGame,
  makeMove,
  endGameAsCheckmate,
};

