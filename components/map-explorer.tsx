"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  MapDetailPanel,
  type MapSelection,
} from "@/components/map-detail-panel";
import { EmptyState } from "@/components/empty-state";
import { useTheme } from "@/components/theme-provider";
import {
  WorldMapCanvas,
  type MapFocusPoint,
} from "@/components/world-map-canvas";
import type { Country } from "@/lib/db/schema";
import {
  countColoredCountries,
  getMapColorByCountry,
  modeLegendLabel,
  type FamilyVisitMap,
  type MapViewMode,
} from "@/lib/map/colors";
import type { MapPin, MapTripCard } from "@/lib/map/pins";
import {
  MAP_STYLE_STORAGE_KEY,
  parseMapStyle,
  TERRAIN,
  type MapVisualStyle,
} from "@/lib/map/terrain";

const GlobeCanvas = dynamic(
  () =>
    import("@/components/globe-canvas").then((mod) => mod.GlobeCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[52vh] items-center justify-center text-sm text-[var(--muted-foreground)]">
        Loading globe…
      </div>
    ),
  },
);

type MapKind = "2d" | "3d";

type SearchHit =
  | { kind: "country"; country: Country }
  | { kind: "place"; pin: MapPin };

function Segmented<T extends string>({
  value,
  onChange,
  options,
  compact = false,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  compact?: boolean;
}) {
  return (
    <div
      className={`flex border border-[var(--border)] p-1 ${
        compact
          ? "rounded-[var(--radius-control)] bg-[var(--muted)]"
          : "rounded-full bg-[var(--card)]"
      }`}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-3 py-1.5 text-sm transition-[background-color,color,box-shadow,transform] duration-200 ease-out ${
            compact
              ? "rounded-[calc(var(--radius-control)-2px)] active:scale-[0.98]"
              : "rounded-full"
          } ${
            value === opt.value
              ? compact
                ? "bg-[var(--card)] font-medium text-[var(--foreground)] shadow-[var(--shadow-sm)]"
                : "bg-[var(--accent)] text-[var(--accent-foreground)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function MapExplorer({
  visitMap,
  countries,
  pins,
  trips,
  wishlistCodes = [],
  initialCountry,
  initialTripId,
}: {
  visitMap: FamilyVisitMap;
  countries: Country[];
  pins: MapPin[];
  trips: MapTripCard[];
  wishlistCodes?: string[];
  initialCountry?: string;
  initialTripId?: string;
}) {
  const { theme, design } = useTheme();
  const isMinimal = design === "minimal";
  const flushMap = true;
  const initialTrip = initialTripId
    ? trips.find((trip) => trip.id === initialTripId)
    : undefined;
  const initialCountryCode = initialCountry?.trim().toUpperCase();
  const initialCountryExists =
    initialCountryCode &&
    countries.some((country) => country.code === initialCountryCode);
  const initialPin = initialTrip
    ? pins.find((pin) => pin.tripId === initialTrip.id)
    : undefined;
  const [mapKind, setMapKind] = useState<MapKind>("2d");
  const [mapStyle, setMapStyle] = useState<MapVisualStyle>("satellite");
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<MapViewMode>("anyone");
  const [memberId, setMemberId] = useState(visitMap.members[0]?.id ?? "");
  const [coupleA, setCoupleA] = useState(visitMap.members[0]?.id ?? "");
  const [coupleB, setCoupleB] = useState(
    visitMap.members[1]?.id ?? visitMap.members[0]?.id ?? "",
  );
  const [query, setQuery] = useState("");
  const [focusCode, setFocusCode] = useState<string | null>(
    initialPin
      ? null
      : initialTrip
        ? initialTrip.countryCode
        : initialCountryExists
          ? initialCountryCode
          : null,
  );
  const [focusPoint, setFocusPoint] = useState<MapFocusPoint | null>(
    initialPin
      ? {
          latitude: initialPin.latitude,
          longitude: initialPin.longitude,
          key: `trip-${initialPin.id}`,
        }
      : null,
  );
  const [selection, setSelection] = useState<MapSelection>(
    initialTrip
      ? { kind: "trip", tripId: initialTrip.id }
      : initialCountryExists
        ? { kind: "country", code: initialCountryCode }
        : null,
  );

  useEffect(() => {
    try {
      // Hydrate the persisted visual preference after the client mounts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMapStyle(parseMapStyle(localStorage.getItem(MAP_STYLE_STORAGE_KEY)));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MAP_STYLE_STORAGE_KEY, mapStyle);
    } catch {
      /* ignore */
    }
  }, [mapStyle]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("country");
    url.searchParams.delete("trip");

    if (selection?.kind === "country") {
      url.searchParams.set("country", selection.code);
    } else if (selection?.kind === "trip") {
      url.searchParams.set("trip", selection.tripId);
    }

    window.history.replaceState(window.history.state, "", url);
  }, [selection]);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selection) setSelection(null);
        else setExpanded(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded, selection]);

  const coupleMemberIds = useMemo(
    () => [coupleA, coupleB] as [string, string],
    [coupleA, coupleB],
  );

  const colored = useMemo(
    () =>
      getMapColorByCountry(visitMap, {
        mode,
        memberId,
        coupleMemberIds,
      }),
    [visitMap, mode, memberId, coupleMemberIds],
  );

  const highlightedCount = countColoredCountries(colored);

  const searchResults = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const countryHits: SearchHit[] = countries
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((country) => ({ kind: "country" as const, country }));

    const placeHits: SearchHit[] = pins
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.tripTitle?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 5)
      .map((pin) => ({ kind: "place" as const, pin }));

    return [...placeHits, ...countryHits].slice(0, 8);
  }, [countries, pins, query]);

  const palette = TERRAIN[theme];

  function flyToCountry(code: string) {
    setFocusPoint(null);
    setFocusCode(code);
    setSelection({ kind: "country", code });
  }

  function flyToPin(pin: MapPin) {
    setFocusCode(null);
    setFocusPoint({
      latitude: pin.latitude,
      longitude: pin.longitude,
      key: `${pin.id}-${crypto.randomUUID()}`,
    });
    setSelection({ kind: "trip", tripId: pin.tripId, placeId: pin.id });
  }

  function openCountry(code: string) {
    setSelection({ kind: "country", code });
  }

  function openPin(pin: MapPin) {
    setSelection({ kind: "trip", tripId: pin.tripId, placeId: pin.id });
  }

  if (visitMap.anyoneCount === 0 && wishlistCodes.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center">
        <EmptyState
          eyebrow="World map"
          title="No visits yet"
          description="Log a trip and the countries you visit will light up here."
          actionHref="/trips/new"
          actionLabel="Add your first trip"
        />
      </div>
    );
  }

  const searchBox = (
    <div className="relative sm:min-w-[11rem] sm:flex-1">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="field"
        placeholder="Search country or city…"
        aria-label="Search country or city on map"
      />
      {searchResults.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-md)]">
          {searchResults.map((hit) =>
            hit.kind === "country" ? (
              <li key={`c-${hit.country.code}`}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--muted)]"
                  onClick={() => {
                    flyToCountry(hit.country.code);
                    setQuery("");
                  }}
                >
                  <span>{hit.country.flagEmoji}</span>
                  <span className="flex-1">{hit.country.name}</span>
                  <span className="text-[var(--muted-foreground)]">
                    {hit.country.code}
                  </span>
                </button>
              </li>
            ) : (
              <li key={`p-${hit.pin.id}`}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--muted)]"
                  onClick={() => {
                    flyToPin(hit.pin);
                    setQuery("");
                  }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: hit.pin.color }}
                  />
                  <span className="flex-1">{hit.pin.name}</span>
                  <span className="text-[var(--muted-foreground)]">
                    {hit.pin.tripStartDate.slice(0, 4)}
                  </span>
                </button>
              </li>
            ),
          )}
        </ul>
      ) : null}
    </div>
  );

  const mapCanvas = (
    mapKind === "2d" ? (
      <WorldMapCanvas
        visitMap={visitMap}
        countries={countries}
        pins={pins}
        wishlistCodes={wishlistCodes}
        mode={mode}
        memberId={memberId}
        coupleMemberIds={coupleMemberIds}
        focusCode={focusCode}
        focusPoint={focusPoint}
        theme={theme}
        mapStyle={mapStyle}
        fillViewport={expanded || flushMap}
        design={design}
        onCountryClick={openCountry}
        onPinClick={openPin}
      />
    ) : (
      <GlobeCanvas
        visitMap={visitMap}
        countries={countries}
        pins={pins}
        wishlistCodes={wishlistCodes}
        mode={mode}
        memberId={memberId}
        coupleMemberIds={coupleMemberIds}
        focusCode={focusCode}
        focusPoint={focusPoint}
        theme={theme}
        mapStyle={mapStyle}
        fillViewport={expanded || flushMap}
        design={design}
        onRequest2D={() => setMapKind("2d")}
        onCountryClick={openCountry}
        onPinClick={openPin}
      />
    )
  );

  const legend = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-lg)] bg-[var(--muted)]/60 px-3 py-2.5 text-xs text-[var(--muted-foreground)]">
      {mapStyle === "satellite" ? (
        <>
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: palette.ocean }}
            />{" "}
            Ocean
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: palette.landPlains }}
            />{" "}
            Plains
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: palette.landMountains }}
            />{" "}
            Highlands
          </span>
        </>
      ) : (
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full border border-[var(--border)]"
            style={{ background: palette.classicUnvisited }}
          />{" "}
          Unvisited
        </span>
      )}
      <span className="inline-flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: isMinimal ? "#7eb8b5" : "#2F6F6A" }}
        />{" "}
        Visited / multi
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: isMinimal ? "#C5B8D4" : "#B8A9C9" }}
        />{" "}
        Wishlist
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: isMinimal ? "#d4a574" : "#C4875A" }}
        />{" "}
        Couple shared
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: isMinimal ? "#8eb0bf" : "#4A7C8C" }}
        />{" "}
        Whole family
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center">
          <span className="absolute h-2.5 w-2.5 rounded-full bg-[var(--foreground)]/20" />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        </span>
        Place pin
      </span>
      {visitMap.members.map((m) => (
        <span key={m.id} className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: m.color }}
          />
          {m.displayName}
        </span>
      ))}
    </div>
  );

  const panel = (
    <MapDetailPanel
      selection={selection}
      trips={trips}
      pins={pins}
      countries={countries}
      wishlistCodes={wishlistCodes}
      onClose={() => setSelection(null)}
      onSelectTrip={(tripId) => setSelection({ kind: "trip", tripId })}
      onFocusPlace={(pin) => flyToPin(pin)}
    />
  );

  return (
    <div className="flex h-full min-h-[78vh] flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            {isMinimal ? "Map" : "Atlas"}
          </p>
          <h1
            className={`mt-1 font-semibold tracking-tight ${
              isMinimal
                ? "text-2xl font-[family-name:var(--font-body)]"
                : "font-[family-name:var(--font-display)] text-3xl"
            }`}
          >
            World map
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {highlightedCount} highlighted · {visitMap.anyoneCount} countries ·{" "}
            {pins.length} place{pins.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="flex flex-wrap gap-1 rounded-[var(--radius-control)] bg-[var(--muted)] p-1">
            {(
              [
                ["anyone", "Anyone"],
                ["individual", "Individual"],
                ["couple", "Couple"],
                ["family", "Whole family"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-[calc(var(--radius-control)-2px)] px-2.5 py-1.5 text-xs transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.98] ${
                  mode === value
                    ? "bg-[var(--card)] font-medium text-[var(--foreground)] shadow-[var(--shadow-sm)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Segmented
            value={mapKind}
            onChange={setMapKind}
            compact
            options={[
              { value: "2d", label: "2D" },
              { value: "3d", label: "3D" },
            ]}
          />
          <Segmented
            value={mapStyle}
            onChange={setMapStyle}
            compact
            options={[
              { value: "satellite", label: "Satellite" },
              { value: "classic", label: "Classic" },
            ]}
          />
          <div className="min-w-[11rem] flex-1 lg:max-w-xs">{searchBox}</div>
        </div>
      </div>

      {mode === "individual" ? (
        <label className="flex max-w-xs flex-col gap-1.5 text-sm">
          <span className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Member
          </span>
          <select
            className="field"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          >
            {visitMap.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {mode === "couple" ? (
        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Member A
            </span>
            <select
              className="field"
              value={coupleA}
              onChange={(e) => setCoupleA(e.target.value)}
            >
              {visitMap.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Member B
            </span>
            <select
              className="field"
              value={coupleB}
              onChange={(e) => setCoupleB(e.target.value)}
            >
              {visitMap.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <p className="text-sm text-[var(--muted-foreground)]">
        {modeLegendLabel(mode)} · {mapKind === "3d" ? "3D globe" : "2D map"} ·{" "}
        {mapStyle === "satellite" ? "Satellite" : "Classic"}
      </p>

      {!expanded ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
          <div className="relative h-[min(72vh,820px)] min-h-[52vh] w-full flex-1">
            <div className="absolute inset-0">{mapCanvas}</div>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="absolute bottom-3 left-3 z-20 rounded-[var(--radius-control)] bg-[var(--card)]/90 px-3 py-1.5 text-xs shadow-[var(--shadow-sm)] backdrop-blur-sm"
              aria-label="Expand map"
            >
              Expand
            </button>
          </div>
          {selection ? panel : null}
        </div>
      ) : (
        <div className="min-h-[52vh] flex-1 rounded-[var(--radius-lg)] bg-[var(--muted)]/40" />
      )}

      {!expanded ? legend : null}

      {expanded ? (
        <div className="fixed inset-0 z-50 flex h-dvh w-screen flex-col bg-[var(--background)]">
          <header className="z-30 flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--card)] px-3 py-2">
            <div className="w-[9.5rem] shrink-0">
              <Segmented
                value={mapKind}
                onChange={setMapKind}
                compact
                options={[
                  { value: "2d", label: "2D" },
                  { value: "3d", label: "3D" },
                ]}
              />
            </div>
            <div className="w-[12.5rem] shrink-0">
              <Segmented
                value={mapStyle}
                onChange={setMapStyle}
                compact
                options={[
                  { value: "satellite", label: "Satellite" },
                  { value: "classic", label: "Classic" },
                ]}
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["anyone", "Anyone"],
                  ["individual", "Individual"],
                  ["couple", "Couple"],
                  ["family", "Family"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`rounded-full px-2.5 py-1 text-xs transition ${
                    mode === value
                      ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                      : "border border-[var(--border)] text-[var(--muted-foreground)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "individual" ? (
              <select
                className="field max-w-[9rem] py-1.5 text-xs"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                aria-label="Member"
              >
                {visitMap.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            ) : null}

            {mode === "couple" ? (
              <>
                <select
                  className="field max-w-[8rem] py-1.5 text-xs"
                  value={coupleA}
                  onChange={(e) => setCoupleA(e.target.value)}
                  aria-label="Member A"
                >
                  {visitMap.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
                <select
                  className="field max-w-[8rem] py-1.5 text-xs"
                  value={coupleB}
                  onChange={(e) => setCoupleB(e.target.value)}
                  aria-label="Member B"
                >
                  {visitMap.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            <div className="relative min-w-[10rem] flex-1 sm:max-w-xs">
              {searchBox}
            </div>

            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="ml-auto shrink-0 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
            >
              Exit · Esc
            </button>
          </header>

          <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
            <div className="relative min-h-0 flex-1">
              <div className="absolute inset-0">{mapCanvas}</div>
            </div>
            {selection ? (
              <div className="z-20 md:absolute md:right-3 md:top-3 md:bottom-3">
                {panel}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
