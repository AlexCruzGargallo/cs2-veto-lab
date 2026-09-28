// Graba las respuestas reales de Faceit de un partido como fixture de test.
//
//   npx tsx scripts/record-fixture.ts <matchId> <teamId> <nombre>
//
// Cuando aparezca un partido que la app interpreta mal, grábalo con este script
// y añade un test en test/analysis.test.ts: así el fallo no vuelve.

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Sin tocar la base de datos real.
process.env.DB_PATH = ":memory:";

const { getMatchData, getMatchDetailsV2, getMatchStats, getMatchVetos } = await import(
  "../services/faceitService.js"
);

const [matchId, teamId, name] = process.argv.slice(2);
if (!matchId || !teamId || !name) {
  console.error("Uso: npx tsx scripts/record-fixture.ts <matchId> <teamId> <nombre>");
  process.exit(1);
}

const [match, vetos, stats, details] = await Promise.all([
  getMatchData(matchId),
  getMatchVetos(matchId).catch(() => null),
  getMatchStats(matchId).catch(() => null),
  getMatchDetailsV2(matchId).catch(() => null),
]);

// De la API interna sólo interesa el ELO de cada jugador: se recorta el resto
// para que el fixture no pese de más.
const slimDetails = details && {
  status: details.status,
  teams: Object.fromEntries(
    ["faction1", "faction2"].map((f) => [
      f,
      { roster: (details.teams?.[f]?.roster ?? []).map((p: any) => ({ id: p.id, elo: p.elo })) },
    ]),
  ),
};

const dir = resolve(import.meta.dirname, "../test/fixtures");
mkdirSync(dir, { recursive: true });
const file = resolve(dir, `${name}.json`);
writeFileSync(file, JSON.stringify({ teamId, match, vetos, stats, details: slimDetails }, null, 2));
console.log(`Guardado ${file}`);
