import { AppearanceSettings } from "@/components/appearance-settings";
import { FamilyMembersPanel } from "@/components/family-members-panel";
import { ShareSettings } from "@/components/share-settings";
import { WishlistPanel } from "@/components/wishlist-panel";
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
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Manage appearance, family account, and member invites.
        </p>
      </div>

      <AppearanceSettings />

      <WishlistPanel countries={countries} items={wishlist} />

      <ShareSettings share={share ?? null} isOwner={isOwner} />

      <section className="settings-panel space-y-1">
        <h2 className="settings-section-label text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          Family
        </h2>
        <p className="text-xl font-semibold tracking-tight">
          {family.name}
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Signed in as {session.user.email}
        </p>
      </section>

      {isOwner ? (
        <FamilyMembersPanel members={members} />
      ) : (
        <section className="settings-panel space-y-4">
          <h2 className="settings-section-label text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Family members
          </h2>
          <ul className="settings-list divide-y divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)]">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span
                  className="h-9 w-9 shrink-0 rounded-full"
                  style={{ backgroundColor: member.color }}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{member.displayName}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {member.role === "owner" ? "Owner" : "Member"}
                    {" · "}
                    {member.userId ? "Linked" : "Invite pending"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-sm text-[var(--muted-foreground)]">
            Only the family owner can add or remove members.
          </p>
        </section>
      )}
    </div>
  );
}
