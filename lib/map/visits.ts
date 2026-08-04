import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { familyMembers, trips } from "@/lib/db/schema";
import type { FamilyVisitMap, MapMember } from "@/lib/map/colors";
import { canViewTrip, type TripViewer } from "@/lib/trips/privacy";

export async function getVisitedCountryCodesByMember(
  familyId: string,
  viewer?: TripViewer,
) {
  const members = await db.query.familyMembers.findMany({
    where: eq(familyMembers.familyId, familyId),
  });

  const familyTrips = await db.query.trips.findMany({
    where: eq(trips.familyId, familyId),
    columns: {
      id: true,
      countryCode: true,
      privacy: true,
      createdByUserId: true,
    },
    with: {
      countries: {
        columns: { countryCode: true },
      },
      participants: {
        columns: { familyMemberId: true },
      },
    },
  });

  const visitedByMember: Record<string, Set<string>> = {};
  for (const member of members) {
    visitedByMember[member.id] = new Set();
  }

  for (const trip of familyTrips) {
    if (viewer && !canViewTrip(trip, viewer)) continue;
    const countryCodes = new Set([
      trip.countryCode,
      ...trip.countries.map((country) => country.countryCode),
    ]);
    for (const participant of trip.participants) {
      const visited = visitedByMember[participant.familyMemberId];
      for (const countryCode of countryCodes) {
        visited?.add(countryCode);
      }
    }
  }

  return {
    members: members.map(
      (m): MapMember => ({
        id: m.id,
        displayName: m.displayName,
        color: m.color,
      }),
    ),
    visitedByMember: Object.fromEntries(
      Object.entries(visitedByMember).map(([id, set]) => [id, [...set].sort()]),
    ),
  };
}

export async function getFamilyVisitMap(
  familyId: string,
  viewer?: TripViewer,
): Promise<FamilyVisitMap> {
  const { members, visitedByMember } =
    await getVisitedCountryCodesByMember(familyId, viewer);

  const visitorsByCountry: Record<string, MapMember[]> = {};

  for (const member of members) {
    for (const code of visitedByMember[member.id] ?? []) {
      if (!visitorsByCountry[code]) visitorsByCountry[code] = [];
      if (!visitorsByCountry[code].some((v) => v.id === member.id)) {
        visitorsByCountry[code].push(member);
      }
    }
  }

  for (const code of Object.keys(visitorsByCountry)) {
    visitorsByCountry[code].sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    );
  }

  const anyoneCodes = Object.keys(visitorsByCountry).sort();

  return {
    members,
    visitedByMember,
    visitorsByCountry,
    anyoneCodes,
    anyoneCount: anyoneCodes.length,
  };
}
