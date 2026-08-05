"use client";

import Link from "next/link";
import { DeleteTripButton } from "@/components/delete-trip-button";
import { useT } from "@/components/language-provider";
import { useOnline } from "@/components/offline-provider";
import { formatTripDates, tripDurationDays } from "@/lib/trips/dates";
import type { TripWithDetails } from "@/lib/trips/queries";

export function TripDetailView({ trip }: { trip: TripWithDetails }) {
  const t = useT();
  const online = useOnline();
  const days = tripDurationDays(trip.startDate, trip.endDate);
  const title = trip.title?.trim() || trip.country.name;
  const tripCountries = [
    trip.country,
    ...trip.countries
      .map((tripCountry) => tripCountry.country)
      .filter((country) => country.code !== trip.country.code),
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/trips"
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            {t("trips.allTrips")}
          </Link>
          <div className="mt-3 flex items-start gap-3">
            <span className="flex -space-x-1 text-4xl leading-none" aria-hidden>
              {tripCountries.map((country) => (
                <span key={country.code}>{country.flagEmoji ?? "🏳️"}</span>
              ))}
            </span>
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
                {title}
              </h1>
              <p className="mt-1 text-[var(--muted-foreground)]">
                {tripCountries.map((country, index) => (
                  <span key={country.code}>
                    {index > 0 ? " · " : null}
                    <Link
                      href={`/countries/${country.code}`}
                      className="hover:text-[var(--accent)]"
                    >
                      {country.name}
                    </Link>
                  </span>
                ))}
                {" · "}
                {formatTripDates(trip.startDate, trip.endDate)} ·{" "}
                {days === 1
                  ? t("common.dayCount", { count: days })
                  : t("common.daysCount", { count: days })}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {online ? (
            <Link href={`/trips/${trip.id}/edit`} className="btn-secondary">
              {t("trips.edit")}
            </Link>
          ) : (
            <span className="btn-secondary pointer-events-none opacity-60">
              {t("trips.edit")}
            </span>
          )}
          <DeleteTripButton tripId={trip.id} />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {t("trips.whoTitle")}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {trip.participants.map((p) => (
            <li
              key={p.id}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: p.member.color }}
              />
              {p.member.displayName}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {t("trips.places")}
        </h2>
        {trip.places.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("trips.noPlaces")}
          </p>
        ) : (
          <ul className="space-y-2">
            {trip.places.map((place) => {
              const hasPin =
                place.latitude != null &&
                place.longitude != null &&
                Number.isFinite(place.latitude) &&
                Number.isFinite(place.longitude);
              return (
                <li
                  key={place.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{place.name}</p>
                      <p className="text-sm capitalize text-[var(--muted-foreground)]">
                        {place.type}
                        {place.countryCode ? ` · ${place.countryCode}` : ""}
                        {place.notes ? ` · ${place.notes}` : ""}
                      </p>
                    </div>
                    {hasPin ? (
                      <span className="shrink-0 text-[11px] text-[var(--accent)]">
                        {t("trips.mapPin")}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">
                        {t("trips.noMapPin")}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {trip.notes ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            {t("trips.notes")}
          </h2>
          <p className="whitespace-pre-wrap rounded-3xl border border-[var(--border)] bg-[var(--background)] p-4 text-[var(--foreground)]">
            {trip.notes}
          </p>
        </section>
      ) : null}

      <p className="text-xs text-[var(--muted-foreground)]">
        {t("trips.privacyLabel", { value: trip.privacy })}
      </p>
    </div>
  );
}
