"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CONTINENTS, type Country } from "@/lib/db/schema";
import { groupCountriesByContinent } from "@/lib/countries/utils";

export function CountriesCatalog({ countries }: { countries: Country[] }) {
  const [q, setQ] = useState("");
  const [continent, setContinent] = useState<string>("all");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return countries.filter((country) => {
      const matchesContinent =
        continent === "all" || country.continent === continent;
      if (!matchesContinent) return false;
      if (!query) return true;
      return (
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query) ||
        (country.nativeName?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [countries, continent, q]);

  const groups = groupCountriesByContinent(filtered);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="field sm:flex-1"
          placeholder="Search by name or code…"
          aria-label="Search countries"
        />
        <select
          value={continent}
          onChange={(e) => setContinent(e.target.value)}
          className="field sm:w-56"
          aria-label="Filter by continent"
        >
          <option value="all">All continents</option>
          {CONTINENTS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-[var(--muted-foreground)]">
        Showing {filtered.length} of {countries.length} countries
      </p>

      {groups.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted-foreground)]">
          No countries match your filters.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.continent} className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
                  {group.continent}
                </h2>
                <span className="text-sm text-[var(--muted-foreground)]">
                  {group.countries.length}
                </span>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {group.countries.map((country) => (
                  <li key={country.code}>
                    <Link
                      href={`/countries/${country.code}`}
                      className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 transition hover:border-[var(--accent)]"
                    >
                      <span className="text-2xl leading-none" aria-hidden>
                        {country.flagEmoji ?? "🏳️"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{country.name}</p>
                        <p className="truncate text-sm text-[var(--muted-foreground)]">
                          {country.code}
                          {country.region ? ` · ${country.region}` : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
