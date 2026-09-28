// Primero de todo: los imports de módulos ES se evalúan antes que el resto
// del fichero, y algunos leen variables de entorno al cargarse.
import "dotenv/config";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import faceitRoutes from "./routes/faceit.js";
import { purgeExpired } from "./lib/db.js";
import { HttpError } from "./lib/http.js";

if (!process.env.FACEIT_API_KEY) {
  console.error("Falta FACEIT_API_KEY en backend/.env (ver .env.example)");
  process.exit(1);
}

const app = express();

app.use(
  cors({
    origin: (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(","),
  }),
);
app.use(express.json());

app.use("/api", faceitRoutes);
app.use("/api", (_req, _res, next) => next(new HttpError(404, "Not found")));

// En producción el backend sirve también el frontend compilado (un solo
// proceso y un solo puerto). En desarrollo lo sirve Vite.
// Rutas relativas a la carpeta backend/ (desde donde arrancan npm run dev y npm start).
const frontendDist = resolve(process.env.FRONTEND_DIST ?? "../frontend/dist");
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // Rutas del frontend (/team/..., /matchup): siempre index.html.
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(resolve(frontendDist, "index.html")));
}

const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const status = error instanceof HttpError ? error.status : 500;
  console.error(`[${req.method} ${req.originalUrl}] ${status}: ${error.message}`);
  res.status(status).json({ error: error.message });
};
app.use(errorHandler);

// Limpia de la base de datos las entradas caducadas.
purgeExpired();

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
