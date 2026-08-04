import numericToAlpha2 from "@/lib/map/numeric-to-alpha2.json";

export function alpha2FromNumericId(id: string | number | undefined | null) {
  if (id === undefined || id === null || id === "") return null;
  const key = String(Number(id));
  if (!Number.isFinite(Number(id))) return null;
  const code = (numericToAlpha2 as Record<string, string>)[key] ?? null;
  // Kosovo is not catalogued separately — treat as Serbia
  if (code === "XK") return "RS";
  return code;
}

/** Resolve ISO alpha-2 for a world-atlas / GeoJSON country feature. */
export function resolveFeatureCountryCode(
  id: string | number | undefined | null,
  properties?: { name?: string | null } | null,
) {
  const fromId = alpha2FromNumericId(id);
  if (fromId) return fromId;

  const name = properties?.name?.trim().toLowerCase();
  if (name === "kosovo") return "RS";

  return null;
}
