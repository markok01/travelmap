"use client";

import {
  useTheme,
  type Appearance,
  type DesignTheme,
} from "@/components/theme-provider";
import { useT } from "@/components/language-provider";

function InsetGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string }[];
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
            <span className="min-w-0 flex-1">
              <span className="ios-row-title block text-[15px] leading-tight">
                {opt.label}
              </span>
              {opt.hint ? (
                <span className="mt-0.5 block text-[12px] leading-snug text-[var(--muted-foreground)]">
                  {opt.hint}
                </span>
              ) : null}
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

export function AppearanceSettings() {
  const { design, appearance, setDesign, setAppearance } = useTheme();
  const t = useT();

  return (
    <section className="space-y-6">
      <div>
        <h2 className="settings-section-label text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {t("settings.lookFeel")}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {t("settings.lookFeelHint")}
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="settings-section-label px-1 text-[13px] font-normal uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
          {t("settings.design")}
        </h3>
        <InsetGroup<DesignTheme>
          value={design}
          onChange={setDesign}
          options={[
            {
              value: "atlas",
              label: t("settings.atlas"),
              hint: t("settings.atlasHint"),
            },
            {
              value: "minimal",
              label: t("settings.minimal"),
              hint: t("settings.minimalHint"),
            },
          ]}
        />
      </div>

      <div className="space-y-2">
        <h3 className="settings-section-label px-1 text-[13px] font-normal uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
          {t("settings.appearance")}
        </h3>
        <InsetGroup<Appearance>
          value={appearance}
          onChange={setAppearance}
          options={[
            { value: "light", label: t("settings.light") },
            { value: "dark", label: t("settings.dark") },
          ]}
        />
      </div>
    </section>
  );
}
