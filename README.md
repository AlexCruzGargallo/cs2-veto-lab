# CS2 VetoLab

Herramienta de scouting para equipos de CS2 en FACEIT / ESEA: vetos, pool de mapas,
jugadores, liga y un simulador de veto contra un rival.

## Qué hace

- **Historial de vetos**: cada paso del veto de los últimos partidos (picks, bans y
  decider), con el ELO de cada equipo en ese partido.
- **Map pool**: win rate, diferencia de rondas y % de pick/ban por mapa, con etiquetas
  (Permaban, Comfort pick, Strong, Weak).
- **Jugadores**: % de partidos jugados, K/D, ADR, HS%, entradas y clutches, en total y
  por mapa. Avisa de cambios de roster.
- **Liga**: clasificación de ESEA y próximos partidos, con acceso directo a scoutear al rival.
- **Matchup**: compara dos equipos mapa a mapa y simula el veto (BO1/BO3), con modo
  *high risk* y probabilidad de jugar cada mapa.

Filtros: competición (todo / ESEA), periodo (todo / 3 meses / 1 mes), formato y
alineación actual.

## Puesta en marcha

Requisitos: Node 24 y `curl` en el PATH (FACEIT bloquea algunas peticiones de Node).

```bash
npm install
cp backend/.env.example backend/.env   # y rellena FACEIT_API_KEY
npm run dev:backend                     # http://localhost:3001
npm run dev:frontend                    # http://localhost:5173
```

### Variables de entorno (`backend/.env`)

| Variable | Obligatoria | Para qué |
|---|---|---|
| `FACEIT_API_KEY` | Sí | [FACEIT Data API](https://developers.faceit.com/) |
| `PORT` | No | Puerto del backend (por defecto 3001) |
| `CORS_ORIGIN` | No | Orígenes permitidos en desarrollo |
| `DB_PATH` | No | Base de datos SQLite (por defecto `backend/data/faceit.db`) |

## Scripts

| Comando | Qué hace |
|---|---|
| `npm test` | Tests de backend y frontend |
| `npm run lint` | ESLint del frontend |
| `npm run build` | Compila backend y frontend |
| `npm start --workspace=backend` | Producción: el backend sirve la API y el frontend compilado |

### Publicarlo (Render, gratis)

El repo incluye `render.yaml`: un solo servicio que sirve la API y la web.

1. Sube el repo a GitHub.
2. En [render.com](https://render.com): **New → Blueprint** y elige el repo.
3. Introduce `FACEIT_API_KEY` cuando lo pida. Cada push a `main` redespliega solo.

Plan gratuito: el servicio se duerme tras 15 min sin uso (la siguiente visita tarda
~1 min en despertar) y la caché se vacía al reiniciar. La API limita las peticiones por
IP para proteger el cupo de la clave de FACEIT.

Docker (producción, un solo contenedor):

```bash
docker build -t cs2-vetolab .
docker run -p 3001:3001 --env-file backend/.env -v veto-data:/data cs2-vetolab
```

## Arquitectura

```
shared/     tipos del contrato de la API (backend y frontend)
backend/    Express + SQLite
  services/faceitService.ts    llamadas a FACEIT (Data API oficial y endpoints internos)
  services/analysisService.ts  convierte cada partido al punto de vista del equipo
  services/leagueService.ts    clasificación y calendario de ESEA
  lib/cache.ts, lib/db.ts      caché en memoria + SQLite
frontend/   React + MUI + Vite
  utils/stats.ts     estadísticas, filtros y peso por nivel
  utils/matchup.ts   ventaja por mapa, simulador y probabilidades
  utils/roster.ts, utils/players.ts
```

Los partidos terminados no cambian, así que se guardan en SQLite: la primera carga de un
equipo tarda (cientos de llamadas a FACEIT), las siguientes son inmediatas, y el
histórico se acumula aunque FACEIT sólo devuelva los últimos partidos.

### Datos de FACEIT a tener en cuenta

Algunas cosas de FACEIT que no son obvias (todas cubiertas por tests):

- El último paso de un veto aparece como *pick* pero es el mapa que sobra (decider).
- Los partidos de ESEA no siempre llevan "ESEA" en el nombre: se detectan por el organizador.
- Un BO2 no es un BO3, y ESEA usa un orden de BO1 distinto al de otros torneos.
- En ESEA el quinto jugador a veces aparece como suplente: quién jugó sale de las estadísticas.

Si encuentras un partido que la app interpreta mal, grábalo y añade un test:

```bash
cd backend
npx tsx scripts/record-fixture.ts <matchId> <teamId> <nombre>
# y un caso nuevo en test/analysis.test.ts
```
