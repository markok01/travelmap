"use client";

import { useLanguage } from "@/components/language-provider";
import type { Locale } from "@/lib/i18n/config";

function InsetGroup({
  value,
  onChange,
  options,
}: {
  value: Locale;
  onChange: (v: Locale) => void;
  options: { value: Locale; label: string }[];
}) {
  return (
    <div className="ios-group">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            data-active={active ? "true" : "false"}
            className="ios-row"
          >
            <span className="ios-row-title block flex-1 text-[15px] leading-tight">
              {opt.label}
            </span>
            {active ? (
              <span className="mt-0.5 text-[var(--accent)]" aria-hidden>
                ✓
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function LanguageSettings() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <section className="settings-panel space-y-4">
      <div>
        <h2 className="settings-section-label text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {t("language.title")}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {t("language.hint")}
        </p>
      </div>
      <InsetGroup
        value={locale}
        onChange={setLocale}
        options={[
          { value: "en", label: t("language.english") },
          { value: "sr", label: t("language.serbian") },
        ]}
      />
    </section>
  );
}
