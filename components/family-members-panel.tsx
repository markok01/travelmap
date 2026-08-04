"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  addFamilyMemberAction,
  removeFamilyMemberAction,
  type ActionState,
} from "@/lib/actions/family";
import type { FamilyMember } from "@/lib/db/schema";

const initialState: ActionState = {};

export function FamilyMembersPanel({ members }: { members: FamilyMember[] }) {
  return (
    <section className="settings-panel space-y-6">
      <div>
        <h2 className="settings-section-label text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          Family members
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          See who is in the family, remove someone, or add them again.
        </p>
      </div>

      <ul className="settings-list divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
        {members.map((member) => (
          <MemberRow key={member.id} member={member} />
        ))}
      </ul>

      <div className="space-y-3 border-t border-[var(--border)] pt-5">
        <div>
          <h3 className="text-sm font-medium">Add member</h3>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            Invite placeholders for now — full invite emails later.
          </p>
        </div>
        <AddMemberForm />
      </div>
    </section>
  );
}

function MemberRow({ member }: { member: FamilyMember }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(
    removeFamilyMemberAction,
    initialState,
  );
  const isOwner = member.role === "owner";
  const linked = Boolean(member.userId);

  useEffect(() => {
    if (state.success) setConfirming(false);
  }, [state.success]);

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span
        className="h-9 w-9 shrink-0 rounded-full"
        style={{ backgroundColor: member.color }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{member.displayName}</p>
        <p className="text-xs text-[var(--muted-foreground)]">
          {isOwner ? "Owner" : "Member"}
          {" · "}
          {linked ? "Linked" : "Invite pending"}
          {member.inviteEmail ? ` · ${member.inviteEmail}` : ""}
        </p>
        {state.error ? (
          <p className="mt-1 text-xs text-[var(--danger)]">{state.error}</p>
        ) : null}
      </div>

      {isOwner ? (
        <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]">
          Can&apos;t remove
        </span>
      ) : confirming ? (
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="memberId" value={member.id} />
          <span className="text-xs text-[var(--muted-foreground)]">
            Remove {member.displayName}?
          </span>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-[var(--danger)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            {pending ? "Removing…" : "Confirm"}
          </button>
          <button
            type="button"
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs"
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[color-mix(in_oklab,var(--muted)_50%,transparent)]"
          onClick={() => setConfirming(true)}
        >
          Remove
        </button>
      )}
    </li>
  );
}

function AddMemberForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    addFamilyMemberAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="displayName"
          required
          className="field"
          placeholder="Display name"
        />
        <input
          name="inviteEmail"
          type="email"
          className="field"
          placeholder="Invite email (optional)"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-[var(--danger)]">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-[var(--accent)]">Member added.</p>
      ) : null}
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? "Adding…" : "Add member"}
      </button>
    </form>
  );
}
