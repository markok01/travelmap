import { CONTINENTS, type Continent } from "@/lib/db/schema";
import { tripDurationDays } from "@/lib/trips/dates";

export type StatsScope = "anyone" | "individual" | "couple" | "family";

export type StatsTrip = {
  id: string;
  countryCode: string;
  countryName: string;
  continent: string;
  flagEmoji: string | null;
  countries: {
    code: string;
    name: string;
    continent: string;
    flagEmoji: string | null;
  }[];
  title: string | null;
  startDate: string;
  endDate: string;
  participantIds: string[];
  cities: string[];
  places: string[];
};

export type StatsMember = {
  id: string;
  displayName: string;
  color: string;
};

export type StatsScopeOptions = {
  scope: StatsScope;
  memberId?: string | null;
  coupleMemberIds?: [string, string] | null;
  /** All family member ids — required for family scope */
  allMemberIds: string[];
  year?: number | null;
};

export type NamedCount = {
  key: string;
  label: string;
  count: number;
  meta?: string | null;
};

export type TripHighlight = {
  id: string;
  title: string;
  countryName: string;
  flagEmoji: string | null;
  startDate: string;
  endDate: string;
  days: number;
};

export type FamilyStats = {
  tripCount: number;
  visitedCountries: number;
  catalogSize: number;
  coveragePercent: number;
  uniqueDestinations: number;
  repeatVisits: number;
  totalDays: number;
  averageTripDays: number | null;
  averageTripsPerYear: number | null;
  countriesByContinent: { continent: Continent; count: number }[];
  topCountry: NamedCount | null;
  topCity: NamedCount | null;
  topContinent: NamedCount | null;
  longestTrip: TripHighlight | null;
  shortestTrip: TripHighlight | null;
  byMonth: { month: number; label: string; count: number }[];
  bySeason: { season: Season; label: string; count: number }[];
};

export type Season = "spring" | "summer" | "autumn" | "winter";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const SEASON_LABELS: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};

export function seasonFromMonth(month: number): Season {
  // month is 1-12
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "autumn";
}

export function filterTripsForScope(
  trips: StatsTrip[],
  options: StatsScopeOptions,
): StatsTrip[] {
  let filtered = trips;

  if (options.year) {
    const y = options.year;
    filtered = filtered.filter((t) => t.startDate.startsWith(`${y}-`));
  }

  if (options.scope === "anyone") {
    return filtered;
  }

  if (options.scope === "individual") {
    const memberId = options.memberId;
    if (!memberId) return [];
    return filtered.filter((t) => t.participantIds.includes(memberId));
  }

  if (options.scope === "couple") {
    const pair = options.coupleMemberIds;
    if (!pair) return [];
    // Shared trips: both members are participants on the same trip
    return filtered.filter(
      (t) =>
        t.participantIds.includes(pair[0]) &&
        t.participantIds.includes(pair[1]),
    );
  }

  // family — every member participated on the trip
  const allIds = options.allMemberIds;
  if (allIds.length === 0) return [];
  return filtered.filter((t) =>
    allIds.every((id) => t.participantIds.includes(id)),
  );
}

function tripLabel(trip: StatsTrip) {
  return trip.title?.trim() || trip.countryName;
}

function toHighlight(trip: StatsTrip): TripHighlight {
  return {
    id: trip.id,
    title: tripLabel(trip),
    countryName: trip.countryName,
    flagEmoji: trip.flagEmoji,
    startDate: trip.startDate,
    endDate: trip.endDate,
    days: tripDurationDays(trip.startDate, trip.endDate),
  };
}

function topFromCounts(
  counts: Map<string, { label: string; count: number; meta?: string | null }>,
): NamedCount | null {
  let best: NamedCount | null = null;
  for (const [key, value] of counts) {
    if (!best || value.count > best.count) {
      best = {
        key,
        label: value.label,
        count: value.count,
        meta: value.meta ?? null,
      };
    }
  }
  return best;
}

export function computeStats(
  trips: StatsTrip[],
  catalogSize: number,
  options: StatsScopeOptions,
): FamilyStats {
  const scoped = filterTripsForScope(trips, options);

  const countryVisitCounts = new Map<
    string,
    { label: string; count: number; meta?: string | null }
  >();
  const cityCounts = new Map<
    string,
    { label: string; count: number; meta?: string | null }
  >();
  const continentCountrySets = new Map<string, Set<string>>();
  const continentTripCounts = new Map<
    string,
    { label: string; count: number }
  >();
  const monthCounts = Array.from({ length: 12 }, () => 0);
  const seasonCounts: Record<Season, number> = {
    spring: 0,
    summer: 0,
    autumn: 0,
    winter: 0,
  };

  let totalDays = 0;
  let longest: StatsTrip | null = null;
  let shortest: StatsTrip | null = null;
  let longestDays = -1;
  let shortestDays = Number.POSITIVE_INFINITY;

  for (const trip of scoped) {
    const days = tripDurationDays(trip.startDate, trip.endDate);
    totalDays += days;

    if (days > longestDays) {
      longestDays = days;
      longest = trip;
    }
    if (days < shortestDays) {
      shortestDays = days;
      shortest = trip;
    }

    for (const country of trip.countries) {
      const countryEntry = countryVisitCounts.get(country.code) ?? {
        label: country.name,
        count: 0,
        meta: country.flagEmoji,
      };
      countryEntry.count += 1;
      countryVisitCounts.set(country.code, countryEntry);

      if (!continentCountrySets.has(country.continent)) {
        continentCountrySets.set(country.continent, new Set());
      }
      continentCountrySets.get(country.continent)!.add(country.code);

      const continentTrips = continentTripCounts.get(country.continent) ?? {
        label: country.continent,
        count: 0,
      };
      continentTrips.count += 1;
      continentTripCounts.set(country.continent, continentTrips);
    }

    for (const city of trip.cities) {
      const key = city.toLowerCase();
      const entry = cityCounts.get(key) ?? { label: city, count: 0 };
      entry.count += 1;
      cityCounts.set(key, entry);
    }

    const month = Number(trip.startDate.slice(5, 7));
    if (month >= 1 && month <= 12) {
      monthCounts[month - 1] += 1;
      seasonCounts[seasonFromMonth(month)] += 1;
    }
  }

  const visitedCountries = countryVisitCounts.size;
  let repeatVisits = 0;
  for (const { count } of countryVisitCounts.values()) {
    if (count > 1) repeatVisits += count - 1;
  }

  const coveragePercent =
    catalogSize > 0
      ? Math.round((visitedCountries / catalogSize) * 1000) / 10
      : 0;

  const averageTripDays =
    scoped.length > 0
      ? Math.round((totalDays / scoped.length) * 10) / 10
      : null;

  let averageTripsPerYear: number | null = null;
  if (scoped.length > 0) {
    const years = scoped.map((t) => Number(t.startDate.slice(0, 4)));
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const span = Math.max(1, maxYear - minYear + 1);
    averageTripsPerYear = Math.round((scoped.length / span) * 10) / 10;
  }

  const countriesByContinent = CONTINENTS.map((continent) => ({
    continent,
    count: continentCountrySets.get(continent)?.size ?? 0,
  })).filter((row) => row.count > 0);

  return {
    tripCount: scoped.length,
    visitedCountries,
    catalogSize,
    coveragePercent,
    uniqueDestinations: visitedCountries,
    repeatVisits,
    totalDays,
    averageTripDays,
    averageTripsPerYear,
    countriesByContinent,
    topCountry: topFromCounts(countryVisitCounts),
    topCity: topFromCounts(cityCounts),
    topContinent: topFromCounts(continentTripCounts),
    longestTrip: longest ? toHighlight(longest) : null,
    shortestTrip: shortest ? toHighlight(shortest) : null,
    byMonth: MONTH_LABELS.map((label, index) => ({
      month: index + 1,
      label,
      count: monthCounts[index],
    })),
    bySeason: (Object.keys(SEASON_LABELS) as Season[]).map((season) => ({
      season,
      label: SEASON_LABELS[season],
      count: seasonCounts[season],
    })),
  };
}

export function collectYearsFromTrips(trips: StatsTrip[]): number[] {
  const years = new Set(
    trips.map((t) => Number(t.startDate.slice(0, 4))).filter(Boolean),
  );
  return [...years].sort((a, b) => b - a);
}

export function scopeLegend(scope: StatsScope): string {
  switch (scope) {
    case "anyone":
      return "All family trips";
    case "individual":
      return "Trips where the selected member participated";
    case "couple":
      return "Shared trips where both selected members participated together";
    case "family":
      return "Trips where every family member participated";
  }
}
