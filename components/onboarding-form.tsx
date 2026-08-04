"use client";

import { useActionState } from "react";
import {
  createFamilyAction,
  type ActionState,
} from "@/lib/actions/family";

const initialState: ActionState = {};

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, pending] = useActionState(
    createFamilyAction,
    initialState,
  );

  return (
    <form action={formAction} className="mx-auto w-full max-w-lg space-y-6">
      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Create your family atlas
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Add your household now. Extra members can be invites for later — no
          account required yet.
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Family name</span>
        <input
          name="familyName"
          required
          className="field"
          placeholder="Rivera Family"
          defaultValue={`${defaultName.split(" ").slice(-1)[0] ?? "Our"} Family`}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Your display name</span>
        <input
          name="displayName"
          required
          className="field"
          defaultValue={defaultName}
        />
      </label>

      <div className="space-y-3 rounded-3xl border border-[var(--border)] bg-[var(--muted)]/40 p-4">
        <div>
          <p className="text-sm font-medium">Invite members (optional)</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Placeholder invites — they get a color on the map later.
          </p>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-2">
            <input
              name={`memberName${i}`}
              className="field"
              placeholder={`Member ${i} name`}
            />
            <input
              name={`memberEmail${i}`}
              type="email"
              className="field"
              placeholder="Email (optional)"
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
        {pending ? "Creating…" : "Create family account"}
      </button>
    </form>
  );
}
