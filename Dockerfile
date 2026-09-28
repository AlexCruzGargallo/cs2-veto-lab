# Imagen de producción: el backend sirve la API y el frontend compilado.
#   docker build -t map-veto-scout .
#   docker run -p 3001:3001 --env-file backend/.env -v veto-data:/data map-veto-scout

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-slim
# El backend usa curl para los endpoints de Faceit que bloquea Cloudflare.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY shared/ shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --workspace=backend --include-workspace-root=false
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/frontend/dist frontend/dist

ENV PORT=3001 DB_PATH=/data/faceit.db FRONTEND_DIST=/app/frontend/dist
VOLUME /data
EXPOSE 3001
WORKDIR /app/backend
CMD ["node", "--disable-warning=ExperimentalWarning", "dist/index.js"]
