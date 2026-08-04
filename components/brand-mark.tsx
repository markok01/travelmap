import Link from "next/link";

export function BrandMark({
  href = "/",
  size = "md",
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl md:text-5xl",
  };

  return (
    <Link href={href} className="group inline-flex flex-col">
      <span
        className={`brand-title font-[family-name:var(--font-display)] font-semibold tracking-tight text-[var(--foreground)] ${sizes[size]}`}
      >
        Family Travel Atlas
      </span>
      {size === "lg" ? null : (
        <span className="brand-eyebrow text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Shared journeys
        </span>
      )}
    </Link>
  );
}
