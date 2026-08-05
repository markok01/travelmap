import { DashboardView } from "@/components/dashboard-view";
import { getFamilyForUser } from "@/lib/actions/family";
import { getFamilyVisitMap } from "@/lib/map/visits";
import { getSession } from "@/lib/session";
import { filterTripsForScope } from "@/lib/stats/compute";
import { getStatsTripsForFamily } from "@/lib/stats/queries";
import { tripDurationDays } from "@/lib/trips/dates";
import { getRecentTrips } from "@/lib/trips/queries";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const family = await getFamilyForUser(session.user.id);
  if (!family) return null;

  const [recentTrips, visitMap, statsTrips] = await Promise.all([
    getRecentTrips(family.id, 5, {
      userId: session.user.id,
      familyMemberIds: family.members.map((member) => member.id),
    }),
    getFamilyVisitMap(family.id),
    getStatsTripsForFamily(family.id, {
      userId: session.user.id,
      familyMemberIds: family.members.map((member) => member.id),
    }),
  ]);

  const memberIds = family.members.map((m) => m.id);
  const currentYear = new Date().getFullYear();
  const thisYearTrips = filterTripsForScope(statsTrips, {
    scope: "anyone",
    allMemberIds: memberIds,
    year: currentYear,
  });
  const thisYearDays = thisYearTrips.reduce(
    (sum, trip) => sum + tripDurationDays(trip.startDate, trip.endDate),
    0,
  );
  const thisYearCountries = new Set(
    thisYearTrips.flatMap((trip) =>
      trip.countries?.length
        ? trip.countries.map((c) => c.code)
        : [trip.countryCode],
    ),
  ).size;

  return (
    <DashboardView
      familyName={family.name}
      members={family.members}
      recentTrips={recentTrips}
      currentYear={currentYear}
      thisYearCountries={thisYearCountries}
      thisYearTripsCount={thisYearTrips.length}
      thisYearDays={thisYearDays}
      anyoneCount={visitMap.anyoneCount}
    />
  );
}
