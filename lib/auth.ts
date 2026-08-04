import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import {
  appOrigin,
  passwordChangedEmail,
  passwordResetEmail,
  sendEmail,
} from "@/lib/email";

function hostFromUrl(value?: string | null) {
  if (!value?.trim()) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(withProtocol).host;
  } catch {
    return null;
  }
}

function authAllowedHosts() {
  const hosts = new Set<string>([
    "localhost",
    "localhost:*",
    "127.0.0.1",
    "127.0.0.1:*",
    // Vercel production + every preview deployment
    "*.vercel.app",
  ]);

  for (const value of [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]) {
    const host = hostFromUrl(value);
    if (host) hosts.add(host);
  }

  // Optional comma-separated extra hosts, e.g. "travelmap.app,www.travelmap.app"
  for (const raw of (process.env.BETTER_AUTH_TRUSTED_HOSTS ?? "").split(",")) {
    const host = raw.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
    if (host) hosts.add(host);
  }

  return [...hosts];
}

function authFallbackUrl() {
  return (
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
      : "http://localhost:3000")
  );
}

export const auth = betterAuth({
  // Allows production + Vercel preview URLs (fixes "Invalid origin: https://…vercel.app")
  baseURL: {
    allowedHosts: authAllowedHosts(),
    fallback: authFallbackUrl(),
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://*.vercel.app",
    ...(process.env.BETTER_AUTH_URL
      ? [process.env.BETTER_AUTH_URL.replace(/\/$/, "")]
      : []),
  ],
  database: drizzleAdapter(db, {
    provider: "mysql",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, token }) => {
      const resetUrl = `${appOrigin()}/reset-password?token=${encodeURIComponent(token)}`;
      const template = passwordResetEmail({
        name: user.name,
        resetUrl,
      });
      await sendEmail({
        to: user.email,
        ...template,
      });
    },
    onPasswordReset: async ({ user }) => {
      const template = passwordChangedEmail({
        name: user.name,
        resetUrl: `${appOrigin()}/forgot-password`,
      });
      try {
        await sendEmail({
          to: user.email,
          ...template,
        });
      } catch (error) {
        console.error("[auth] password-changed email failed:", error);
      }
    },
  },
  plugins: [nextCookies()],
});
