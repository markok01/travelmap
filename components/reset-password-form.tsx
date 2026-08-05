"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useT } from "@/components/language-provider";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({
  token,
  invalidToken,
}: {
  token: string | null;
  invalidToken?: boolean;
}) {
  const t = useT();
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
            {t("auth.linkExpiredTitle")}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("auth.linkExpiredSubtitle")}
          </p>
        </div>
        <Link href="/forgot-password" className="btn-primary inline-flex">
          {t("auth.requestNewLink")}
        </Link>
        <p className="text-sm text-[var(--muted-foreground)]">
          <Link
            href="/login"
            className="text-[var(--accent)] underline-offset-2 hover:underline"
          >
            {t("auth.backToSignIn")}
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
            {t("auth.passwordUpdatedTitle")}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("auth.passwordUpdatedSubtitle")}
          </p>
        </div>
        <Link href="/login" className="btn-primary inline-flex">
          {t("auth.signIn")}
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t("auth.passwordMinLength"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.passwordsMismatch"));
      return;
    }
    if (!token) {
      setError(t("auth.missingToken"));
      return;
    }

    setLoading(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setLoading(false);

    if (resetError) {
      setError(resetError.message ?? t("auth.resetPasswordError"));
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
          {t("auth.resetTitle")}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("auth.resetSubtitle")}
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{t("settings.newPassword")}</span>
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
        <span className="text-sm font-medium">{t("auth.confirmPasswordLabel")}</span>
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
        {loading ? t("common.saving") : t("settings.updatePassword")}
      </button>
    </form>
  );
}
