"use client";

import { useT } from "@/components/language-provider";

export function SettingsPageHeader() {
  const t = useT();
  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        {t("settings.title")}
      </h1>
      <p className="mt-2 text-[var(--muted-foreground)]">
        {t("settings.subtitle")}
      </p>
    </div>
  );
}
