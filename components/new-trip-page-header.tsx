"use client";

import Link from "next/link";
import { useT } from "@/components/language-provider";

export function NewTripPageHeader({
  useFullForm,
  countryCode,
}: {
  useFullForm: boolean;
  countryCode?: string;
}) {
  const t = useT();
  const querySuffix = countryCode ? `&country=${countryCode}` : "";
  const wizardHref = `/trips/new${countryCode ? `?country=${countryCode}` : ""}`;
  const fullHref = `/trips/new?form=full${querySuffix}`;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            {t("trips.newEyebrow")}
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            {t("trips.newTitle")}
          </h1>
        </div>
        <Link href="/trips" className="btn-secondary">
          {t("common.cancel")}
        </Link>
      </div>
      <p className="text-sm text-[var(--muted-foreground)]">
        <Link
          href={useFullForm ? wizardHref : fullHref}
          className="text-[var(--accent)] hover:underline"
        >
          {useFullForm ? t("trips.useWizard") : t("trips.useFullForm")}
        </Link>
      </p>
    </>
  );
}
