"use client";

import { useActionState, useEffect, useState } from "react";
import {
  updateFamilyNameAction,
  type ActionState,
} from "@/lib/actions/family";

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
    const t = setTimeout(() => setSavedFlash(false), 2000);
    return () => clearTimeout(t);
  }, [state.success, state]);

  return (
    <section className="settings-panel space-y-4">
      <div>
        <h2 className="settings-section-label text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          Family
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {canEdit
            ? "This name appears on your dashboard and shared atlas."
            : "Signed in as a family member."}
        </p>
      </div>

      {canEdit ? (
        <form action={formAction} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Family name</span>
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
            <p className="text-sm text-[var(--accent)]">Family name saved.</p>
          ) : null}

          <button
            type="submit"
            className="btn-primary"
            disabled={pending || !value.trim() || value.trim() === name}
          >
            {pending ? "Saving…" : "Save name"}
          </button>
        </form>
      ) : (
        <p className="text-xl font-semibold tracking-tight">{name}</p>
      )}

      <p className="text-sm text-[var(--muted-foreground)]">
        Signed in as {email}
      </p>
    </section>
  );
}
