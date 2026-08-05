import { getFamilyForUser } from "@/lib/actions/family";
import { TripCard } from "@/components/trip-card";
import { TripsEmptyState } from "@/components/trips-empty-state";
import { TripsFilters } from "@/components/trips-filters";
import { TripsPageHeader } from "@/components/trips-page-header";
import { getSession } from "@/lib/session";
import {
  collectTripYears,
  getTripsForFamily,
} from "@/lib/trips/queries";

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{
    countryCode?: string;
    memberId?: string;
    year?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const family = await getFamilyForUser(session.user.id);
  if (!family) return null;

  const params = await searchParams;
  const viewer = {
    userId: session.user.id,
    familyMemberIds: family.members.map((member) => member.id),
  };
  const allTrips = await getTripsForFamily(family.id, {}, viewer);
  const years = collectTripYears(allTrips);
  const trips = await getTripsForFamily(
    family.id,
    {
      countryCode: params.countryCode,
      memberId: params.memberId,
      year: params.year,
    },
    viewer,
  );

  return (
    <div className="space-y-6">
      <TripsPageHeader tripCount={allTrips.length} />

      <TripsFilters
        members={family.members}
        years={years}
        current={{
          countryCode: params.countryCode,
          memberId: params.memberId,
          year: params.year,
        }}
      />

      {trips.length === 0 ? (
        <TripsEmptyState kind={allTrips.length === 0 ? "none" : "noMatch"} />
      ) : (
        <ul className="grid gap-3">
          {trips.map((trip) => (
            <li key={trip.id}>
              <TripCard trip={trip} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
