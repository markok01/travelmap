import Link from "next/link";
import { notFound } from "next/navigation";
import { getFamilyForUser } from "@/lib/actions/family";
import { EditTripForm } from "@/components/trip-form-wrappers";
import { getCountries } from "@/lib/countries/queries";
import { getSession } from "@/lib/session";
import { getTripById } from "@/lib/trips/queries";
import { canViewTrip } from "@/lib/trips/privacy";

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const family = await getFamilyForUser(session.user.id);
  if (!family) return null;

  const { id } = await params;
  const [trip, countries] = await Promise.all([
    getTripById(id),
    getCountries(),
  ]);

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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Edit
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            {trip.title?.trim() || trip.country.name}
          </h1>
        </div>
        <Link href={`/trips/${trip.id}`} className="btn-secondary">
          Cancel
        </Link>
      </div>

      <EditTripForm
        countries={countries}
        members={family.members}
        tripId={trip.id}
        defaults={{
          countryCode: trip.countryCode,
          countryCodes: [
            trip.countryCode,
            ...trip.countries
              .map((tripCountry) => tripCountry.countryCode)
              .filter((code) => code !== trip.countryCode),
          ],
          title: trip.title ?? "",
          startDate: trip.startDate,
          endDate: trip.endDate,
          notes: trip.notes ?? "",
          privacy: trip.privacy,
          participantIds: trip.participants.map((p) => p.familyMemberId),
          places:
            trip.places.length > 0
              ? trip.places.map((p) => ({
                  key: p.id,
                  name: p.name,
                  type: p.type,
                  notes: p.notes ?? "",
                }))
              : [{ key: "empty", name: "", type: "city", notes: "" }],
        }}
      />
    </div>
  );
}
