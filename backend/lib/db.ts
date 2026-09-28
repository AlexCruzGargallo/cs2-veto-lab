import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

// SQLite integrado en Node (sin dependencias nativas). Guarda:
// - cache: respuestas de Faceit que no cambian (partidos terminados, vetos,
//   estadísticas), para no volver a pedirlas tras reiniciar el servidor.
// - team_matches: índice de partidos por equipo. El historial de Faceit sólo
//   devuelve los últimos; así el histórico se acumula entre temporadas.

// Relativa a la carpeta backend/ (desde donde arrancan npm run dev y npm start).
const DB_PATH = process.env.DB_PATH ?? resolve("data/faceit.db");

let db: DatabaseSync | null = null;

function open() {
  if (db) return db;
  if (DB_PATH !== ":memory:") mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS team_matches (
      team_id TEXT NOT NULL,
      match_id TEXT NOT NULL,
      date INTEGER NOT NULL,
      PRIMARY KEY (team_id, match_id)
    );
    CREATE INDEX IF NOT EXISTS team_matches_by_date ON team_matches (team_id, date DESC);
  `);
  return db;
}

export function readCache<T>(key: string): T | undefined {
  const row = open()
    .prepare("SELECT value, expires_at FROM cache WHERE key = ?")
    .get(key) as { value: string; expires_at: number } | undefined;
  if (!row || row.expires_at <= Date.now()) return undefined;
  return JSON.parse(row.value) as T;
}

export function writeCache(key: string, value: unknown, expiresAt: number) {
  open()
    .prepare(
      `INSERT INTO cache (key, value, expires_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at`,
    )
    .run(key, JSON.stringify(value), expiresAt);
}

export function rememberTeamMatches(teamId: string, matches: { matchId: string; date: number }[]) {
  const insert = open().prepare(
    `INSERT INTO team_matches (team_id, match_id, date) VALUES (?, ?, ?)
     ON CONFLICT(team_id, match_id) DO UPDATE SET date = excluded.date`,
  );
  for (const m of matches) insert.run(teamId, m.matchId, m.date);
}

// Los partidos más recientes del equipo que conocemos (de Faceit o guardados).
export function knownTeamMatches(teamId: string, limit: number): string[] {
  const rows = open()
    .prepare("SELECT match_id FROM team_matches WHERE team_id = ? ORDER BY date DESC LIMIT ?")
    .all(teamId, limit) as { match_id: string }[];
  return rows.map((r) => r.match_id);
}

export function purgeExpired() {
  open().prepare("DELETE FROM cache WHERE expires_at <= ?").run(Date.now());
}
