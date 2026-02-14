const { MongoClient } = require("mongodb");
require("dotenv").config();

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;
if(!DB_NAME) throw new Error("DB_NAME is not in .env");
if (!URI) {
  throw new Error("No MongoDB URI added to .env");
}

const client = new MongoClient(URI, {
  serverSelectionTimeoutMS: 5000,
  appName: "ClashChess",
  retryWrites: true,
});

let db = null;

async function initDb() {
  if (db) return db;
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`Connected to DB '${DB_NAME}' successfully`);
  return db;
}

function getDb() {
  if (!db)
    throw new Error(
      "Database not initialized. Call initDb() before using the DB."
    );
  return db;
}

module.exports = { initDb, getDb, client };
