"use client";

import { useState, useTransition } from "react";
import { useT } from "@/components/language-provider";
import {
  disableFamilyShareAction,
  enableFamilyShareAction,
  rotateFamilyShareAction,
} from "@/lib/actions/share";

export function ShareSettings({
  share,
  isOwner,
}: {
  share: { token: string; enabled: boolean } | null;
  isOwner: boolean;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [token, setToken] = useState(share?.token ?? "");
  const [enabled, setEnabled] = useState(share?.enabled ?? false);
  const [message, setMessage] = useState<string | null>(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = token && origin ? `${origin}/share/${token}` : "";

  function run(action: () => Promise<{ error?: string; token?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setMessage(result.error);
        return;
      }
      if (result.token) setToken(result.token);
      setMessage(null);
    });
  }

  return (
    <section className="settings-panel space-y-4">
      <div>
        <h2 className="settings-section-label text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {t("settings.share")}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {t("settings.shareHint")}
        </p>
      </div>

      {isOwner ? (
        <>
          <div className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)] px-4 py-3">
            <div>
              <p className="font-medium">{t("settings.publicLink")}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {enabled ? t("settings.enabled") : t("settings.disabled")}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={pending}
              onClick={() => {
                if (enabled) {
                  run(async () => {
                    const result = await disableFamilyShareAction();
                    if (result.success) setEnabled(false);
                    return result;
                  });
                } else {
                  run(async () => {
                    const result = await enableFamilyShareAction();
                    if (result.success) setEnabled(true);
                    return result;
                  });
                }
              }}
              className={`relative h-7 w-12 rounded-full transition ${
                enabled ? "bg-[var(--accent)]" : "bg-[var(--muted)]"
              } disabled:opacity-60`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                  enabled ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          {enabled && token ? (
            <div className="space-y-3 rounded-[var(--radius-lg)] bg-[var(--accent-soft)]/50 p-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  {t("settings.readOnlyLink")}
                </span>
                <input
                  className="field text-sm"
                  readOnly
                  value={link}
                  placeholder={t("settings.preparingLink")}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={!link}
                  onClick={() => navigator.clipboard.writeText(link)}
                >
                  {t("settings.copyLink")}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      const result = await rotateFamilyShareAction();
                      if (result.success) setEnabled(true);
                      return result;
                    })
                  }
                >
                  {t("settings.rotateLink")}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("settings.shareOwnerOnly")}
        </p>
      )}

      {message ? <p className="text-sm text-[var(--danger)]">{message}</p> : null}
    </section>
  );
}
