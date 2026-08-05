"use client";

import { useOnline } from "@/components/offline-provider";
import { useT } from "@/components/language-provider";

/** Blocks mutating UI while offline — no fake success. */
export function OfflineWriteGuard({
  children,
  className = "",
  bodyKey = "offline.writeBlockedBody",
}: {
  children?: React.ReactNode;
  className?: string;
  bodyKey?: string;
}) {
  const online = useOnline();
  const t = useT();

  if (online) return <>{children}</>;

  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--muted)]/40 px-4 py-5 ${className}`}
      role="status"
    >
      <p className="font-medium text-[var(--foreground)]">
        {t("offline.writeBlockedTitle")}
      </p>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t(bodyKey)}</p>
    </div>
  );
}
