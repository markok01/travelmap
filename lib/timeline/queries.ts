import { getStatsTripsForFamily } from "@/lib/stats/queries";
import type { TripViewer } from "@/lib/trips/privacy";

export async function getTripsForTimeline(familyId: string, viewer?: TripViewer) {
  return getStatsTripsForFamily(familyId, viewer);
}
