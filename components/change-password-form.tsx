"use client";

import { useState } from "react";
import { notifyPasswordChangedAction } from "@/lib/actions/password";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/components/language-provider";

export function ChangePasswordForm() {
  const t = useT();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    setLoading(true);
    const { error: changeError } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    });

    if (changeError) {
      setLoading(false);
      setError(changeError.message ?? "Could not update password.");
      return;
    }

    await notifyPasswordChangedAction();
    setLoading(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
    setSuccess(t("settings.passwordUpdated"));
  }

  return (
    <section className="settings-panel space-y-4">
      <div>
        <h2 className="settings-section-label text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {t("settings.password")}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {t("settings.passwordHint")}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">
            {t("settings.currentPassword")}
          </span>
          <input
            required
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="field"
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{t("settings.newPassword")}</span>
          <input
            required
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="field"
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">
            {t("settings.confirmPassword")}
          </span>
          <input
            required
            type="password"
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="field"
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </label>

        {error ? (
          <p className="rounded-2xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-2xl bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent)]">
            {success}
          </p>
        ) : null}

        <button type="submit" disabled={loading} className="btn-secondary">
          {loading ? t("common.saving") : t("settings.updatePassword")}
        </button>
      </form>
    </section>
  );
}
