import Link from "next/link";
import { getFamilyForUser } from "@/lib/actions/family";
import { EmptyState } from "@/components/empty-state";
import { TripCard } from "@/components/trip-card";
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
    (sum, t) => sum + tripDurationDays(t.startDate, t.endDate),
    0,
  );
  const thisYearCountries = new Set(
    thisYearTrips.flatMap((t) =>
      t.countries?.length
        ? t.countries.map((c) => c.code)
        : [t.countryCode],
    ),
  ).size;
  const hasTrips = recentTrips.length > 0;

  if (!hasTrips) {
    return (
      <div className="space-y-8">
        <EmptyState
          eyebrow="Family atlas"
          title={`Welcome, ${family.name}`}
          description="Your shared home for journeys — start with one trip and watch your map, stats, and timeline come alive."
          actionHref="/trips/new"
          actionLabel="Add your first trip"
        />
        <section>
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Members
          </p>
          <MembersRow members={family.members} />
        </section>
      </div>
    );
  }

  const [featuredTrip, ...otherRecent] = recentTrips;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Family atlas
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
            {family.name}
          </h1>
        </div>
        <Link href="/trips/new" className="btn-primary">
          Add trip
        </Link>
      </div>

      <section className="surface p-5 md:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {currentYear} so far
        </p>
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
          <StatInline
            label="Countries"
            value={String(thisYearCountries)}
          />
          <StatInline
            label="Trips"
            value={String(thisYearTrips.length)}
          />
          <StatInline
            label="Days on the road"
            value={String(thisYearDays)}
          />
        </div>
      </section>

      <Link
        href="/map"
        className="surface block p-5 transition hover:shadow-[var(--shadow-md)] md:p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              World map
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">
              {visitMap.anyoneCount} countr
              {visitMap.anyoneCount === 1 ? "y" : "ies"} visited
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Explore where your family has been
            </p>
          </div>
          <span className="btn-secondary shrink-0">Open map</span>
        </div>
      </Link>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Recent trips
          </h2>
          <Link
            href="/trips"
            className="text-sm text-[var(--accent)] hover:underline"
          >
            View all
          </Link>
        </div>
        <ul className="grid gap-3">
          <li>
            <TripCard trip={featuredTrip} featured />
          </li>
          {otherRecent.map((trip) => (
            <li key={trip.id}>
              <TripCard trip={trip} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Members
          </h2>
          <span className="text-sm text-[var(--muted-foreground)]">
            {family.members.length} traveler
            {family.members.length === 1 ? "" : "s"}
          </span>
        </div>
        <MembersRow members={family.members} />
      </section>
    </div>
  );
}

function StatInline({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
        {value}
      </p>
      <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
    </div>
  );
}

function MembersRow({
  members,
}: {
  members: {
    id: string;
    displayName: string;
    color: string;
    role: string;
    userId: string | null;
  }[];
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {members.map((member) => (
        <li
          key={member.id}
          className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: member.color }}
            aria-hidden
          >
            {member.displayName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <span className="font-medium">{member.displayName}</span>
          {member.role === "owner" ? (
            <span className="text-xs text-[var(--muted-foreground)]">
              Owner
            </span>
          ) : member.userId ? null : (
            <span className="text-xs text-[var(--muted-foreground)]">
              Pending
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
