import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="atmosphere min-h-dvh px-4 py-6">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <BrandMark size="sm" />
        <ThemeToggle />
      </div>
      <div className="mx-auto mt-16 surface p-6 md:p-8">
        <AuthForm mode="login" />
        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          Demo:{" "}
          <Link href="/register" className="underline-offset-2 hover:underline">
            demo@familytravel.app
          </Link>{" "}
          / demo1234 (after seed)
        </p>
      </div>
    </div>
  );
}
