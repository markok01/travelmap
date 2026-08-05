"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useT } from "@/components/language-provider";
import { OfflineSnapshotSaver } from "@/components/offline-snapshot-saver";
import { useOnline } from "@/components/offline-provider";

export function TripsPageHeader({ tripCount }: { tripCount: number }) {
  const t = useT();
  const online = useOnline();
  const snapshot = useMemo(() => ({ tripCount }), [tripCount]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <OfflineSnapshotSaver snapshotKey="trips" payload={snapshot} />
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {t("trips.eyebrow")}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
          {t("trips.title")}
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          {tripCount === 1
            ? t("trips.countOne", { count: tripCount })
            : t("trips.count", { count: tripCount })}
        </p>
      </div>
      {online ? (
        <Link href="/trips/new" className="btn-primary">
          {t("trips.add")}
        </Link>
      ) : (
        <span className="btn-secondary pointer-events-none opacity-60">
          {t("trips.add")}
        </span>
      )}
    </div>
  );
}
