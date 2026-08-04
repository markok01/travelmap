import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getFamilyForUser } from "@/lib/actions/family";
import { getSession } from "@/lib/session";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const family = await getFamilyForUser(session.user.id);
  if (!family) redirect("/onboarding");

  return <AppShell userName={session.user.name}>{children}</AppShell>;
}
