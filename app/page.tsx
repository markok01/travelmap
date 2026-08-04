import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="atmosphere relative min-h-dvh overflow-hidden">
      <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--border)_70%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_70%,transparent)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-6">
        <header className="flex items-center justify-between">
          <BrandMark size="sm" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="btn-secondary !py-2 !px-4 text-sm">
              Sign in
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center py-16">
          <p className="mb-4 text-sm uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
            For families who wander
          </p>
          <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Family Travel Atlas
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted-foreground)]">
            One shared account for every journey — yours, your partner&apos;s,
            and the whole family&apos;s — colored onto a living world map.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary">
              Start your atlas
            </Link>
            <Link href="/login" className="btn-secondary">
              I already have an account
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
