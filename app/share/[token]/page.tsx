import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { WorldMapCanvas } from "@/components/world-map-canvas";
import { getCountries } from "@/lib/countries/queries";
import { getFamilyVisitMap } from "@/lib/map/visits";
import { getShareByToken } from "@/lib/share/queries";
import { getTripsForFamily } from "@/lib/trips/queries";

export default async function SharedFamilyAtlasPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const share = await getShareByToken(token);
  if (!share) notFound();

  const viewer = {
    isShareView: true,
    familyMemberIds: share.family.members.map((member) => member.id),
  };
  const [countries, visitMap, publicTrips] = await Promise.all([
    getCountries(),
    getFamilyVisitMap(share.familyId, viewer),
    getTripsForFamily(share.familyId, {}, viewer),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <BrandMark href="/" />
        <p className="text-sm text-[var(--muted-foreground)]">
          Shared, read-only atlas
        </p>
      </header>

      <section>
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Family journeys
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
          {share.family.name}
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          {visitMap.anyoneCount} countries visited together.
        </p>
      </section>

      <section className="relative h-[min(62vh,620px)] min-h-[22rem] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--background)]">
        <WorldMapCanvas
          visitMap={visitMap}
          countries={countries}
          mode="anyone"
          memberId=""
          coupleMemberIds={["", ""]}
          focusCode={null}
          theme="light"
          mapStyle="classic"
          hideReset
          design="atlas"
        />
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Public trips
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            Travel stories
          </h2>
        </div>
        {publicTrips.length === 0 ? (
          <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-5 py-8 text-[var(--muted-foreground)]">
            No public trips yet.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {publicTrips.map((trip) => (
              <li
                key={trip.id}
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5"
              >
                <p className="font-semibold">
                  {trip.country.flagEmoji} {trip.title?.trim() || trip.country.name}
                </p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {trip.startDate} – {trip.endDate}
                </p>
                {trip.notes ? (
                  <p className="mt-3 line-clamp-3 text-sm text-[var(--muted-foreground)]">
                    {trip.notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
