import type { Trip } from "@/lib/db/schema";

export type TripViewer = {
  userId?: string | null;
  familyMemberIds?: Iterable<string>;
  isShareView?: boolean;
};

export function canViewTrip(
  trip: Pick<Trip, "privacy" | "createdByUserId">,
  viewer: TripViewer,
) {
  // Creator always sees their own trips
  if (viewer.userId && trip.createdByUserId === viewer.userId) return true;

  // Public share links: public trips only
  if (viewer.isShareView) return trip.privacy === "public";

  const inFamily =
    Boolean(viewer.userId) &&
    Array.from(viewer.familyMemberIds ?? []).length > 0;

  if (!inFamily) return false;

  // Private: creator only (handled above)
  if (trip.privacy === "private") return false;

  // family | friends | public — visible to family members
  return true;
}
