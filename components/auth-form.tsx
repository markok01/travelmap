"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/language-provider";
import { authClient } from "@/lib/auth-client";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "register") {
      const { error: signUpError } = await authClient.signUp.email({
        name,
        email,
        password,
      });
      setLoading(false);
      if (signUpError) {
        setError(signUpError.message ?? t("auth.createError"));
        return;
      }
      router.push("/onboarding");
      router.refresh();
      return;
    }

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message ?? t("auth.signInError"));
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-5">
      <div className="space-y-2 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          {mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {mode === "login"
            ? t("auth.signInSubtitle")
            : t("auth.registerSubtitle")}
        </p>
      </div>

      {mode === "register" ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{t("auth.name")}</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
            placeholder="Alex Rivera"
            autoComplete="name"
          />
        </label>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{t("auth.email")}</span>
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

      <label className="block space-y-1.5">
        <span className="flex items-center justify-between gap-3 text-sm font-medium">
          <span>{t("auth.password")}</span>
          {mode === "login" ? (
            <Link
              href="/forgot-password"
              className="font-normal text-[var(--accent)] underline-offset-2 hover:underline"
            >
              {t("auth.forgotPassword")}
            </Link>
          ) : null}
        </span>
        <input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field"
          placeholder="••••••••"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </label>

      {error ? (
        <p className="rounded-2xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading
          ? t("auth.pleaseWait")
          : mode === "login"
            ? t("auth.signIn")
            : t("auth.createAccountBtn")}
      </button>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {mode === "login" ? (
          <>
            {t("auth.noAccount")}{" "}
            <Link
              href="/register"
              className="text-[var(--accent)] underline-offset-2 hover:underline"
            >
              {t("auth.register")}
            </Link>
          </>
        ) : (
          <>
            {t("auth.hasAccount")}{" "}
            <Link
              href="/login"
              className="text-[var(--accent)] underline-offset-2 hover:underline"
            >
              {t("auth.signIn")}
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
