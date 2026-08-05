import { SettingsView } from "@/components/settings-view";
import { getFamilyForUser } from "@/lib/actions/family";
import { getCountries } from "@/lib/countries/queries";
import { getShareForFamily } from "@/lib/share/queries";
import { getSession } from "@/lib/session";
import { getWishlistForFamily } from "@/lib/wishlist/queries";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const family = await getFamilyForUser(session.user.id);
  if (!family) return null;

  const isOwner = family.members.some(
    (m) => m.userId === session.user.id && m.role === "owner",
  );

  const [countries, wishlist, share] = await Promise.all([
    getCountries(),
    getWishlistForFamily(family.id),
    isOwner ? getShareForFamily(family.id) : Promise.resolve(null),
  ]);

  const members = [...family.members].sort((a, b) => {
    if (a.role === "owner" && b.role !== "owner") return -1;
    if (b.role === "owner" && a.role !== "owner") return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return (
    <SettingsView
      isOwner={isOwner}
      familyName={family.name}
      email={session.user.email}
      members={members}
      countries={countries}
      wishlist={wishlist}
      share={share ?? null}
    />
  );
}
