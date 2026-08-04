"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({
  token,
  invalidToken,
}: {
  token: string | null;
  invalidToken?: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const canSubmit = useMemo(
    () => Boolean(token) && !invalidToken && password.length >= 8,
    [token, invalidToken, password],
  );

  if (invalidToken || !token) {
    return (
      <div className="mx-auto w-full max-w-md space-y-5 text-center">
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Link expired or invalid
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            This password reset link is no longer valid. Request a new one to
            continue.
          </p>
        </div>
        <Link href="/forgot-password" className="btn-primary inline-flex">
          Request new link
        </Link>
        <p className="text-sm text-[var(--muted-foreground)]">
          <Link
            href="/login"
            className="text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-md space-y-5 text-center">
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Password updated
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            You can sign in with your new password.
          </p>
        </div>
        <Link href="/login" className="btn-primary inline-flex">
          Sign in
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Missing reset token.");
      return;
    }

    setLoading(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setLoading(false);

    if (resetError) {
      setError(resetError.message ?? "Could not reset password.");
      return;
    }

    setDone(true);
    window.setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1200);
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-5">
      <div className="space-y-2 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Choose a new password
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Pick a strong password you haven’t used here before.
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">New password</span>
        <input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field"
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Confirm password</span>
        <input
          required
          type="password"
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="field"
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </label>

      {error ? (
        <p className="rounded-2xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="btn-primary w-full"
      >
        {loading ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
