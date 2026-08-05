import { notFound } from "next/navigation";
import { getFamilyForUser } from "@/lib/actions/family";
import { EditTripForm } from "@/components/trip-form-wrappers";
import { EditTripPageHeader } from "@/components/edit-trip-page-header";
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
      <EditTripPageHeader
        tripId={trip.id}
        title={trip.title?.trim() || trip.country.name}
      />

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
                  latitude: p.latitude,
                  longitude: p.longitude,
                  countryCode: p.countryCode,
                  pinned:
                    p.latitude != null &&
                    p.longitude != null &&
                    Number.isFinite(p.latitude) &&
                    Number.isFinite(p.longitude),
                }))
              : [
                  {
                    key: "empty",
                    name: "",
                    type: "city",
                    notes: "",
                    latitude: null,
                    longitude: null,
                    countryCode: null,
                    pinned: false,
                  },
                ],
        }}
      />
    </div>
  );
}
