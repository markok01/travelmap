import type { Continent } from "@/lib/db/schema";
import { CONTINENTS } from "@/lib/db/schema";

/** Extra travel destinations beyond UN members. */
export const TRAVEL_EXTRA_CODES = new Set(["PS", "TW"]);

/** Codes we never catalog (treated as part of another country). */
export const EXCLUDED_COUNTRY_CODES = new Set(["XK"]);

export function mapToContinent(
  region: string,
  subregion: string | undefined,
): Continent {
  switch (region) {
    case "Africa":
      return "Africa";
    case "Asia":
      return "Asia";
    case "Europe":
      return "Europe";
    case "Oceania":
      return "Oceania";
    case "Antarctic":
      return "Antarctica";
    case "Americas":
      return subregion === "South America" ? "South America" : "North America";
    default:
      return "Asia";
  }
}

export function nativeCommonName(
  native: Record<string, { common?: string }> | undefined,
): string | null {
  if (!native) return null;
  const first = Object.values(native)[0];
  return first?.common ?? null;
}

export function groupCountriesByContinent<
  T extends { continent: string; name: string },
>(list: T[]) {
  return CONTINENTS.map((continent) => ({
    continent,
    countries: list
      .filter((c) => c.continent === continent)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.countries.length > 0);
}
