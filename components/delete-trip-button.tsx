"use client";

import { useT } from "@/components/language-provider";
import { useOnline } from "@/components/offline-provider";
import { deleteTripAction } from "@/lib/actions/trips";

export function DeleteTripButton({ tripId }: { tripId: string }) {
  const t = useT();
  const online = useOnline();

  if (!online) {
    return (
      <button
        type="button"
        disabled
        className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted-foreground)] opacity-60"
        title={t("offline.writeBlockedBody")}
      >
        {t("trips.deleteTrip")}
      </button>
    );
  }

  return (
    <form action={deleteTripAction}>
      <input type="hidden" name="tripId" value={tripId} />
      <button
        type="submit"
        className="rounded-full border border-[var(--danger)] px-4 py-2 text-sm text-[var(--danger)] transition hover:bg-[var(--danger-soft)]"
      >
        {t("trips.deleteTrip")}
      </button>
    </form>
  );
}
