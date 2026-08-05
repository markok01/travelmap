"use client";

import { EmptyState } from "@/components/empty-state";
import { useT } from "@/components/language-provider";

export function TripsEmptyState({ kind }: { kind: "none" | "noMatch" }) {
  const t = useT();
  if (kind === "none") {
    return (
      <EmptyState
        eyebrow={t("trips.eyebrow")}
        title={t("trips.emptyTitle")}
        description={t("trips.emptyDescription")}
        actionHref="/trips/new"
        actionLabel={t("common.addFirstTrip")}
      />
    );
  }
  return (
    <EmptyState
      title={t("trips.noMatchTitle")}
      description={t("trips.noMatchDescription")}
      actionHref="/trips"
      actionLabel={t("trips.clearFilters")}
    />
  );
}
