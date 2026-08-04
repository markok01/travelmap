import { StatsExplorer } from "@/components/stats-explorer";
import { getFamilyForUser } from "@/lib/actions/family";
import { getSession } from "@/lib/session";
import {
  getStatsCatalogSize,
  getStatsTripsForFamily,
  toStatsMembers,
} from "@/lib/stats/queries";

export default async function StatsPage() {
  const session = await getSession();
  if (!session) return null;

  const family = await getFamilyForUser(session.user.id);
  if (!family) return null;

  const [trips, catalogSize] = await Promise.all([
    getStatsTripsForFamily(family.id, {
      userId: session.user.id,
      familyMemberIds: family.members.map((member) => member.id),
    }),
    getStatsCatalogSize(),
  ]);

  return (
    <StatsExplorer
      trips={trips}
      members={toStatsMembers(family.members)}
      catalogSize={catalogSize}
    />
  );
}
