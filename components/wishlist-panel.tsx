"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addWishlistItemAction,
  removeWishlistItemAction,
} from "@/lib/actions/wishlist";
import type { Country } from "@/lib/db/schema";

type WishlistItem = {
  id: string;
  countryCode: string;
  note: string | null;
  country: Country;
};

export function WishlistPanel({
  countries,
  items,
}: {
  countries: Country[];
  items: WishlistItem[];
}) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const itemCodes = useMemo(
    () => new Set(items.map((item) => item.countryCode)),
    [items],
  );
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return countries
      .filter(
        (country) =>
          !itemCodes.has(country.code) &&
          (!q ||
            country.name.toLowerCase().includes(q) ||
            country.code.toLowerCase().includes(q) ||
            (country.nativeName?.toLowerCase().includes(q) ?? false)),
      )
      .slice(0, 12);
  }, [countries, itemCodes, query]);

  function add(code: string) {
    startTransition(async () => {
      const result = await addWishlistItemAction(code);
      setMessage(result.error ?? (result.success ? "Added to wishlist." : null));
      if (result.success) setQuery("");
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removeWishlistItemAction(id);
      setMessage(result.error ?? null);
    });
  }

  return (
    <section className="settings-panel space-y-4">
      <div>
        <h2 className="settings-section-label text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          Wishlist
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Keep a gentle list of places your family hopes to explore next.
        </p>
      </div>

      <div className="space-y-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="field"
          placeholder="Search countries to add…"
          aria-label="Search countries to add to wishlist"
        />
        <ul className="max-h-48 overflow-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)]">
          {matches.map((country) => (
            <li key={country.code}>
              <button
                type="button"
                disabled={pending}
                onClick={() => add(country.code)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--accent-soft)] disabled:opacity-60"
              >
                <span className="text-base">{country.flagEmoji}</span>
                <span className="flex-1">{country.name}</span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  Add
                </span>
              </button>
            </li>
          ))}
          {matches.length === 0 ? (
            <li className="px-3 py-3 text-sm text-[var(--muted-foreground)]">
              {query ? "No countries match." : "All available countries are listed."}
            </li>
          ) : null}
        </ul>
      </div>

      {items.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--accent-soft)]/40 px-4 py-5 text-sm text-[var(--muted-foreground)]">
          Nothing saved yet. Add a country to begin planning.
        </p>
      ) : (
        <ul className="settings-list divide-y divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl">{item.country.flagEmoji}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.country.name}</p>
                {item.note ? (
                  <p className="truncate text-xs text-[var(--muted-foreground)]">
                    {item.note}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(item.id)}
                className="rounded-[var(--radius-control)] px-2 py-1 text-sm text-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-60"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {message ? (
        <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
      ) : null}
    </section>
  );
}
