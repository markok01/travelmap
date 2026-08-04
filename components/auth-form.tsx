"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
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
        setError(signUpError.message ?? "Could not create account.");
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
      setError(signInError.message ?? "Could not sign in.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-5">
      <div className="space-y-2 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {mode === "login"
            ? "Sign in to your Family Travel Atlas."
            : "Start a shared atlas for your family."}
        </p>
      </div>

      {mode === "register" ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Name</span>
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

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Password</span>
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
          ? "Please wait…"
          : mode === "login"
            ? "Sign in"
            : "Create account"}
      </button>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {mode === "login" ? (
          <>
            No account yet?{" "}
            <Link href="/register" className="text-[var(--accent)] underline-offset-2 hover:underline">
              Register
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--accent)] underline-offset-2 hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
