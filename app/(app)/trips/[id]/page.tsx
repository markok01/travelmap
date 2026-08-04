import Link from "next/link";
import { notFound } from "next/navigation";
import { getFamilyForUser } from "@/lib/actions/family";
import { DeleteTripButton } from "@/components/delete-trip-button";
import { getSession } from "@/lib/session";
import { formatTripDates, tripDurationDays } from "@/lib/trips/dates";
import { getTripById } from "@/lib/trips/queries";
import { canViewTrip } from "@/lib/trips/privacy";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const family = await getFamilyForUser(session.user.id);
  if (!family) return null;

  const { id } = await params;
  const trip = await getTripById(id);
  if (
    !trip ||
    trip.familyId !== family.id ||
    !canViewTrip(trip, {
      userId: session.user.id,
      familyMemberIds: family.members.map((member) => member.id),
    })
  ) {
    notFound();
  }

  const days = tripDurationDays(trip.startDate, trip.endDate);
  const title = trip.title?.trim() || trip.country.name;
  const tripCountries = [
    trip.country,
    ...trip.countries
      .map((tripCountry) => tripCountry.country)
      .filter((country) => country.code !== trip.country.code),
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/trips"
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            ← All trips
          </Link>
          <div className="mt-3 flex items-start gap-3">
            <span className="flex -space-x-1 text-4xl leading-none" aria-hidden>
              {tripCountries.map((country) => (
                <span key={country.code}>{country.flagEmoji ?? "🏳️"}</span>
              ))}
            </span>
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
                {title}
              </h1>
              <p className="mt-1 text-[var(--muted-foreground)]">
                {tripCountries.map((country, index) => (
                  <span key={country.code}>
                    {index > 0 ? " · " : null}
                    <Link
                      href={`/countries/${country.code}`}
                      className="hover:text-[var(--accent)]"
                    >
                      {country.name}
                    </Link>
                  </span>
                ))}
                {" · "}
                {formatTripDates(trip.startDate, trip.endDate)} · {days} day
                {days === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/trips/${trip.id}/edit`} className="btn-secondary">
            Edit
          </Link>
          <DeleteTripButton tripId={trip.id} />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          Who went
        </h2>
        <ul className="flex flex-wrap gap-2">
          {trip.participants.map((p) => (
            <li
              key={p.id}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: p.member.color }}
              />
              {p.member.displayName}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          Places
        </h2>
        {trip.places.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            No cities or landmarks logged.
          </p>
        ) : (
          <ul className="space-y-2">
            {trip.places.map((place) => (
              <li
                key={place.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3"
              >
                <p className="font-medium">{place.name}</p>
                <p className="text-sm capitalize text-[var(--muted-foreground)]">
                  {place.type}
                  {place.notes ? ` · ${place.notes}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {trip.notes ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Notes
          </h2>
          <p className="whitespace-pre-wrap rounded-3xl border border-[var(--border)] bg-[var(--background)] p-4 text-[var(--foreground)]">
            {trip.notes}
          </p>
        </section>
      ) : null}

      <p className="text-xs text-[var(--muted-foreground)]">
        Privacy: {trip.privacy}
      </p>
    </div>
  );
}
