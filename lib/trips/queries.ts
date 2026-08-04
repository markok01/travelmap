import { and, desc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { tripParticipants, trips } from "@/lib/db/schema";
import { canViewTrip, type TripViewer } from "@/lib/trips/privacy";

export type TripFilters = {
  countryCode?: string | null;
  memberId?: string | null;
  year?: number | string | null;
};

const tripWith = {
  country: true,
  countries: {
    with: {
      country: true,
    },
  },
  places: true,
  participants: {
    with: {
      member: true,
    },
  },
} as const;

export type TripWithDetails = NonNullable<
  Awaited<ReturnType<typeof getTripById>>
>;

export async function getTripsForFamily(
  familyId: string,
  filters: TripFilters = {},
  viewer?: TripViewer,
) {
  const countryCode = filters.countryCode?.trim().toUpperCase() || null;
  const memberId = filters.memberId?.trim() || null;
  const yearRaw = filters.year ? Number(filters.year) : null;
  const year =
    yearRaw && Number.isFinite(yearRaw) && yearRaw >= 1900 && yearRaw <= 2100
      ? yearRaw
      : null;

  const conditions = [eq(trips.familyId, familyId)];

  if (countryCode) {
    const countryTrips = await db.query.tripCountries.findMany({
      where: (tripCountries, { eq }) =>
        eq(tripCountries.countryCode, countryCode),
      columns: { tripId: true },
    });
    const tripIds = [...new Set(countryTrips.map((row) => row.tripId))];
    conditions.push(
      tripIds.length > 0
        ? or(eq(trips.countryCode, countryCode), inArray(trips.id, tripIds))!
        : eq(trips.countryCode, countryCode),
    );
  }

  if (year) {
    conditions.push(gte(trips.startDate, `${year}-01-01`));
    conditions.push(lte(trips.startDate, `${year}-12-31`));
  }

  if (memberId) {
    const rows = await db
      .select({ tripId: tripParticipants.tripId })
      .from(tripParticipants)
      .where(eq(tripParticipants.familyMemberId, memberId));
    const tripIds = rows.map((r) => r.tripId);
    if (tripIds.length === 0) return [];

    const result = await db.query.trips.findMany({
      where: and(...conditions, inArray(trips.id, tripIds)),
      with: tripWith,
      orderBy: [desc(trips.startDate), desc(trips.createdAt)],
    });
    return viewer ? result.filter((trip) => canViewTrip(trip, viewer)) : result;
  }

  const result = await db.query.trips.findMany({
    where: and(...conditions),
    with: tripWith,
    orderBy: [desc(trips.startDate), desc(trips.createdAt)],
  });
  return viewer ? result.filter((trip) => canViewTrip(trip, viewer)) : result;
}

export async function getTripById(tripId: string) {
  return db.query.trips.findFirst({
    where: eq(trips.id, tripId),
    with: tripWith,
  });
}

export async function getTripsByCountry(
  familyId: string,
  countryCode: string,
  viewer?: TripViewer,
) {
  return getTripsForFamily(familyId, { countryCode }, viewer);
}

export async function getRecentTrips(
  familyId: string,
  limit = 5,
  viewer?: TripViewer,
) {
  const result = await db.query.trips.findMany({
    where: eq(trips.familyId, familyId),
    with: tripWith,
    orderBy: [desc(trips.startDate), desc(trips.createdAt)],
  });
  const visible = viewer ? result.filter((trip) => canViewTrip(trip, viewer)) : result;
  return visible.slice(0, limit);
}

export function collectTripYears(
  tripList: { startDate: string }[],
): number[] {
  const years = new Set(
    tripList.map((t) => Number(t.startDate.slice(0, 4))).filter(Boolean),
  );
  return [...years].sort((a, b) => b - a);
}
