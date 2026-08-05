import type { PlaceType } from "@/lib/db/schema";
import { getCountryByCode } from "@/lib/countries/queries";

export type GeoPoint = { latitude: number; longitude: number };

export type PlaceSuggestion = {
  /** English (local) title for the suggestion row */
  label: string;
  /** English city/place name saved on the trip */
  name: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  /** Country name for the secondary line */
  countryName?: string;
};

export type PlaceInput = {
  name: string;
  type: PlaceType;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  countryCode: string | null;
};

export type ResolvedPlace = {
  name: string;
  type: PlaceType;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  countryCode: string | null;
};

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

const NOMINATIM_UA = "FamilyTravelAtlas/0.1 (local family travel app)";

function knownKey(name: string, countryCode: string) {
  return `${name.trim().toLowerCase()}|${countryCode.trim().toLowerCase()}`;
}

function isValidCoord(lat: number | null, lng: number | null): boolean {
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
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
        "User-Agent": NOMINATIM_UA,
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

type NominatimHit = {
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  address?: {
    country_code?: string;
    country?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
  namedetails?: Record<string, string>;
};

/** Preferred local-language name tags by country (ISO 3166-1 alpha-2). */
const LOCAL_NAME_TAGS: Record<string, string[]> = {
  RS: ["name:sr-Latn", "name:sr", "name:hr"],
  ME: ["name:sr-Latn", "name:sr", "name:cnr"],
  BA: ["name:bs", "name:sr-Latn", "name:hr", "name:sr"],
  HR: ["name:hr"],
  SI: ["name:sl"],
  MK: ["name:mk"],
  AL: ["name:sq"],
  JP: ["name:ja"],
  CN: ["name:zh", "name:zh-Hans", "name:zh-Hant"],
  TW: ["name:zh-Hant", "name:zh"],
  KR: ["name:ko"],
  TH: ["name:th"],
  VN: ["name:vi"],
  GR: ["name:el"],
  RU: ["name:ru"],
  UA: ["name:uk"],
  BG: ["name:bg"],
  PL: ["name:pl"],
  CZ: ["name:cs"],
  SK: ["name:sk"],
  HU: ["name:hu"],
  RO: ["name:ro"],
  TR: ["name:tr"],
  IT: ["name:it"],
  FR: ["name:fr"],
  DE: ["name:de"],
  AT: ["name:de"],
  CH: ["name:de", "name:fr", "name:it"],
  ES: ["name:es", "name:ca", "name:eu", "name:gl"],
  PT: ["name:pt"],
  NL: ["name:nl"],
  BE: ["name:nl", "name:fr"],
  SE: ["name:sv"],
  NO: ["name:nb", "name:nn", "name:no"],
  DK: ["name:da"],
  FI: ["name:fi", "name:sv"],
  IS: ["name:is"],
  IE: ["name:ga", "name:en"],
  GB: ["name:en", "name:cy", "name:gd"],
  US: ["name:en"],
  MX: ["name:es"],
  BR: ["name:pt"],
  AR: ["name:es"],
  EG: ["name:ar"],
  SA: ["name:ar"],
  AE: ["name:ar"],
  IL: ["name:he", "name:ar"],
  IN: ["name:hi", "name:en"],
  ID: ["name:id"],
  MY: ["name:ms"],
  PH: ["name:tl", "name:en"],
};

function normalizeName(value: string | undefined | null): string {
  return (value ?? "").trim();
}

function namesEqual(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}

function pickLocalName(
  namedetails: Record<string, string> | undefined,
  countryCode: string,
  englishName: string,
): string | null {
  if (!namedetails) return null;

  const preferredTags = LOCAL_NAME_TAGS[countryCode] ?? [];
  for (const tag of preferredTags) {
    const value = normalizeName(namedetails[tag]);
    if (value && !namesEqual(value, englishName)) return value;
  }

  const defaultLocal = normalizeName(namedetails.name);
  if (defaultLocal && !namesEqual(defaultLocal, englishName)) {
    return defaultLocal;
  }

  // Any non-English localized name as last resort
  for (const [key, raw] of Object.entries(namedetails)) {
    if (!key.startsWith("name:") || key === "name:en") continue;
    const value = normalizeName(raw);
    if (value && !namesEqual(value, englishName)) return value;
  }

  return null;
}

function pickEnglishName(
  hit: NominatimHit,
  fallbackQuery: string,
): string {
  const details = hit.namedetails ?? {};
  const fromEn = normalizeName(details["name:en"]);
  if (fromEn) return fromEn;

  const fromAddress =
    normalizeName(hit.address?.city) ||
    normalizeName(hit.address?.town) ||
    normalizeName(hit.address?.village) ||
    normalizeName(hit.address?.municipality);
  if (fromAddress) return fromAddress;

  const fromHit = normalizeName(hit.name);
  if (fromHit) return fromHit;

  return (
    normalizeName(hit.display_name?.split(",")[0]) || fallbackQuery.trim()
  );
}

/**
 * Autocomplete search via Nominatim. Returns up to `limit` suggestions.
 * Primary name is English; label includes local-language name when available.
 */
export async function searchPlaces(
  query: string,
  countryCode?: string | null,
  limit = 6,
): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    q,
    format: "json",
    addressdetails: "1",
    namedetails: "1",
    "accept-language": "en",
    limit: String(Math.min(Math.max(limit, 1), 8)),
  });
  // Nominatim accepts comma-separated ISO country codes
  const codes = (countryCode ?? "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
  if (codes.length > 0) params.set("countrycodes", codes.join(","));
  const code = codes[0]?.toUpperCase();

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": NOMINATIM_UA,
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    },
  );

  if (!res.ok) return [];
  const data = (await res.json()) as NominatimHit[];

  const out: PlaceSuggestion[] = [];
  const seen = new Set<string>();

  for (const hit of data) {
    const latitude = Number(hit.lat);
    const longitude = Number(hit.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const hitCode = (hit.address?.country_code ?? code ?? "")
      .trim()
      .toUpperCase();
    if (!hitCode) continue;

    const englishName = pickEnglishName(hit, q);
    if (!englishName) continue;

    const localName = pickLocalName(hit.namedetails, hitCode, englishName);
    const countryName = normalizeName(hit.address?.country) || hitCode;
    const label = localName
      ? `${englishName} (${localName})`
      : englishName;

    const dedupe = `${englishName.toLowerCase()}|${hitCode}|${latitude.toFixed(3)}|${longitude.toFixed(3)}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    out.push({
      label,
      name: englishName,
      latitude,
      longitude,
      countryCode: hitCode,
      countryName,
    });
  }

  return out;
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

/**
 * Resolve places for save:
 * 1) client-provided coords
 * 2) reuse existing coords when name matches (edit)
 * 3) geocode by place country (fallback to primary)
 */
export async function resolvePlaces(
  places: PlaceInput[],
  fallbackCountryCode: string,
  existing?: {
    name: string;
    latitude: number | null;
    longitude: number | null;
    countryCode: string | null;
  }[],
): Promise<ResolvedPlace[]> {
  const existingByName = new Map(
    (existing ?? []).map((p) => [p.name.trim().toLowerCase(), p] as const),
  );

  const out: ResolvedPlace[] = [];
  let geocodeCalls = 0;
  const fallback = fallbackCountryCode.trim().toUpperCase();
  const knownCountries = new Map<string, boolean>();

  async function countryExists(code: string): Promise<boolean> {
    if (!code) return false;
    if (knownCountries.has(code)) return knownCountries.get(code)!;
    const row = await getCountryByCode(code);
    const ok = Boolean(row);
    knownCountries.set(code, ok);
    return ok;
  }

  for (const place of places) {
    let countryCode =
      place.countryCode?.trim().toUpperCase() || fallback || "";
    let latitude = place.latitude;
    let longitude = place.longitude;

    if (!isValidCoord(latitude, longitude)) {
      const prior = existingByName.get(place.name.trim().toLowerCase());
      if (prior && isValidCoord(prior.latitude, prior.longitude)) {
        latitude = prior.latitude;
        longitude = prior.longitude;
        if (!place.countryCode && prior.countryCode) {
          countryCode = prior.countryCode.trim().toUpperCase();
        }
      } else if (countryCode) {
        if (geocodeCalls > 0) {
          await new Promise((r) => setTimeout(r, 1100));
        }
        const point = await geocodePlace(place.name, countryCode);
        geocodeCalls += 1;
        latitude = point?.latitude ?? null;
        longitude = point?.longitude ?? null;
      } else {
        latitude = null;
        longitude = null;
      }
    }

    if (!(await countryExists(countryCode))) {
      countryCode = (await countryExists(fallback)) ? fallback : "";
    }

    out.push({
      name: place.name,
      type: place.type,
      notes: place.notes,
      latitude: isValidCoord(latitude, longitude) ? latitude : null,
      longitude: isValidCoord(latitude, longitude) ? longitude : null,
      countryCode: countryCode || null,
    });
  }

  return out;
}

/** @deprecated Prefer resolvePlaces — kept for seed scripts that pass simple places. */
export async function geocodePlacesForCountry(
  places: { name: string; type: PlaceType; notes: string | null }[],
  countryCode: string,
): Promise<ResolvedPlace[]> {
  return resolvePlaces(
    places.map((p) => ({
      ...p,
      latitude: null,
      longitude: null,
      countryCode: null,
    })),
    countryCode,
  );
}
