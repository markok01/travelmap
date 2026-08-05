"use client";

import { AppearanceSettings } from "@/components/appearance-settings";
import { ChangePasswordForm } from "@/components/change-password-form";
import { FamilyMembersPanel } from "@/components/family-members-panel";
import { FamilyNameSettings } from "@/components/family-name-settings";
import { LanguageSettings } from "@/components/language-settings";
import { SettingsPageHeader } from "@/components/settings-page-header";
import { ShareSettings } from "@/components/share-settings";
import { WishlistPanel } from "@/components/wishlist-panel";
import { OfflineWriteGuard } from "@/components/offline-write-guard";
import { useOnline } from "@/components/offline-provider";
import { useT } from "@/components/language-provider";
import type {
  Country,
  FamilyMember,
  FamilyShare,
} from "@/lib/db/schema";
import type { getWishlistForFamily } from "@/lib/wishlist/queries";

type WishlistWithCountry = Awaited<
  ReturnType<typeof getWishlistForFamily>
>[number];

function MembersReadOnly({ members }: { members: FamilyMember[] }) {
  const t = useT();
  return (
    <section className="settings-panel space-y-4">
      <h2 className="settings-section-label text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        {t("settings.members")}
      </h2>
      <ul className="settings-list divide-y divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)]">
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-3 px-4 py-3">
            <span
              className="h-9 w-9 shrink-0 rounded-full"
              style={{ backgroundColor: member.color }}
            />
            <div className="min-w-0">
              <p className="truncate font-medium">{member.displayName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {member.role === "owner"
                  ? t("common.owner")
                  : t("common.member")}
                {" · "}
                {member.userId
                  ? t("settings.linked")
                  : t("settings.invitePending")}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-sm text-[var(--muted-foreground)]">
        {t("settings.membersReadOnly")}
      </p>
    </section>
  );
}

export function SettingsView({
  isOwner,
  familyName,
  email,
  members,
  countries,
  wishlist,
  share,
}: {
  isOwner: boolean;
  familyName: string;
  email: string;
  members: FamilyMember[];
  countries: Country[];
  wishlist: WishlistWithCountry[];
  share: FamilyShare | null;
}) {
  const online = useOnline();

  return (
    <div className="space-y-8">
      <SettingsPageHeader />
      <LanguageSettings />
      <AppearanceSettings />
      {online ? (
        <>
          <ChangePasswordForm />
          <WishlistPanel countries={countries} items={wishlist} />
          <ShareSettings share={share} isOwner={isOwner} />
          <FamilyNameSettings
            name={familyName}
            email={email}
            canEdit={isOwner}
          />
          {isOwner ? (
            <FamilyMembersPanel members={members} />
          ) : (
            <MembersReadOnly members={members} />
          )}
        </>
      ) : (
        <>
          <OfflineWriteGuard bodyKey="offline.settingsBlockedBody" />
          <MembersReadOnly members={members} />
        </>
      )}
    </div>
  );
}
