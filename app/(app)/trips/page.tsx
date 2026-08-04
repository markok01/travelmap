import Link from "next/link";
import { getFamilyForUser } from "@/lib/actions/family";
import { EmptyState } from "@/components/empty-state";
import { TripCard } from "@/components/trip-card";
import { TripsFilters } from "@/components/trips-filters";
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
  const trips = await getTripsForFamily(family.id, {
    countryCode: params.countryCode,
    memberId: params.memberId,
    year: params.year,
  }, viewer);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Travel log
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
            Trips
          </h1>
          <p className="mt-2 text-[var(--muted-foreground)]">
            {allTrips.length} trip{allTrips.length === 1 ? "" : "s"} recorded
          </p>
        </div>
        <Link href="/trips/new" className="btn-primary">
          Add trip
        </Link>
      </div>

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
        allTrips.length === 0 ? (
          <EmptyState
            eyebrow="Travel log"
            title="No trips yet"
            description="Log your first journey — country, dates, who went, and the places you visited."
            actionHref="/trips/new"
            actionLabel="Add your first trip"
          />
        ) : (
          <EmptyState
            title="No trips match"
            description="Try adjusting your filters — country, member, or year — to see more trips."
            actionHref="/trips"
            actionLabel="Clear filters"
          />
        )
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
