"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useT } from "@/components/language-provider";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (Date.now() < cooldownUntil) {
      setError(t("auth.cooldownWait"));
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
      setError(resetError.message ?? t("auth.resetEmailError"));
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
            {t("auth.checkEmail")}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("auth.checkEmailHint")}
          </p>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("auth.resendHint")}{" "}
          <button
            type="button"
            className="text-[var(--accent)] underline-offset-2 hover:underline"
            onClick={() => setSent(false)}
          >
            {t("auth.tryAgain")}
          </button>
          .
        </p>
        <Link href="/login" className="btn-secondary inline-flex">
          {t("auth.backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-5">
      <div className="space-y-2 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          {t("auth.forgotTitle")}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("auth.forgotSubtitle")}
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{t("auth.email")}</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
          placeholder={t("auth.emailPlaceholder")}
          autoComplete="email"
        />
      </label>

      {error ? (
        <p className="rounded-2xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? t("auth.sending") : t("auth.sendReset")}
      </button>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        <Link
          href="/login"
          className="text-[var(--accent)] underline-offset-2 hover:underline"
        >
          {t("auth.backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
