const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbDir = path.join(__dirname, "../db");

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.join(dbDir, "database.sqlite"));

db.exec(`
CREATE TABLE IF NOT EXISTS pokemon_search_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  command TEXT NOT NULL,
  pokemon_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS catch_compare_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  pokemon_name TEXT NOT NULL,
  hp_percent REAL NOT NULL,
  status TEXT NOT NULL,
  best_ball TEXT NOT NULL,
  best_probability REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

function logPokemonSearch({ userId, username, command, pokemonName }) {
  db.prepare(
    `
    INSERT INTO pokemon_search_logs
    (user_id, username, command, pokemon_name)
    VALUES (?, ?, ?, ?)
  `,
  ).run(userId, username, command, pokemonName);
}

function logCatchCompare({
  userId,
  username,
  pokemonName,
  hpPercent,
  status,
  bestBall,
  bestProbability,
}) {
  db.prepare(
    `
    INSERT INTO catch_compare_logs
    (user_id, username, pokemon_name, hp_percent, status, best_ball, best_probability)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    userId,
    username,
    pokemonName,
    hpPercent,
    status,
    bestBall,
    bestProbability,
  );
}

module.exports = {
  db,
  logPokemonSearch,
  logCatchCompare,
};
