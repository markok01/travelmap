/** True when the device has fine pointer + hover (desktop/trackpad). */
export function detectCanHover(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function detectCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

export const MAP_CITIES_HINT_KEY = "travelmap.mapCitiesHintDismissed";
