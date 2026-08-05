"use client";

import Link from "next/link";
import { useT } from "@/components/language-provider";

export function EditTripPageHeader({
  tripId,
  title,
}: {
  tripId: string;
  title: string;
}) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {t("trips.edit")}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          {title}
        </h1>
      </div>
      <Link href={`/trips/${tripId}`} className="btn-secondary">
        {t("common.cancel")}
      </Link>
    </div>
  );
}
