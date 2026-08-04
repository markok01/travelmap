"use client";

import {
  useTheme,
  type Appearance,
  type DesignTheme,
} from "@/components/theme-provider";

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
              <span
                className="mt-0.5 text-[var(--accent)]"
                aria-hidden
              >
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

  return (
    <section className="space-y-6">
      <div>
        <h2 className="settings-section-label text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          Look & Feel
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Design language and light or dark appearance.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="settings-section-label px-1 text-[13px] font-normal uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
          Design
        </h3>
        <InsetGroup<DesignTheme>
          value={design}
          onChange={setDesign}
          options={[
            {
              value: "atlas",
              label: "Atlas",
              hint: "Warm editorial travel look",
            },
            {
              value: "minimal",
              label: "Minimal",
              hint: "iOS / macOS system style",
            },
          ]}
        />
      </div>

      <div className="space-y-2">
        <h3 className="settings-section-label px-1 text-[13px] font-normal uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
          Appearance
        </h3>
        <InsetGroup<Appearance>
          value={appearance}
          onChange={setAppearance}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </div>
    </section>
  );
}
