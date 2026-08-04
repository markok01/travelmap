export type MapTheme = "light" | "dark";
export type MapVisualStyle = "satellite" | "classic";

export const MAP_STYLE_STORAGE_KEY = "travelmap.mapStyle";

export function parseMapStyle(value: string | null | undefined): MapVisualStyle {
  return value === "classic" ? "classic" : "satellite";
}

export type TerrainPalette = {
  ocean: string;
  oceanMid: string;
  oceanDeep: string;
  oceanShallow: string;
  landTropical: string;
  landPlains: string;
  landHills: string;
  landMountains: string;
  landPolar: string;
  border: string;
  borderFocus: string;
  atmosphere: string;
  canvasBg: string;
  /** Classic flat unvisited fill */
  classicUnvisited: string;
  classicStroke: string;
  classicCanvasBg: string;
  classicAtmosphere: string;
  classicGlobe: string;
};

/** Satellite / terrain palettes — richer planet-like tones. */
export const TERRAIN: Record<MapTheme, TerrainPalette> = {
  light: {
    ocean: "#3d8ec9",
    oceanMid: "#2a6fa8",
    oceanDeep: "#1a4f7a",
    oceanShallow: "#5aa8d4",
    landTropical: "#4f9a4a",
    landPlains: "#6fa85a",
    landHills: "#7d8f52",
    landMountains: "#7a7158",
    landPolar: "#c8d4db",
    border: "rgba(255,255,255,0.28)",
    borderFocus: "#163f3c",
    atmosphere: "#6eb0d4",
    canvasBg: "#1f5a88",
    classicUnvisited: "#E6E0D4",
    classicStroke: "#f7f3eb",
    classicCanvasBg: "#f3eee4",
    classicAtmosphere: "#d4cfc4",
    classicGlobe: "#d8d2c6",
  },
  dark: {
    ocean: "#163a56",
    oceanMid: "#0f2c42",
    oceanDeep: "#081c2c",
    oceanShallow: "#245a7a",
    landTropical: "#355f3a",
    landPlains: "#3f6038",
    landHills: "#4e553a",
    landMountains: "#4a453c",
    landPolar: "#5a656c",
    border: "rgba(0,0,0,0.45)",
    borderFocus: "#8ec9c2",
    atmosphere: "#4f8eab",
    canvasBg: "#071722",
    classicUnvisited: "#243033",
    classicStroke: "#1a2326",
    classicCanvasBg: "#12181a",
    classicAtmosphere: "#2a3538",
    classicGlobe: "#2a3336",
  },
};

/** Lat-based terrain tone for Satellite 2D (no elevation dataset). */
export function landColorFromLat(lat: number, theme: MapTheme): string {
  const palette = TERRAIN[theme];
  const a = Math.abs(lat);
  if (a < 15) return palette.landTropical;
  if (a < 32) return palette.landPlains;
  if (a < 48) return palette.landHills;
  if (a < 62) return palette.landMountains;
  return palette.landPolar;
}

/** Visit fill for map overlays. Atlas satellite punches contrast; Minimal stays pastel. */
export function visitOverlayColor(
  hex: string,
  theme: MapTheme,
  style: MapVisualStyle = "satellite",
  design: "atlas" | "minimal" = "atlas",
): string {
  if (design === "minimal") {
    return softPastelVisitColor(hex, theme);
  }
  if (style === "classic") return hex;
  return punchVisitColor(hex);
}

/** Pin marker color — pastel in Minimal, full member/shared color in Atlas. */
export function mapPinColor(
  hex: string,
  theme: MapTheme,
  design: "atlas" | "minimal" = "atlas",
): string {
  if (design === "minimal") return softPastelVisitColor(hex, theme);
  return hex;
}

/** Soft pastel visit tint for Minimal design (readable, not neon). */
function softPastelVisitColor(hex: string, theme: MapTheme): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;

  // Keep hue; ease saturation and lift lightness — calm, not neon.
  hsl.s = Math.min(0.42, Math.max(0.22, hsl.s * 0.62 + 0.06));
  if (theme === "light") {
    hsl.l = Math.min(0.68, Math.max(0.52, hsl.l * 0.5 + 0.34));
  } else {
    hsl.l = Math.min(0.55, Math.max(0.4, hsl.l * 0.65 + 0.2));
  }

  return hslToHex(hsl);
}

/** Brighter / more saturated visit tint that won't blend into greens (Atlas). */
function punchVisitColor(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;

  // Terrain is green-brown (~70–140°). Nudge those hues toward cyan/blue.
  if (hsl.h >= 70 && hsl.h <= 165) {
    hsl.h = Math.max(175, hsl.h + 45);
  }

  // Stronger presence so visited countries read larger/clearer than pins
  hsl.s = Math.min(0.94, Math.max(0.6, hsl.s * 1.65 + 0.14));
  hsl.l = Math.min(0.58, Math.max(0.42, hsl.l * 0.72 + 0.2));

  return hslToHex(hsl);
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToHex({ h, s, l }: { h: number; s: number; l: number }): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return `#${toHex(Math.round((r + m) * 255))}${toHex(Math.round((g + m) * 255))}${toHex(Math.round((b + m) * 255))}`;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return null;
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

function toHex(n: number) {
  return Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
}

export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** CDN earth textures (consumer handles graceful fallback). */
export const EARTH_DAY_TEXTURE =
  "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg";
export const EARTH_TOPOLOGY_TEXTURE =
  "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png";
