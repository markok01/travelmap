import { notFound } from "next/navigation";
import { getFamilyForUser } from "@/lib/actions/family";
import { TripDetailView } from "@/components/trip-detail-view";
import { getSession } from "@/lib/session";
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

  return <TripDetailView trip={trip} />;
}
