"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (Date.now() < cooldownUntil) {
      setError("Please wait a moment before requesting another email.");
      return;
    }

    setLoading(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error: resetError } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo,
    });
    setLoading(false);

    if (resetError) {
      setError(resetError.message ?? "Could not send reset email.");
      return;
    }

    setSent(true);
    setCooldownUntil(Date.now() + 30_000);
  }

  if (sent) {
    return (
      <div className="mx-auto w-full max-w-md space-y-5 text-center">
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            If an account exists for that address, we sent a password reset
            link. It expires in about an hour.
          </p>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Didn’t get it? Check spam, or{" "}
          <button
            type="button"
            className="text-[var(--accent)] underline-offset-2 hover:underline"
            onClick={() => setSent(false)}
          >
            try again
          </button>
          .
        </p>
        <Link href="/login" className="btn-secondary inline-flex">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-5">
      <div className="space-y-2 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Forgot password
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Enter your email and we’ll send a reset link if an account exists.
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Email</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </label>

      {error ? (
        <p className="rounded-2xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        <Link
          href="/login"
          className="text-[var(--accent)] underline-offset-2 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
