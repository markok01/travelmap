"use client";

import { useT } from "@/components/language-provider";

export function CountriesPageHeader({ count }: { count: number }) {
  const t = useT();
  return (
    <div>
      <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        {t("countries.catalogEyebrow")}
      </p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
        {t("countries.title")}
      </h1>
      <p className="mt-2 max-w-xl text-[var(--muted-foreground)]">
        {t("countries.description", { count })}
      </p>
    </div>
  );
}
