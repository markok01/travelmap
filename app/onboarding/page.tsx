import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { OnboardingForm } from "@/components/onboarding-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { getFamilyForUser } from "@/lib/actions/family";
import { getSession } from "@/lib/session";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const family = await getFamilyForUser(session.user.id);
  if (family) redirect("/dashboard");

  return (
    <div className="atmosphere min-h-dvh px-4 py-6">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <BrandMark href="/dashboard" size="sm" />
        <ThemeToggle />
      </div>
      <div className="mx-auto mt-12 surface p-6 md:p-8">
        <OnboardingForm defaultName={session.user.name} />
      </div>
    </div>
  );
}
