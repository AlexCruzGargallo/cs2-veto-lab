// El pool de mapas no está fijo aquí: se deduce de los vetos reales, así que
// sigue funcionando cuando Faceit rota mapas (p. ej. de_cache). Esto sólo da
// nombres bonitos e imágenes para los mapas que conocemos.

const MAP_NAMES: Record<string, string> = {
  de_dust2: "Dust 2",
  de_mirage: "Mirage",
  de_inferno: "Inferno",
  de_nuke: "Nuke",
  de_ancient: "Ancient",
  de_anubis: "Anubis",
  de_overpass: "Overpass",
  de_vertigo: "Vertigo",
  de_train: "Train",
  de_cache: "Cache",
};

const MAP_IMAGES = new Set([
  "de_ancient",
  "de_anubis",
  "de_cache",
  "de_dust2",
  "de_inferno",
  "de_mirage",
  "de_nuke",
  "de_overpass",
  "de_train",
]);

// Pool activo de mapas. Las estadísticas, la ventaja por mapa y el simulador
// sólo tienen en cuenta estos: partidos antiguos en mapas que ya no están
// (Overpass, Train...) o mapas de Workshop no aportan al scouting.
// Cuando Faceit rote el pool, basta con actualizar esta lista.
export const ACTIVE_MAP_POOL = [
  "de_mirage",
  "de_inferno",
  "de_ancient",
  "de_anubis",
  "de_nuke",
  "de_cache",
  "de_dust2",
];

const ACTIVE = new Set(ACTIVE_MAP_POOL);

export function isActiveMap(guid: string) {
  return ACTIVE.has(guid);
}

export function formatMap(guid: string) {
  return (
    MAP_NAMES[guid] ??
    guid.replace(/^de_/, "").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function mapImage(guid: string): string | null {
  return MAP_IMAGES.has(guid) ? `/maps/${guid}.jpg` : null;
}
