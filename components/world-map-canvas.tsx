"use client";

import {
  geoCentroid,
  geoEqualEarth,
  geoPath,
  type GeoPermissibleObjects,
} from "d3-geo";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Country } from "@/lib/db/schema";
import { resolveFeatureCountryCode } from "@/lib/map/iso";
import {
  getMapColorByCountry,
  type FamilyVisitMap,
  type MapViewMode,
} from "@/lib/map/colors";
import {
  landColorFromLat,
  mapPinPalette,
  TERRAIN,
  visitOverlayColor,
  type MapTheme,
  type MapVisualStyle,
} from "@/lib/map/terrain";
import type { DesignTheme } from "@/components/theme-provider";
import type { MapPin } from "@/lib/map/pins";

type CountryFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  { name?: string; code: string | null; lat: number }
> & { id?: string | number };

type TopologyCountries = Topology<{
  countries: GeometryCollection;
}>;

type TooltipState =
  | {
      kind: "country";
      x: number;
      y: number;
      code: string | null;
      name: string;
    }
  | {
      kind: "pin";
      x: number;
      y: number;
      pin: MapPin;
    }
  | null;

export type MapFocusPoint = {
  latitude: number;
  longitude: number;
  key: string;
};

export function WorldMapCanvas({
  visitMap,
  countries,
  pins = [],
  wishlistCodes = [],
  mode,
  memberId,
  coupleMemberIds,
  focusCode,
  focusPoint = null,
  theme,
  mapStyle,
  hideReset = false,
  fillViewport = false,
  design = "atlas",
  onCountryClick,
  onPinClick,
  onBackgroundClick,
}: {
  visitMap: FamilyVisitMap;
  countries: Country[];
  pins?: MapPin[];
  wishlistCodes?: string[];
  mode: MapViewMode;
  memberId: string;
  coupleMemberIds: [string, string];
  focusCode: string | null;
  focusPoint?: MapFocusPoint | null;
  theme: MapTheme;
  mapStyle: MapVisualStyle;
  hideReset?: boolean;
  fillViewport?: boolean;
  design?: DesignTheme;
  onCountryClick?: (code: string) => void;
  onPinClick?: (pin: MapPin) => void;
  onBackgroundClick?: () => void;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [geographies, setGeographies] = useState<CountryFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewport, setViewport] = useState({ width: 960, height: 480 });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [canHover, setCanHover] = useState(true);
  const hoverClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointersRef = useRef(
    new Map<number, { x: number; y: number }>(),
  );
  const pinchRef = useRef<{
    distance: number;
    k: number;
    midX: number;
    midY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);
  const gestureMovedRef = useRef(false);

  const width = viewport.width;
  const height = viewport.height;

  const palette = TERRAIN[theme];
  const isSatellite = mapStyle === "satellite";

  function revealCountry(code: string | null) {
    if (hoverClearRef.current) {
      clearTimeout(hoverClearRef.current);
      hoverClearRef.current = null;
    }
    if (code) {
      setHoveredCode(code);
      return;
    }
    hoverClearRef.current = setTimeout(() => {
      setHoveredCode(null);
      hoverClearRef.current = null;
    }, 140);
  }

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setCanHover(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverClearRef.current) clearTimeout(hoverClearRef.current);
    };
  }, []);

  const countryMeta = useMemo(() => {
    return new Map(countries.map((c) => [c.code, c]));
  }, [countries]);
  const wishlist = useMemo(() => new Set(wishlistCodes), [wishlistCodes]);

  const fills = useMemo(() => {
    const raw = getMapColorByCountry(visitMap, {
      mode,
      memberId,
      coupleMemberIds,
    });
    return Object.fromEntries(
      Object.entries(raw).map(([code, color]) => [
        code,
        visitOverlayColor(color, theme, mapStyle, design),
      ]),
    );
  }, [visitMap, mode, memberId, coupleMemberIds, theme, mapStyle, design]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const nextW = Math.max(320, Math.floor(rect.width) || 960);
      // Prefer real height; if collapsed, fall back to a 2:1 map frame
      const measuredH = Math.floor(rect.height);
      const nextH = Math.max(
        240,
        measuredH > 0 ? measuredH : Math.round(nextW * 0.5),
      );
      setViewport((prev) => {
        if (prev.width === nextW && prev.height === nextH) return prev;
        return { width: nextW, height: nextH };
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fillViewport]);

  const projection = useMemo(
    () => geoEqualEarth().fitSize([width, height], { type: "Sphere" }),
    [width, height],
  );
  const pathGen = useMemo(() => geoPath(projection), [projection]);

  // Load topology once — theme/style only recolors
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const topology = (await import("world-atlas/countries-110m.json"))
        .default as unknown as TopologyCountries;
      const collection = feature(
        topology,
        topology.objects.countries,
      ) as GeoJSON.FeatureCollection;
      if (cancelled) return;
      const next = collection.features.map((f) => {
        const props = f.properties as { name?: string } | null;
        const code = resolveFeatureCountryCode(
          f.id as string | number | undefined,
          props,
        );
        const [, lat] = geoCentroid(f);
        return {
          ...f,
          properties: {
            name: props?.name ?? "Unknown",
            code,
            lat: lat || 0,
          },
        } as CountryFeature;
      });
      setGeographies(next);
      setLoading(false);
    }
    load().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const focusOnCode = useCallback(
    (code: string) => {
      const geo = geographies.find((g) => g.properties.code === code);
      if (!geo) return;
      const [lng, lat] = geoCentroid(geo);
      const projected = projection([lng, lat]);
      if (!projected) return;
      const k = 3.2;
      setTransform({
        k,
        x: width / 2 - projected[0] * k,
        y: height / 2 - projected[1] * k,
      });
    },
    [geographies, projection, width, height],
  );

  const focusOnPoint = useCallback(
    (latitude: number, longitude: number) => {
      const projected = projection([longitude, latitude]);
      if (!projected) return;
      const k = 4.5;
      setTransform({
        k,
        x: width / 2 - projected[0] * k,
        y: height / 2 - projected[1] * k,
      });
    },
    [projection, width, height],
  );

  useEffect(() => {
    if (focusCode && geographies.length > 0) focusOnCode(focusCode);
  }, [focusCode, focusOnCode, geographies.length]);

  useEffect(() => {
    if (focusPoint) {
      focusOnPoint(focusPoint.latitude, focusPoint.longitude);
    }
  }, [focusPoint, focusOnPoint]);

  const projectedPins = useMemo(() => {
    return pins
      .map((pin) => {
        const xy = projection([pin.longitude, pin.latitude]);
        if (!xy) return null;
        return { pin, x: xy[0], y: xy[1] };
      })
      .filter(Boolean) as { pin: MapPin; x: number; y: number }[];
  }, [pins, projection]);

  const revealCode = hoveredCode || focusCode;
  const visiblePins = useMemo(() => {
    if (!revealCode) return [];
    return projectedPins.filter((p) => p.pin.countryCode === revealCode);
  }, [projectedPins, revealCode]);

  function resetView() {
    setTransform({ x: 0, y: 0, k: 1 });
  }

  function onWheel(e: ReactWheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const bounds = svg.getBoundingClientRect();
    const mx = ((e.clientX - bounds.left) / bounds.width) * width;
    const my = ((e.clientY - bounds.top) / bounds.height) * height;
    const factor = e.deltaY < 0 ? 1.12 : 0.9;
    setTransform((prev) => {
      const nextK = Math.min(8, Math.max(0.8, prev.k * factor));
      const scale = nextK / prev.k;
      return {
        k: nextK,
        x: mx - (mx - prev.x) * scale,
        y: my - (my - prev.y) * scale,
      };
    });
  }

  function pointerDistance(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gestureMovedRef.current = false;

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      const svg = svgRef.current;
      const bounds = svg?.getBoundingClientRect();
      const midX = bounds
        ? (((a.x + b.x) / 2 - bounds.left) / bounds.width) * width
        : width / 2;
      const midY = bounds
        ? (((a.y + b.y) / 2 - bounds.top) / bounds.height) * height
        : height / 2;
      pinchRef.current = {
        distance: pointerDistance(a, b) || 1,
        k: transform.k,
        midX,
        midY,
        origX: transform.x,
        origY: transform.y,
      };
      dragRef.current = null;
      gestureMovedRef.current = true;
      return;
    }

    pinchRef.current = null;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: transform.x,
      origY: transform.y,
      moved: false,
    };
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pinchRef.current && pointersRef.current.size >= 2) {
      gestureMovedRef.current = true;
      const [a, b] = [...pointersRef.current.values()];
      const distance = pointerDistance(a, b) || 1;
      const scale = distance / pinchRef.current.distance;
      const nextK = Math.min(8, Math.max(0.8, pinchRef.current.k * scale));
      const ratio = nextK / pinchRef.current.k;
      const { midX, midY, origX, origY } = pinchRef.current;
      setTransform({
        k: nextK,
        x: midX - (midX - origX) * ratio,
        y: midY - (midY - origY) * ratio,
      });
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) {
      drag.moved = true;
      gestureMovedRef.current = true;
    }
    const svg = svgRef.current;
    if (!svg) return;
    const bounds = svg.getBoundingClientRect();
    const scaleX = width / bounds.width;
    const scaleY = height / bounds.height;
    setTransform((prev) => ({
      ...prev,
      x: drag.origX + dx * scaleX,
      y: drag.origY + dy * scaleY,
    }));
  }

  function onPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId) {
      dragRef.current = null;
    }
  }

  const spherePath = pathGen({ type: "Sphere" } as GeoPermissibleObjects);
  const isMinimal = design === "minimal";
  const pageBg = "var(--background)";
  // Both designs: stage floats on page bg (no map "window")
  const canvasBg = pageBg;
  const oceanFill = isMinimal
    ? isSatellite
      ? theme === "dark"
        ? "#1a3a52"
        : "#8eb8d4"
      : theme === "dark"
        ? "#2c2c2e"
        : "#d8d8de"
    : undefined;
  const border = isSatellite ? palette.border : palette.classicStroke;
  const borderFocus = palette.borderFocus;
  const gradId = `ocean-glow-${theme}-${mapStyle}-${design}`;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ background: canvasBg }}
    >
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-[var(--muted-foreground)]">
          Loading map…
        </div>
      ) : null}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        className="block h-full w-full touch-none cursor-grab active:cursor-grabbing"
        role="img"
        aria-label="World map of family visits"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          setTooltip(null);
        }}
      >
        <defs>
          {isSatellite ? (
            <radialGradient id={gradId} cx="48%" cy="42%" r="68%">
              <stop
                offset="0%"
                stopColor={oceanFill ?? palette.oceanShallow}
              />
              <stop
                offset="35%"
                stopColor={oceanFill ?? palette.ocean}
              />
              <stop
                offset="72%"
                stopColor={isMinimal ? (oceanFill as string) : palette.oceanMid}
              />
              <stop
                offset="100%"
                stopColor={
                  isMinimal
                    ? theme === "dark"
                      ? "#0f2433"
                      : "#6a9cbc"
                    : palette.oceanDeep
                }
              />
            </radialGradient>
          ) : (
            <radialGradient id={gradId} cx="50%" cy="45%" r="70%">
              <stop
                offset="0%"
                stopColor={isMinimal ? pageBg : palette.classicCanvasBg}
              />
              <stop
                offset="100%"
                stopColor={
                  isMinimal
                    ? theme === "dark"
                      ? "#3a3a3c"
                      : "#e5e5ea"
                    : palette.classicUnvisited
                }
              />
            </radialGradient>
          )}
          {isSatellite && !isMinimal ? (
            <filter id="land-shade" x="-5%" y="-5%" width="110%" height="110%">
              <feDropShadow
                dx="0"
                dy="0.55"
                stdDeviation="0.7"
                floodColor="#000000"
                floodOpacity="0.16"
              />
            </filter>
          ) : null}
        </defs>

        <rect
          width={width}
          height={height}
          fill={canvasBg}
          onClick={() => {
            if (gestureMovedRef.current) return;
            onBackgroundClick?.();
          }}
        />
        <g
          transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}
        >
          {spherePath ? (
            <path
              d={spherePath}
              fill={`url(#${gradId})`}
              stroke="none"
              onClick={() => {
                if (gestureMovedRef.current) return;
                onBackgroundClick?.();
              }}
            />
          ) : null}

          {geographies.map((geo, index) => {
            const code = geo.properties.code;
            const d = pathGen(geo as GeoPermissibleObjects);
            if (!d) return null;
            const visited = Boolean(code && fills[code]);
            const landFill = isSatellite
              ? landColorFromLat(geo.properties.lat, theme)
              : isMinimal
                ? theme === "dark"
                  ? "#3a3a3c"
                  : "#e8e8ed"
                : palette.classicUnvisited;
            const wishlisted = Boolean(code && wishlist.has(code));
            const wishlistFill = isMinimal ? "#C5B8D4" : "#B8A9C9";
            const fill = visited
              ? fills[code as string]
              : wishlisted
                ? wishlistFill
                : landFill;
            const highlighted = Boolean(code && focusCode === code);
            const isHovered = Boolean(code && hoveredCode === code && visited);
            const meta = code ? countryMeta.get(code) : undefined;
            const name = meta?.name ?? geo.properties.name ?? "Unknown";
            const stroke = highlighted || isHovered
              ? borderFocus
              : (visited || wishlisted) && isSatellite
                ? isMinimal
                  ? theme === "dark"
                    ? "rgba(255,255,255,0.45)"
                    : "rgba(255,255,255,0.7)"
                  : theme === "dark"
                    ? "rgba(255,240,180,0.85)"
                    : "rgba(255,255,255,0.95)"
                : isMinimal
                  ? theme === "dark"
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.08)"
                  : border;
            const strokeW = highlighted || isHovered
              ? (isHovered ? 1.7 : 1.35) / transform.k
              : visited
                ? (isSatellite ? 0.75 : 0.55) / transform.k
                : wishlisted && isSatellite
                  ? 0.55 / transform.k
                : (isMinimal ? 0.2 : isSatellite ? 0.22 : 0.35) / transform.k;

            return (
              <path
                key={`${code ?? "x"}-${index}`}
                d={d}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeW}
                filter={
                  isSatellite && visited && !isMinimal
                    ? "url(#land-shade)"
                    : undefined
                }
                className={`map-country-path transition-[fill,opacity,stroke-width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  visited ? "map-country-visited" : ""
                } ${isHovered ? "map-country-hovered" : ""}`}
                style={{
                  cursor: code ? "pointer" : "default",
                  opacity: visited ? (isHovered ? 1 : 0.96) : 1,
                }}
                onMouseEnter={(ev) => {
                  if (!canHover) return;
                  const svg = svgRef.current;
                  if (!svg) return;
                  const bounds = svg.getBoundingClientRect();
                  setTooltip({
                    kind: "country",
                    x: ev.clientX - bounds.left,
                    y: ev.clientY - bounds.top,
                    code,
                    name,
                  });
                  if (visited && code) revealCountry(code);
                }}
                onMouseMove={(ev) => {
                  if (!canHover) return;
                  const svg = svgRef.current;
                  if (!svg) return;
                  const bounds = svg.getBoundingClientRect();
                  setTooltip({
                    kind: "country",
                    x: ev.clientX - bounds.left,
                    y: ev.clientY - bounds.top,
                    code,
                    name,
                  });
                }}
                onMouseLeave={() => {
                  if (!canHover) return;
                  setTooltip(null);
                  if (visited) revealCountry(null);
                }}
                onClick={() => {
                  if (gestureMovedRef.current) return;
                  if (!code) return;
                  if (onCountryClick) onCountryClick(code);
                  else router.push(`/countries/${code}`);
                }}
              />
            );
          })}

          {visiblePins.map(({ pin, x, y }, pinIndex) => {
            const palette = mapPinPalette(pin.color, theme, design);
            // Petite precision dots — stay small even when zoomed out
            const zoom = Math.max(transform.k, 1);
            const coreR = Math.max(0.55, 0.78 / Math.sqrt(zoom));
            const ringR = coreR + 0.45 / zoom;
            const haloR = ringR + 0.55 / zoom;
            const pulseR = haloR;
            const hitR = Math.max(haloR, 14 / zoom);
            return (
              <g
                key={pin.id}
                transform={`translate(${x}, ${y})`}
                style={{ cursor: "pointer" }}
                onMouseEnter={(ev) => {
                  if (!canHover) return;
                  revealCountry(pin.countryCode);
                  const svg = svgRef.current;
                  if (!svg) return;
                  const bounds = svg.getBoundingClientRect();
                  setTooltip({
                    kind: "pin",
                    x: ev.clientX - bounds.left,
                    y: ev.clientY - bounds.top,
                    pin,
                  });
                }}
                onMouseMove={(ev) => {
                  if (!canHover) return;
                  const svg = svgRef.current;
                  if (!svg) return;
                  const bounds = svg.getBoundingClientRect();
                  setTooltip({
                    kind: "pin",
                    x: ev.clientX - bounds.left,
                    y: ev.clientY - bounds.top,
                    pin,
                  });
                }}
                onMouseLeave={() => {
                  if (!canHover) return;
                  setTooltip(null);
                  revealCountry(null);
                }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  if (gestureMovedRef.current) return;
                  onPinClick?.(pin);
                }}
              >
                <circle r={hitR} fill="transparent" />
                <g
                  className="map-city-pin"
                  style={
                    {
                      "--pin-delay": `${Math.min(pinIndex, 10) * 55}ms`,
                    } as CSSProperties
                  }
                >
                  <circle
                    className="map-city-pin-pulse"
                    r={pulseR}
                    fill="none"
                    stroke={palette.pulse}
                    strokeWidth={1.1 / zoom}
                  />
                  <circle
                    className="map-city-pin-halo"
                    r={haloR}
                    fill={palette.halo}
                  />
                  <circle
                    className="map-city-pin-ring"
                    r={ringR}
                    fill={palette.accent}
                  />
                  <circle
                    className="map-city-pin-dot"
                    r={coreR}
                    fill={palette.core}
                  />
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {tooltip && canHover ? (
        <div
          className="map-tooltip pointer-events-none absolute z-20 max-w-[min(16rem,calc(100%-1rem))] rounded-[var(--radius-lg)] border border-transparent bg-[var(--card)]/95 px-3 py-2 text-sm shadow-[var(--shadow-md)] backdrop-blur-sm"
          style={{
            left: Math.min(
              Math.max(8, tooltip.x + 12),
              Math.max(8, (containerRef.current?.clientWidth ?? 300) - 168),
            ),
            top: Math.min(
              Math.max(8, tooltip.y - 12),
              Math.max(8, (containerRef.current?.clientHeight ?? 200) - 72),
            ),
          }}
        >
          {tooltip.kind === "pin" ? (
            <>
              <p className="font-medium">{tooltip.pin.name}</p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {tooltip.pin.tripTitle?.trim() || "Trip"} ·{" "}
                {tooltip.pin.tripStartDate.slice(0, 4)}
                {tooltip.pin.visitCount > 1
                  ? ` · ${tooltip.pin.visitCount} visits`
                  : ""}
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">
                {tooltip.code
                  ? (countryMeta.get(tooltip.code)?.flagEmoji ?? "")
                  : ""}{" "}
                {tooltip.name}
                {tooltip.code ? (
                  <span className="text-[var(--muted-foreground)]">
                    {" "}
                    · {tooltip.code}
                  </span>
                ) : null}
              </p>
              {tooltip.code &&
              visitMap.visitorsByCountry[tooltip.code]?.length ? (
                <ul className="mt-1.5 space-y-1">
                  {visitMap.visitorsByCountry[tooltip.code].map((v) => (
                    <li key={v.id} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: v.color }}
                      />
                      {v.displayName}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Not visited yet
                </p>
              )}
            </>
          )}
        </div>
      ) : null}

      {!hideReset ? (
        <button
          type="button"
          onClick={resetView}
          className="absolute bottom-3 right-3 rounded-[var(--radius-control)] bg-[var(--card)]/90 px-3 py-1.5 text-xs shadow-[var(--shadow-sm)] backdrop-blur-sm"
        >
          Reset view
        </button>
      ) : null}
    </div>
  );
}
