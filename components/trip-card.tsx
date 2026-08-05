"use client";

import Link from "next/link";
import { useT } from "@/components/language-provider";
import { formatTripDates, tripDurationDays } from "@/lib/trips/dates";
import type { TripWithDetails } from "@/lib/trips/queries";

export function TripCard({
  trip,
  featured = false,
}: {
  trip: TripWithDetails;
  featured?: boolean;
}) {
  const t = useT();
  const days = tripDurationDays(trip.startDate, trip.endDate);
  const title = trip.title?.trim() || trip.country.name;
  const tripCountries = [
    trip.country,
    ...trip.countries
      .map((tripCountry) => tripCountry.country)
      .filter((country) => country.code !== trip.country.code),
  ];

  return (
    <Link
      href={`/trips/${trip.id}`}
      className={`block transition hover:border-[var(--accent)] hover:shadow-[var(--shadow-sm)] ${
        featured
          ? "surface p-5 md:p-6"
          : "rounded-3xl border border-[var(--border)] bg-[var(--background)] p-4"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex shrink-0 -space-x-1 text-3xl leading-none" aria-hidden>
          {tripCountries.map((country) => (
            <span key={country.code}>{country.flagEmoji ?? "🏳️"}</span>
          ))}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="truncate font-medium">{title}</h3>
            <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
              {days === 1
                ? t("common.dayCount", { count: days })
                : t("common.daysCount", { count: days })}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            {tripCountries.map((country) => country.name).join(" · ")} ·{" "}
            {formatTripDates(trip.startDate, trip.endDate)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {trip.participants.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-xs"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.member.color }}
                  aria-hidden
                />
                {p.member.displayName}
              </span>
            ))}
          </div>
          {trip.places.length > 0 ? (
            <p className="mt-2 truncate text-xs text-[var(--muted-foreground)]">
              {trip.places.map((p) => p.name).join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
