"use client";

import { useRouter } from "next/navigation";
import type { FamilyMember } from "@/lib/db/schema";

export function TripsFilters({
  members,
  years,
  current,
}: {
  members: FamilyMember[];
  years: number[];
  current: {
    countryCode?: string;
    memberId?: string;
    year?: string;
  };
}) {
  const router = useRouter();

  function update(key: string, value: string) {
    const params = new URLSearchParams();
    const next = {
      countryCode: current.countryCode ?? "",
      memberId: current.memberId ?? "",
      year: current.year ?? "",
      [key]: value,
    };
    if (next.countryCode) params.set("countryCode", next.countryCode.toUpperCase());
    if (next.memberId) params.set("memberId", next.memberId);
    if (next.year) params.set("year", next.year);
    const qs = params.toString();
    router.push(qs ? `/trips?${qs}` : "/trips");
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          Country code
        </span>
        <input
          className="field"
          placeholder="e.g. RS"
          defaultValue={current.countryCode ?? ""}
          maxLength={2}
          onBlur={(e) => update("countryCode", e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              update("countryCode", (e.target as HTMLInputElement).value.trim());
            }
          }}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          Member
        </span>
        <select
          className="field"
          value={current.memberId ?? ""}
          onChange={(e) => update("memberId", e.target.value)}
        >
          <option value="">All members</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          Year
        </span>
        <select
          className="field"
          value={current.year ?? ""}
          onChange={(e) => update("year", e.target.value)}
        >
          <option value="">All years</option>
          {years.map((year) => (
            <option key={year} value={String(year)}>
              {year}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
