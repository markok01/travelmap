"use client";

import { useOffline } from "@/components/offline-provider";
import { useT } from "@/components/language-provider";

export function OfflineBanners() {
  const { online, ready, updateReady, applyUpdate } = useOffline();
  const t = useT();

  if (!ready) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col gap-2 p-3 sm:items-end">
      {!online ? (
        <div
          role="status"
          className="pointer-events-auto w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]/95 px-3 py-2 text-sm shadow-[var(--shadow-md)] backdrop-blur-sm sm:w-auto"
        >
          <p className="font-medium text-[var(--foreground)]">
            {t("offline.title")}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {t("offline.staleHint")}
          </p>
        </div>
      ) : null}

      {updateReady ? (
        <div
          role="status"
          className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]/95 px-3 py-2 text-sm shadow-[var(--shadow-md)] backdrop-blur-sm sm:w-auto"
        >
          <p className="text-[var(--foreground)]">{t("offline.updateAvailable")}</p>
          <button
            type="button"
            onClick={applyUpdate}
            className="shrink-0 rounded-[var(--radius-control)] bg-[var(--accent)] px-2.5 py-1 text-xs font-medium text-[var(--accent-foreground)]"
          >
            {t("offline.refresh")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
