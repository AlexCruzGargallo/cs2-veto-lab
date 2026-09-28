import { readCache, writeCache } from "./db.js";

// Caché en dos niveles:
// 1. Memoria (LRU con TTL): lo más rápido.
// 2. SQLite: sólo para entradas de larga duración (partidos terminados, vetos,
//    estadísticas), que así sobreviven a un reinicio del servidor.
// También deduplica peticiones en vuelo: si dos requests piden la misma clave
// a la vez, sólo se lanza una llamada a Faceit.

type Entry = { value: unknown; expiresAt: number };

const MAX_ENTRIES = 5000;
const store = new Map<string, Entry>();
const inFlight = new Map<string, Promise<unknown>>();

export const TTL = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  month: 30 * 86_400_000,
};

// A partir de esta duración merece la pena guardar la entrada en disco.
const PERSIST_FROM = TTL.hour;

function remember(key: string, value: unknown, expiresAt: number) {
  store.set(key, { value, expiresAt });
  if (store.size > MAX_ENTRIES) {
    store.delete(store.keys().next().value!);
  }
}

export async function cached<T>(
  key: string,
  ttl: number | ((value: T) => number),
  load: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    // Reinsertar la mueve al final: el Map actúa como LRU.
    store.delete(key);
    store.set(key, hit);
    return hit.value as T;
  }

  const persisted = readCache<{ value: T; expiresAt: number }>(key);
  if (persisted) {
    remember(key, persisted.value, persisted.expiresAt);
    return persisted.value;
  }

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = load()
    .then((value) => {
      const ms = typeof ttl === "function" ? ttl(value) : ttl;
      if (ms > 0) {
        const expiresAt = Date.now() + ms;
        remember(key, value, expiresAt);
        if (ms >= PERSIST_FROM) writeCache(key, { value, expiresAt }, expiresAt);
      }
      return value;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}
