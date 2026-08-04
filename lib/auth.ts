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

export const auth = betterAuth({
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
