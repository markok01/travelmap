"use server";

import {
  appOrigin,
  passwordChangedEmail,
  sendEmail,
} from "@/lib/email";
import { getSession } from "@/lib/session";

export type NotifyPasswordChangedState = {
  error?: string;
  success?: boolean;
};

/** Notify the signed-in user that their password was changed (Settings flow). */
export async function notifyPasswordChangedAction(): Promise<NotifyPasswordChangedState> {
  const session = await getSession();
  if (!session?.user?.email) {
    return { error: "You must be signed in." };
  }

  const template = passwordChangedEmail({
    name: session.user.name,
    resetUrl: `${appOrigin()}/forgot-password`,
  });

  try {
    await sendEmail({
      to: session.user.email,
      ...template,
    });
  } catch (error) {
    console.error("[auth] password-changed notify failed:", error);
  }

  return { success: true };
}
