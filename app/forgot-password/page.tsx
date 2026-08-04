import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/lib/session";

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session) redirect("/settings");

  return (
    <div className="atmosphere min-h-dvh px-4 py-6">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <BrandMark size="sm" />
        <ThemeToggle />
      </div>
      <div className="mx-auto mt-16 surface p-6 md:p-8">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
