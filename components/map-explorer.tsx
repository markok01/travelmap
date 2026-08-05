"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  MapDetailPanel,
  type MapSelection,
} from "@/components/map-detail-panel";
import { EmptyState } from "@/components/empty-state";
import { useT } from "@/components/language-provider";
import { OfflineSnapshotSaver } from "@/components/offline-snapshot-saver";
import { useTheme } from "@/components/theme-provider";
import {
  WorldMapCanvas,
  type MapFocusPoint,
} from "@/components/world-map-canvas";
import type { Country } from "@/lib/db/schema";
import {
  countColoredCountries,
  getMapColorByCountry,
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
import {
  detectCoarsePointer,
  MAP_CITIES_HINT_KEY,
} from "@/lib/map/pointer";

function GlobeLoading() {
  const t = useT();
  return (
    <div className="flex h-full min-h-[52vh] items-center justify-center text-sm text-[var(--muted-foreground)]">
      {t("map.loadingGlobe")}
    </div>
  );
}

const GlobeCanvas = dynamic(
  () =>
    import("@/components/globe-canvas").then((mod) => mod.GlobeCanvas),
  {
    ssr: false,
    loading: () => <GlobeLoading />,
  },
);

type MapKind = "2d" | "3d";

const MODE_LEGEND_KEYS: Record<MapViewMode, string> = {
  anyone: "map.modeAnyone",
  individual: "map.modeIndividual",
  couple: "map.modeCouple",
  family: "map.modeFamily",
};

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
  const t = useT();
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
  const [showCitiesHint, setShowCitiesHint] = useState(false);

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
      if (
        detectCoarsePointer() &&
        !window.localStorage.getItem(MAP_CITIES_HINT_KEY)
      ) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowCitiesHint(true);
      }
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
        if (selection) {
          setSelection(null);
          setFocusCode(null);
          setFocusPoint(null);
        } else setExpanded(false);
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

  const mapSnapshot = useMemo(
    () => ({
      anyoneCount: visitMap.anyoneCount,
      highlightedCount,
      pinCount: pins.length,
      tripCount: trips.length,
      wishlistCount: wishlistCodes.length,
    }),
    [
      visitMap.anyoneCount,
      highlightedCount,
      pins.length,
      trips.length,
      wishlistCodes.length,
    ],
  );

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
    dismissCitiesHint();
  }

  function flyToPin(pin: MapPin) {
    setFocusCode(pin.countryCode);
    setFocusPoint({
      latitude: pin.latitude,
      longitude: pin.longitude,
      key: `${pin.id}-${crypto.randomUUID()}`,
    });
    setSelection({ kind: "trip", tripId: pin.tripId, placeId: pin.id });
    dismissCitiesHint();
  }

  function clearMapSelection() {
    setSelection(null);
    setFocusCode(null);
    setFocusPoint(null);
  }

  function openCountry(code: string) {
    if (selection?.kind === "country" && selection.code === code) {
      clearMapSelection();
      return;
    }
    setFocusPoint(null);
    setFocusCode(code);
    setSelection({ kind: "country", code });
    dismissCitiesHint();
  }

  function openPin(pin: MapPin) {
    setFocusCode(pin.countryCode);
    setSelection({ kind: "trip", tripId: pin.tripId, placeId: pin.id });
    dismissCitiesHint();
  }

  function dismissCitiesHint() {
    if (!showCitiesHint) return;
    setShowCitiesHint(false);
    try {
      window.localStorage.setItem(MAP_CITIES_HINT_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (visitMap.anyoneCount === 0 && wishlistCodes.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center">
        <EmptyState
          eyebrow={t("map.title")}
          title={t("map.emptyTitle")}
          description={t("map.emptyDescription")}
          actionHref="/trips/new"
          actionLabel={t("common.addFirstTrip")}
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
        placeholder={t("map.searchPlaceholder")}
        aria-label={t("map.searchPlaceholder")}
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
        onBackgroundClick={clearMapSelection}
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
        onBackgroundClick={clearMapSelection}
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
            {t("map.plains")}
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: palette.landMountains }}
            />{" "}
            {t("map.highlands")}
          </span>
        </>
      ) : (
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full border border-[var(--border)]"
            style={{ background: palette.classicUnvisited }}
          />{" "}
          {t("map.unvisited")}
        </span>
      )}
      <span className="inline-flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: isMinimal ? "#7eb8b5" : "#2F6F6A" }}
        />{" "}
        {t("map.visitedMulti")}
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: isMinimal ? "#C5B8D4" : "#B8A9C9" }}
        />{" "}
        {t("map.wishlist")}
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: isMinimal ? "#d4a574" : "#C4875A" }}
        />{" "}
        {t("map.coupleShared")}
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: isMinimal ? "#8eb0bf" : "#4A7C8C" }}
        />{" "}
        {t("common.wholeFamily")}
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center">
          <span className="absolute h-2.5 w-2.5 rounded-full bg-[var(--foreground)]/20" />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        </span>
        {t("map.placeHover")}
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
      onClose={clearMapSelection}
      onSelectTrip={(tripId) => setSelection({ kind: "trip", tripId })}
      onFocusPlace={(pin) => flyToPin(pin)}
    />
  );

  return (
    <div className="flex h-full min-h-[78vh] flex-col gap-3">
      <OfflineSnapshotSaver snapshotKey="map" payload={mapSnapshot} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            {t("map.eyebrow")}
          </p>
          <h1
            className={`mt-1 font-semibold tracking-tight ${
              isMinimal
                ? "text-2xl font-[family-name:var(--font-body)]"
                : "font-[family-name:var(--font-display)] text-3xl"
            }`}
          >
            {t("map.title")}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {highlightedCount} highlighted · {visitMap.anyoneCount}{" "}
            {t("dashboard.countries").toLowerCase()} ·{" "}
            {t(pins.length === 1 ? "map.place" : "map.places", {
              count: pins.length,
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="flex flex-wrap gap-1 rounded-[var(--radius-control)] bg-[var(--muted)] p-1">
            {(
              [
                ["anyone", "common.anyone"],
                ["individual", "common.individual"],
                ["couple", "common.couple"],
                ["family", "common.wholeFamily"],
              ] as const
            ).map(([value, labelKey]) => (
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
                {t(labelKey)}
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
              { value: "satellite", label: t("map.satellite") },
              { value: "classic", label: t("map.classic") },
            ]}
          />
          <div className="min-w-[11rem] flex-1 lg:max-w-xs">{searchBox}</div>
        </div>
      </div>

      {mode === "individual" ? (
        <label className="flex max-w-xs flex-col gap-1.5 text-sm">
          <span className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            {t("common.member")}
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
              {t("common.memberA")}
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
              {t("common.memberB")}
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
        {t(MODE_LEGEND_KEYS[mode])} ·{" "}
        {mapKind === "3d" ? t("map.globe3d") : t("map.map2d")} ·{" "}
        {mapStyle === "satellite" ? t("map.satellite") : t("map.classic")}
      </p>

      {!expanded ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
          <div className="relative h-[min(72vh,820px)] min-h-[52vh] w-full flex-1">
            <div className="absolute inset-0">{mapCanvas}</div>
            {showCitiesHint ? (
              <div className="absolute left-3 right-3 top-3 z-20 flex justify-center md:left-auto md:right-3 md:justify-end">
                <button
                  type="button"
                  onClick={dismissCitiesHint}
                  className="max-w-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]/95 px-3 py-2 text-left text-xs shadow-[var(--shadow-sm)] backdrop-blur-sm"
                >
                  <span className="block text-[var(--foreground)]">
                    {t("map.citiesHint")}
                  </span>
                  <span className="mt-0.5 block text-[var(--muted-foreground)]">
                    {t("map.citiesHintDismiss")}
                  </span>
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="absolute bottom-3 left-3 z-20 rounded-[var(--radius-control)] bg-[var(--card)]/90 px-3 py-1.5 text-xs shadow-[var(--shadow-sm)] backdrop-blur-sm"
              aria-label={t("map.expandMap")}
            >
              {t("map.expand")}
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
                  { value: "satellite", label: t("map.satellite") },
                  { value: "classic", label: t("map.classic") },
                ]}
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["anyone", "common.anyone"],
                  ["individual", "common.individual"],
                  ["couple", "common.couple"],
                  ["family", "common.family"],
                ] as const
              ).map(([value, labelKey]) => (
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
                  {t(labelKey)}
                </button>
              ))}
            </div>

            {mode === "individual" ? (
              <select
                className="field max-w-[9rem] py-1.5 text-xs"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                aria-label={t("common.member")}
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
                  aria-label={t("common.memberA")}
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
                  aria-label={t("common.memberB")}
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
              {t("map.exit")}
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
