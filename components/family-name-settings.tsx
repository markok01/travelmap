"use client";

import { useActionState, useEffect, useState } from "react";
import {
  updateFamilyNameAction,
  type ActionState,
} from "@/lib/actions/family";
import { useT } from "@/components/language-provider";

const initialState: ActionState = {};

export function FamilyNameSettings({
  name,
  email,
  canEdit,
}: {
  name: string;
  email: string;
  canEdit: boolean;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    updateFamilyNameAction,
    initialState,
  );
  const [value, setValue] = useState(name);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setValue(name);
  }, [name]);

  useEffect(() => {
    if (!state.success) return;
    setSavedFlash(true);
    const timer = setTimeout(() => setSavedFlash(false), 2000);
    return () => clearTimeout(timer);
  }, [state.success, state]);

  return (
    <section className="settings-panel space-y-4">
      <div>
        <h2 className="settings-section-label text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {t("settings.family")}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {canEdit ? t("settings.familyHint") : t("settings.familyMemberHint")}
        </p>
      </div>

      {canEdit ? (
        <form action={formAction} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t("settings.familyName")}</span>
            <input
              name="familyName"
              required
              maxLength={255}
              className="field"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Our Family"
              autoComplete="organization"
            />
          </label>

          {state.error ? (
            <p className="rounded-[var(--radius-lg)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
              {state.error}
            </p>
          ) : null}
          {savedFlash ? (
            <p className="text-sm text-[var(--accent)]">{t("settings.familySaved")}</p>
          ) : null}

          <button
            type="submit"
            className="btn-primary"
            disabled={pending || !value.trim() || value.trim() === name}
          >
            {pending ? t("common.saving") : t("settings.saveName")}
          </button>
        </form>
      ) : (
        <p className="text-xl font-semibold tracking-tight">{name}</p>
      )}

      <p className="text-sm text-[var(--muted-foreground)]">
        {t("settings.signedInAs", { email })}
      </p>
    </section>
  );
}
