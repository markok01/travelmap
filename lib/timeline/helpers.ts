import {
  filterTripsForScope,
  type StatsScopeOptions,
  type StatsTrip,
} from "@/lib/stats/compute";
import { tripDurationDays } from "@/lib/trips/dates";

export type TimelineTrip = StatsTrip;

/** Inclusive list of ISO dates between start and end. */
export function expandTripDays(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return days;

  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function groupTripsByYear(
  trips: StatsTrip[],
  order: "newest" | "oldest" = "newest",
) {
  const sorted = [...trips].sort((a, b) => {
    const cmp = a.startDate.localeCompare(b.startDate);
    return order === "newest" ? -cmp : cmp;
  });

  const groups: { year: number; trips: StatsTrip[] }[] = [];
  for (const trip of sorted) {
    const year = Number(trip.startDate.slice(0, 4));
    const existing = groups.find((g) => g.year === year);
    if (existing) existing.trips.push(trip);
    else groups.push({ year, trips: [trip] });
  }

  groups.sort((a, b) => (order === "newest" ? b.year - a.year : a.year - b.year));
  return groups;
}

export type CalendarDayCell = {
  date: string | null;
  inMonth: boolean;
  trips: StatsTrip[];
};

export function buildCalendarMonth(
  year: number,
  month: number,
  trips: StatsTrip[],
): CalendarDayCell[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weekday = (first.getUTCDay() + 6) % 7;

  const tripsByDay = new Map<string, StatsTrip[]>();
  for (const trip of trips) {
    for (const day of expandTripDays(trip.startDate, trip.endDate)) {
      if (!day.startsWith(`${year}-${String(month).padStart(2, "0")}`)) continue;
      const list = tripsByDay.get(day) ?? [];
      list.push(trip);
      tripsByDay.set(day, list);
    }
  }

  const cells: CalendarDayCell[] = [];
  for (let i = 0; i < weekday; i++) {
    cells.push({ date: null, inMonth: false, trips: [] });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({
      date,
      inMonth: true,
      trips: tripsByDay.get(date) ?? [],
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, inMonth: false, trips: [] });
  }
  return cells;
}

export function yearOverview(
  trips: StatsTrip[],
  year: number,
  scopeOptions: Omit<StatsScopeOptions, "year">,
) {
  const scoped = filterTripsForScope(trips, { ...scopeOptions, year });
  const countries = new Set(scoped.map((t) => t.countryCode));
  const totalDays = scoped.reduce(
    (sum, t) => sum + tripDurationDays(t.startDate, t.endDate),
    0,
  );

  let longest: StatsTrip | null = null;
  let longestDays = -1;
  const countryCounts = new Map<
    string,
    { name: string; flag: string | null; count: number }
  >();

  for (const trip of scoped) {
    const days = tripDurationDays(trip.startDate, trip.endDate);
    if (days > longestDays) {
      longestDays = days;
      longest = trip;
    }
    const entry = countryCounts.get(trip.countryCode) ?? {
      name: trip.countryName,
      flag: trip.flagEmoji,
      count: 0,
    };
    entry.count += 1;
    countryCounts.set(trip.countryCode, entry);
  }

  let topCountry: {
    code: string;
    name: string;
    flag: string | null;
    count: number;
  } | null = null;
  for (const [code, value] of countryCounts) {
    if (!topCountry || value.count > topCountry.count) {
      topCountry = {
        code,
        name: value.name,
        flag: value.flag,
        count: value.count,
      };
    }
  }

  const byMonth = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    label: new Date(Date.UTC(2000, i, 1)).toLocaleString("en-US", {
      month: "short",
      timeZone: "UTC",
    }),
    count: scoped.filter((t) => Number(t.startDate.slice(5, 7)) === i + 1)
      .length,
  }));

  return {
    trips: scoped,
    tripCount: scoped.length,
    countryCount: countries.size,
    totalDays,
    longestTrip: longest
      ? {
          id: longest.id,
          title: longest.title?.trim() || longest.countryName,
          flagEmoji: longest.flagEmoji,
          days: longestDays,
        }
      : null,
    topCountry,
    byMonth,
  };
}

export function filterOverlappingYear(trips: StatsTrip[], year: number) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  return trips.filter((t) => t.startDate <= end && t.endDate >= start);
}
