import { BrandMark } from "@/components/brand-mark";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim() || null;
  const invalidToken = params.error === "INVALID_TOKEN" || !token;

  return (
    <div className="atmosphere min-h-dvh px-4 py-6">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <BrandMark size="sm" />
        <ThemeToggle />
      </div>
      <div className="mx-auto mt-16 surface p-6 md:p-8">
        <ResetPasswordForm
          token={invalidToken ? null : token}
          invalidToken={invalidToken}
        />
      </div>
    </div>
  );
}
