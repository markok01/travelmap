import type { PlaceType } from "@/lib/db/schema";
import { getCountryByCode } from "@/lib/countries/queries";

export type GeoPoint = { latitude: number; longitude: number };

/** Well-known demo / common places — avoid Nominatim round-trips in seed & offline. */
const KNOWN_PLACES: Record<string, GeoPoint> = {
  "belgrade|rs": { latitude: 44.7866, longitude: 20.4489 },
  "kalemegdan|rs": { latitude: 44.8235, longitude: 20.4503 },
  "rome|it": { latitude: 41.9028, longitude: 12.4964 },
  "colosseum|it": { latitude: 41.8902, longitude: 12.4922 },
  "trastevere|it": { latitude: 41.8719, longitude: 12.4667 },
  "tokyo|jp": { latitude: 35.6762, longitude: 139.6503 },
  "kyoto|jp": { latitude: 35.0116, longitude: 135.7681 },
};

function knownKey(name: string, countryCode: string) {
  return `${name.trim().toLowerCase()}|${countryCode.trim().toLowerCase()}`;
}

/**
 * Resolve lat/lng for a place name within a country.
 * Order: known table → Nominatim → null (never blocks save).
 */
export async function geocodePlace(
  name: string,
  countryCode: string,
): Promise<GeoPoint | null> {
  const trimmed = name.trim();
  const code = countryCode.trim().toUpperCase();
  if (!trimmed || !code) return null;

  const known = KNOWN_PLACES[knownKey(trimmed, code)];
  if (known) return known;

  try {
    const fromNominatim = await geocodeNominatim(trimmed, code);
    if (fromNominatim) return fromNominatim;
  } catch {
    /* network / rate-limit — fall through */
  }

  return null;
}

async function geocodeNominatim(
  name: string,
  countryCode: string,
): Promise<GeoPoint | null> {
  const params = new URLSearchParams({
    q: name,
    countrycodes: countryCode.toLowerCase(),
    format: "json",
    limit: "1",
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "FamilyTravelAtlas/0.1 (local family travel app)",
      },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    },
  );

  if (!res.ok) return null;
  const data = (await res.json()) as { lat?: string; lon?: string }[];
  const hit = data[0];
  if (!hit?.lat || !hit?.lon) return null;

  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

/** Soft fallback: country centroid when place geocode fails (optional caller use). */
export async function countryCentroid(
  countryCode: string,
): Promise<GeoPoint | null> {
  const country = await getCountryByCode(countryCode);
  if (
    country?.latitude == null ||
    country?.longitude == null ||
    !Number.isFinite(country.latitude) ||
    !Number.isFinite(country.longitude)
  ) {
    return null;
  }
  return { latitude: country.latitude, longitude: country.longitude };
}

export async function geocodePlacesForCountry(
  places: { name: string; type: PlaceType; notes: string | null }[],
  countryCode: string,
): Promise<
  {
    name: string;
    type: PlaceType;
    notes: string | null;
    latitude: number | null;
    longitude: number | null;
    countryCode: string;
  }[]
> {
  const out: {
    name: string;
    type: PlaceType;
    notes: string | null;
    latitude: number | null;
    longitude: number | null;
    countryCode: string;
  }[] = [];

  for (const place of places) {
    const point = await geocodePlace(place.name, countryCode);
    out.push({
      name: place.name,
      type: place.type,
      notes: place.notes,
      latitude: point?.latitude ?? null,
      longitude: point?.longitude ?? null,
      countryCode,
    });
    // Be kind to Nominatim (1 req/sec guideline) when resolving several places
    if (!KNOWN_PLACES[knownKey(place.name, countryCode)]) {
      await new Promise((r) => setTimeout(r, 1100));
    }
  }
  return out;
}
