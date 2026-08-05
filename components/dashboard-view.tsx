"use client";

import Link from "next/link";
import { useMemo } from "react";
import { EmptyState } from "@/components/empty-state";
import { useT } from "@/components/language-provider";
import { OfflineSnapshotSaver } from "@/components/offline-snapshot-saver";
import { useOnline } from "@/components/offline-provider";
import { TripCard } from "@/components/trip-card";
import type { TripWithDetails } from "@/lib/trips/queries";

type Member = {
  id: string;
  displayName: string;
  color: string;
  role: string;
  userId: string | null;
};

export function DashboardView({
  familyName,
  members,
  recentTrips,
  currentYear,
  thisYearCountries,
  thisYearTripsCount,
  thisYearDays,
  anyoneCount,
}: {
  familyName: string;
  members: Member[];
  recentTrips: TripWithDetails[];
  currentYear: number;
  thisYearCountries: number;
  thisYearTripsCount: number;
  thisYearDays: number;
  anyoneCount: number;
}) {
  const t = useT();
  const online = useOnline();
  const hasTrips = recentTrips.length > 0;
  const snapshot = useMemo(
    () => ({
      familyName,
      anyoneCount,
      currentYear,
      thisYearCountries,
      thisYearTripsCount,
      thisYearDays,
      memberCount: members.length,
      tripIds: recentTrips.map((trip) => trip.id),
    }),
    [
      familyName,
      anyoneCount,
      currentYear,
      thisYearCountries,
      thisYearTripsCount,
      thisYearDays,
      members.length,
      recentTrips,
    ],
  );

  if (!hasTrips) {
    return (
      <div className="space-y-8">
        <OfflineSnapshotSaver snapshotKey="dashboard" payload={snapshot} />
        <EmptyState
          eyebrow={t("dashboard.eyebrow")}
          title={t("dashboard.welcomeTitle", { name: familyName })}
          description={t("dashboard.welcomeDescription")}
          actionHref="/trips/new"
          actionLabel={t("common.addFirstTrip")}
        />
        <section>
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            {t("dashboard.members")}
          </p>
          <MembersRow members={members} />
        </section>
      </div>
    );
  }

  const [featuredTrip, ...otherRecent] = recentTrips;

  return (
    <div className="space-y-8">
      <OfflineSnapshotSaver snapshotKey="dashboard" payload={snapshot} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            {t("dashboard.eyebrow")}
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
            {familyName}
          </h1>
        </div>
        {online ? (
          <Link href="/trips/new" className="btn-primary">
            {t("common.addTrip")}
          </Link>
        ) : (
          <span className="btn-secondary pointer-events-none opacity-60">
            {t("common.addTrip")}
          </span>
        )}
      </div>

      <section className="surface p-5 md:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {t("dashboard.soFar", { year: currentYear })}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
          <StatInline
            label={t("dashboard.countries")}
            value={String(thisYearCountries)}
          />
          <StatInline
            label={t("dashboard.trips")}
            value={String(thisYearTripsCount)}
          />
          <StatInline
            label={t("dashboard.daysOnRoad")}
            value={String(thisYearDays)}
          />
        </div>
      </section>

      <Link
        href="/map"
        className="surface block p-5 transition hover:shadow-[var(--shadow-md)] md:p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              {t("dashboard.worldMap")}
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">
              {anyoneCount === 1
                ? t("dashboard.countryVisited", { count: anyoneCount })
                : t("dashboard.countriesVisited", { count: anyoneCount })}
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {t("dashboard.exploreWhere")}
            </p>
          </div>
          <span className="btn-secondary shrink-0">{t("dashboard.openMap")}</span>
        </div>
      </Link>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            {t("dashboard.recentTrips")}
          </h2>
          <Link
            href="/trips"
            className="text-sm text-[var(--accent)] hover:underline"
          >
            {t("dashboard.viewAll")}
          </Link>
        </div>
        <ul className="grid gap-3">
          <li>
            <TripCard trip={featuredTrip} featured />
          </li>
          {otherRecent.map((trip) => (
            <li key={trip.id}>
              <TripCard trip={trip} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            {t("dashboard.members")}
          </h2>
          <span className="text-sm text-[var(--muted-foreground)]">
            {members.length === 1
              ? t("dashboard.traveler", { count: members.length })
              : t("dashboard.travelers", { count: members.length })}
          </span>
        </div>
        <MembersRow members={members} />
      </section>
    </div>
  );
}

function StatInline({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
        {value}
      </p>
      <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
    </div>
  );
}

function MembersRow({ members }: { members: Member[] }) {
  const t = useT();
  return (
    <ul className="flex flex-wrap gap-2">
      {members.map((member) => (
        <li
          key={member.id}
          className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: member.color }}
            aria-hidden
          >
            {member.displayName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <span className="font-medium">{member.displayName}</span>
          {member.role === "owner" ? (
            <span className="text-xs text-[var(--muted-foreground)]">
              {t("common.owner")}
            </span>
          ) : member.userId ? null : (
            <span className="text-xs text-[var(--muted-foreground)]">
              {t("dashboard.pending")}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
