import Link from "next/link";
import { notFound } from "next/navigation";
import { getFamilyForUser } from "@/lib/actions/family";
import { TripCard } from "@/components/trip-card";
import { getCountryByCode } from "@/lib/countries/queries";
import { getSession } from "@/lib/session";
import { getTripsByCountry } from "@/lib/trips/queries";

export default async function CountryDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const family = await getFamilyForUser(session.user.id);
  if (!family) return null;

  const { code } = await params;
  const country = await getCountryByCode(code);
  if (!country) notFound();

  const trips = await getTripsByCountry(family.id, country.code, {
    userId: session.user.id,
    familyMemberIds: family.members.map((member) => member.id),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/countries"
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            ← All countries
          </Link>
          <div className="mt-3 flex items-start gap-3">
            <span className="text-5xl leading-none" aria-hidden>
              {country.flagEmoji}
            </span>
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                {country.name}
              </h1>
              <p className="mt-1 text-[var(--muted-foreground)]">
                {country.code}
                {country.nativeName ? ` · ${country.nativeName}` : ""}
                {" · "}
                {country.continent}
                {country.region ? ` · ${country.region}` : ""}
              </p>
            </div>
          </div>
        </div>
        <Link
          href={`/trips/new?country=${country.code}`}
          className="btn-primary"
        >
          Add trip to {country.name}
        </Link>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Family visits
          </h2>
          <span className="text-sm text-[var(--muted-foreground)]">
            {trips.length} trip{trips.length === 1 ? "" : "s"}
          </span>
        </div>

        {trips.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border)] px-6 py-10 text-center">
            <p className="text-[var(--muted-foreground)]">
              No visits to {country.name} yet.
            </p>
            <Link
              href={`/trips/new?country=${country.code}`}
              className="btn-secondary mt-4 inline-flex"
            >
              Log the first trip
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3">
            {trips.map((trip) => (
              <li key={trip.id}>
                <TripCard trip={trip} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
