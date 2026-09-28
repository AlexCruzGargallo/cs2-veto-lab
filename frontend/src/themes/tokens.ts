// Colores compartidos por toda la app. La base es la paleta original
// (#3B82F6, #60a5fa, #1e40af, fondos #0F1319 / #1A202C), que es Tailwind, así
// que verde/rojo/ámbar usan también sus tonos Tailwind para que casen.

export const colors = {
  bg: "#0F1319",
  surface: "#1A202C",
  surfaceRaised: "#212838",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  hover: "rgba(255,255,255,0.04)",

  text: "#FFFFFF",
  muted: "#8B96A5",

  accent: "#3B82F6",
  accentText: "#60a5fa",
  accentDeep: "#1e40af",
  accentSoft: "rgba(59,130,246,0.12)",
  accentBorder: "rgba(59,130,246,0.3)",

  win: "#22C55E",
  loss: "#EF4444",
  warn: "#F59E0B",
  neutral: "#8B96A5",
} as const;

// Añade transparencia a un color hex: tint("#3B82F6", 0.12).
export function tint(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export const RESULT_COLORS = {
  win: colors.win,
  loss: colors.loss,
  draw: colors.neutral,
  unknown: colors.neutral,
} as const;
