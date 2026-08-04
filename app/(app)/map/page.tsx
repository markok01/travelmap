import { MapExplorer } from "@/components/map-explorer";
import { getFamilyForUser } from "@/lib/actions/family";
import { getCountries } from "@/lib/countries/queries";
import { getFamilyVisitMap } from "@/lib/map/visits";
import { getFamilyMapPins, getFamilyMapTrips } from "@/lib/map/pins";
import { getSession } from "@/lib/session";
import { getWishlistForFamily } from "@/lib/wishlist/queries";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; trip?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const family = await getFamilyForUser(session.user.id);
  if (!family) return null;
  const viewer = {
    userId: session.user.id,
    familyMemberIds: family.members.map((member) => member.id),
  };

  const [visitMap, countries, pins, trips, wishlist, query] = await Promise.all([
    getFamilyVisitMap(family.id, viewer),
    getCountries(),
    getFamilyMapPins(family.id, viewer),
    getFamilyMapTrips(family.id, undefined, viewer),
    getWishlistForFamily(family.id),
    searchParams,
  ]);

  return (
    <MapExplorer
      visitMap={visitMap}
      countries={countries}
      pins={pins}
      trips={trips}
      wishlistCodes={wishlist.map((item) => item.countryCode)}
      initialCountry={query.country}
      initialTripId={query.trip}
    />
  );
}
