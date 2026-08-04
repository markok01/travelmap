"use client";

import Link from "next/link";
import { useTransition } from "react";
import { addWishlistItemAction } from "@/lib/actions/wishlist";
import type { Country } from "@/lib/db/schema";
import type { MapPin, MapTripCard } from "@/lib/map/pins";

export type MapSelection =
  | { kind: "country"; code: string }
  | { kind: "trip"; tripId: string; placeId?: string }
  | null;

function yearOf(iso: string) {
  return iso.slice(0, 4);
}

function tripLabel(trip: MapTripCard) {
  return trip.title?.trim() || `${trip.countryName} trip`;
}

function matchesCountry(trip: MapTripCard, code: string) {
  return (
    trip.countryCode === code ||
    trip.countryCodes.includes(code) ||
    trip.places.some((place) => place.countryCode === code)
  );
}

export function MapDetailPanel({
  selection,
  trips,
  pins,
  countries,
  wishlistCodes,
  onClose,
  onSelectTrip,
  onFocusPlace,
}: {
  selection: MapSelection;
  trips: MapTripCard[];
  pins: MapPin[];
  countries: Country[];
  wishlistCodes: string[];
  onClose: () => void;
  onSelectTrip: (tripId: string) => void;
  onFocusPlace: (pin: MapPin) => void;
}) {
  if (!selection) return null;

  if (selection.kind === "country") {
    const countryTrips = trips.filter((trip) =>
      matchesCountry(trip, selection.code),
    );
    const sample = countryTrips[0];
    const country = countries.find((item) => item.code === selection.code);
    const flag = sample?.countryFlag ?? country?.flagEmoji ?? "";
    const name = sample?.countryName ?? country?.name ?? selection.code;
    const onWishlist = wishlistCodes.includes(selection.code);

    return (
      <aside className="map-panel--sheet fixed inset-x-0 bottom-0 z-40 flex max-h-[45vh] flex-col overflow-hidden rounded-t-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-md)] md:static md:max-h-none md:w-80 md:shrink-0 md:rounded-[var(--radius-xl)]">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Country
            </p>
            <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight">
              {flag} {name}
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {countryTrips.length} trip{countryTrips.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-control)] px-2 py-1 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            aria-label="Close panel"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {countryTrips.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No trips logged here yet.
            </p>
          ) : (
            countryTrips.map((trip) => (
              <button
                key={trip.id}
                type="button"
                onClick={() => onSelectTrip(trip.id)}
                className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)] p-3 text-left transition hover:border-[var(--accent)]"
              >
                <p className="font-medium">{tripLabel(trip)}</p>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  {yearOf(trip.startDate)}
                  {trip.places.length
                    ? ` · ${trip.places.map((p) => p.name).join(", ")}`
                    : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {trip.participants.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.displayName}
                    </span>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>

        <CountryPanelFooter code={selection.code} onWishlist={onWishlist} />
      </aside>
    );
  }

  const trip = trips.find((t) => t.id === selection.tripId);
  if (!trip) return null;

  const placePins = pins.filter((p) => p.tripId === trip.id);
  const highlightPlaceId = selection.placeId;

  return (
    <aside className="map-panel--sheet fixed inset-x-0 bottom-0 z-40 flex max-h-[45vh] flex-col overflow-hidden rounded-t-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-md)] md:static md:max-h-none md:w-80 md:shrink-0 md:rounded-[var(--radius-xl)]">
      <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Trip
          </p>
          <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight">
            {tripLabel(trip)}
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {trip.countryFlag} {trip.countryName} · {yearOf(trip.startDate)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[var(--radius-control)] px-2 py-1 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
          aria-label="Close panel"
        >
          ✕
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex flex-wrap gap-1.5">
          {trip.participants.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--muted)] px-2 py-1 text-[11px]"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              {p.displayName}
            </span>
          ))}
        </div>

        {trip.notes ? (
          <p className="text-sm text-[var(--muted-foreground)]">{trip.notes}</p>
        ) : null}

        {placePins.length > 0 ? (
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Places
            </p>
            <ul className="space-y-1">
              {placePins.map((pin) => (
                <li key={pin.id}>
                  <button
                    type="button"
                    onClick={() => onFocusPlace(pin)}
                    className={`flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2 py-2 text-left text-sm transition hover:bg-[var(--muted)] ${
                      highlightPlaceId === pin.id
                        ? "bg-[var(--accent-soft)]"
                        : ""
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: pin.color }}
                    />
                    <span className="min-w-0 flex-1 truncate">{pin.name}</span>
                    <span className="text-[11px] capitalize text-[var(--muted-foreground)]">
                      {pin.type}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : trip.places.length > 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Places without map coordinates:{" "}
            {trip.places.map((p) => p.name).join(", ")}
          </p>
        ) : null}
      </div>

      <footer className="border-t border-[var(--border)] px-4 py-3">
        <Link href={`/trips/${trip.id}`} className="btn-primary w-full text-sm">
          Open trip
        </Link>
      </footer>
    </aside>
  );
}

function CountryPanelFooter({
  code,
  onWishlist,
}: {
  code: string;
  onWishlist: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3">
      <Link
        href={`/countries/${code}`}
        className="text-sm text-[var(--accent)] hover:underline"
      >
        Open country page
      </Link>
      {!onWishlist ? (
        <button
          type="button"
          className="text-sm text-[var(--accent)] hover:underline disabled:opacity-60"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await addWishlistItemAction(code);
            })
          }
        >
          {pending ? "Adding…" : "Add to wishlist"}
        </button>
      ) : (
        <span className="text-sm text-[var(--muted-foreground)]">Wishlisted</span>
      )}
    </footer>
  );
}
