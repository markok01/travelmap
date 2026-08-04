import Link from "next/link";

export function EmptyState({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="flex w-full flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] px-6 py-14 text-center">
      {eyebrow ? (
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight md:text-3xl ${eyebrow ? "mt-2" : ""}`}
      >
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[var(--muted-foreground)]">
        {description}
      </p>
      <Link href={actionHref} className="btn-primary mt-6 inline-flex">
        {actionLabel}
      </Link>
    </div>
  );
}
