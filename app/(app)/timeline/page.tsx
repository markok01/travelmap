import { TimelineExplorer } from "@/components/timeline-explorer";
import { getFamilyForUser } from "@/lib/actions/family";
import { getSession } from "@/lib/session";
import { toStatsMembers } from "@/lib/stats/queries";
import { getTripsForTimeline } from "@/lib/timeline/queries";

export default async function TimelinePage() {
  const session = await getSession();
  if (!session) return null;

  const family = await getFamilyForUser(session.user.id);
  if (!family) return null;

  const trips = await getTripsForTimeline(family.id, {
    userId: session.user.id,
    familyMemberIds: family.members.map((member) => member.id),
  });

  return (
    <TimelineExplorer
      trips={trips}
      members={toStatsMembers(family.members)}
    />
  );
}
