"use client";

import { useActionState } from "react";
import { useT } from "@/components/language-provider";
import {
  createFamilyAction,
  type ActionState,
} from "@/lib/actions/family";

const initialState: ActionState = {};

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    createFamilyAction,
    initialState,
  );

  return (
    <form action={formAction} className="mx-auto w-full max-w-lg space-y-6">
      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          {t("auth.onboardingTitle")}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("auth.onboardingSubtitle")}
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{t("auth.familyName")}</span>
        <input
          name="familyName"
          required
          className="field"
          placeholder={t("auth.familyNamePlaceholder")}
          defaultValue={`${defaultName.split(" ").slice(-1)[0] ?? "Our"} Family`}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{t("auth.displayName")}</span>
        <input
          name="displayName"
          required
          className="field"
          defaultValue={defaultName}
        />
      </label>

      <div className="space-y-3 rounded-3xl border border-[var(--border)] bg-[var(--muted)]/40 p-4">
        <div>
          <p className="text-sm font-medium">{t("auth.inviteMembers")}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {t("auth.inviteHint")}
          </p>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-2">
            <input
              name={`memberName${i}`}
              className="field"
              placeholder={t("auth.memberNamePlaceholder", { n: i })}
            />
            <input
              name={`memberEmail${i}`}
              type="email"
              className="field"
              placeholder={t("auth.emailOptional")}
            />
          </div>
        ))}
      </div>

      {state.error ? (
        <p className="rounded-2xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? t("auth.creating") : t("auth.createFamily")}
      </button>
    </form>
  );
}
