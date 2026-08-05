import Link from "next/link";

export default function OfflineFallbackPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        Family Travel Atlas
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        You&apos;re offline
      </h1>
      <p className="mt-3 text-[var(--muted-foreground)]">
        This screen wasn&apos;t saved on this device yet. Reconnect, open Map,
        Trips, or Home once, then they&apos;ll be available offline.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/dashboard" className="btn-primary">
          Try Home
        </Link>
        <Link href="/map" className="btn-secondary">
          Try Map
        </Link>
        <Link href="/trips" className="btn-secondary">
          Try Trips
        </Link>
      </div>
    </main>
  );
}
