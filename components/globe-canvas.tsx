"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { MeshPhongMaterial } from "three";
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
  EARTH_DAY_TEXTURE,
  EARTH_TOPOLOGY_TEXTURE,
  mapPinPalette,
  TERRAIN,
  visitOverlayColor,
  withAlpha,
  type MapTheme,
  type MapVisualStyle,
} from "@/lib/map/terrain";
import type { DesignTheme } from "@/components/theme-provider";
import type { MapPin } from "@/lib/map/pins";
import type { MapFocusPoint } from "@/components/world-map-canvas";

type CountryFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  { name: string; code: string | null }
>;

type TopologyCountries = Topology<{
  countries: GeometryCollection;
}>;

type GlobePin = MapPin & { lat: number; lng: number };

function detectWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function GlobeCanvas({
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
  onRequest2D,
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
  onRequest2D: () => void;
  hideReset?: boolean;
  fillViewport?: boolean;
  design?: DesignTheme;
  onCountryClick?: (code: string) => void;
  onPinClick?: (pin: MapPin) => void;
  onBackgroundClick?: () => void;
}) {
  const router = useRouter();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 520 });
  const [polygons, setPolygons] = useState<CountryFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [webgl, setWebgl] = useState(true);
  const [textureOk, setTextureOk] = useState(true);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [canHover, setCanHover] = useState(true);
  const hoverClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const palette = TERRAIN[theme];
  const isSatellite = mapStyle === "satellite";
  const isMinimal = design === "minimal";
  const useTexture = isSatellite && textureOk;

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
    }, 160);
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

  const countryMeta = useMemo(
    () => new Map(countries.map((c) => [c.code, c])),
    [countries],
  );
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

  const globeMaterial = useMemo(() => {
    if (isSatellite) {
      return new MeshPhongMaterial({
        color: palette.oceanDeep,
        emissive: palette.oceanMid,
        emissiveIntensity: 0.22,
        shininess: 22,
      });
    }
    return new MeshPhongMaterial({
      color: palette.classicGlobe,
      emissive: palette.classicUnvisited,
      emissiveIntensity: 0.08,
      shininess: 4,
    });
  }, [
    isSatellite,
    palette.oceanDeep,
    palette.oceanMid,
    palette.classicGlobe,
    palette.classicUnvisited,
  ]);

  useEffect(() => {
    return () => {
      globeMaterial.dispose();
    };
  }, [globeMaterial]);

  useEffect(() => {
    setWebgl(detectWebGL());
  }, []);

  useEffect(() => {
    if (!isSatellite) return;
    let cancelled = false;
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      if (!cancelled) setTextureOk(true);
    };
    img.onerror = () => {
      if (!cancelled) setTextureOk(false);
    };
    img.src = EARTH_DAY_TEXTURE;
    return () => {
      cancelled = true;
    };
  }, [isSatellite]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(280, Math.floor(rect.width)),
        height: Math.max(240, Math.floor(rect.height)),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fillViewport]);

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
        return {
          ...f,
          properties: {
            name: props?.name ?? "Unknown",
            code,
          },
        } as CountryFeature;
      });
      setPolygons(next);
      setLoading(false);
    }
    load().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!focusCode || !globeRef.current) return;
    const country = countryMeta.get(focusCode);
    if (
      country?.latitude == null ||
      country?.longitude == null ||
      Number.isNaN(country.latitude) ||
      Number.isNaN(country.longitude)
    ) {
      return;
    }
    globeRef.current.pointOfView(
      {
        lat: country.latitude,
        lng: country.longitude,
        altitude: 1.35,
      },
      1100,
    );
  }, [focusCode, countryMeta, polygons.length]);

  useEffect(() => {
    if (!focusPoint || !globeRef.current) return;
    globeRef.current.pointOfView(
      {
        lat: focusPoint.latitude,
        lng: focusPoint.longitude,
        altitude: 1.1,
      },
      900,
    );
  }, [focusPoint]);

  const revealCode = hoveredCode || focusCode;

  const onPinClickRef = useRef(onPinClick);
  onPinClickRef.current = onPinClick;
  const revealCountryRef = useRef(revealCountry);
  revealCountryRef.current = revealCountry;
  const canHoverRef = useRef(canHover);
  canHoverRef.current = canHover;
  const onBackgroundClickRef = useRef(onBackgroundClick);
  onBackgroundClickRef.current = onBackgroundClick;
  const suppressBgRef = useRef(false);

  const globePins = useMemo<GlobePin[]>(() => {
    if (!revealCode) return [];
    return pins
      .filter((pin) => pin.countryCode === revealCode)
      .map((pin) => ({
        ...pin,
        lat: pin.latitude,
        lng: pin.longitude,
      }));
  }, [pins, revealCode]);

  function makeGlobePinElement(d: object) {
    const pin = d as GlobePin;
    const palette = mapPinPalette(pin.color, theme, design);
    const el = document.createElement("button");
    el.type = "button";
    el.className = "globe-city-pin";
    el.style.setProperty("--pin-accent", palette.accent);
    el.style.setProperty("--pin-core", palette.core);
    el.style.setProperty("--pin-halo", palette.halo);
    el.style.setProperty("--pin-pulse", palette.pulse);
    el.setAttribute("aria-label", pin.name);
    el.title = [
      pin.name,
      pin.tripTitle?.trim() || "Trip",
      pin.tripStartDate.slice(0, 4),
      pin.visitCount > 1 ? `${pin.visitCount} visits` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    el.innerHTML = `
      <span class="globe-city-pin-pulse" aria-hidden="true"></span>
      <span class="globe-city-pin-halo" aria-hidden="true"></span>
      <span class="globe-city-pin-ring" aria-hidden="true"></span>
      <span class="globe-city-pin-dot" aria-hidden="true"></span>
    `;
    el.addEventListener("pointerenter", () => {
      if (!canHoverRef.current) return;
      revealCountryRef.current(pin.countryCode);
    });
    el.addEventListener("pointerleave", () => {
      if (!canHoverRef.current) return;
      revealCountryRef.current(null);
    });
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      suppressBackgroundClick();
      onPinClickRef.current?.(pin);
    });
    return el;
  }

  function suppressBackgroundClick() {
    suppressBgRef.current = true;
    window.setTimeout(() => {
      suppressBgRef.current = false;
    }, 0);
  }

  function resetCamera() {
    globeRef.current?.pointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 900);
  }

  if (!webgl) {
    return (
      <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-4 border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_40%,transparent)] px-6 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          WebGL unavailable
        </p>
        <p className="max-w-md text-sm text-[var(--muted-foreground)]">
          This browser cannot render the 3D globe. Switch back to the 2D map.
        </p>
        <button type="button" className="btn-primary" onClick={onRequest2D}>
          Switch to 2D
        </button>
      </div>
    );
  }

  const frameBg = "transparent";
  const atmosphere = isMinimal
    ? theme === "dark"
      ? "#4a5560"
      : "#c5d4e0"
    : isSatellite
      ? palette.atmosphere
      : palette.classicAtmosphere;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ background: frameBg }}
    >
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-[var(--muted-foreground)]">
          Loading globe…
        </div>
      ) : null}

      <Globe
        ref={globeRef as MutableRefObject<GlobeMethods | undefined>}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        showGlobe
        showAtmosphere
        atmosphereColor={atmosphere}
        atmosphereAltitude={isMinimal ? 0.14 : isSatellite ? 0.18 : 0.12}
        globeImageUrl={useTexture ? EARTH_DAY_TEXTURE : undefined}
        bumpImageUrl={useTexture ? EARTH_TOPOLOGY_TEXTURE : undefined}
        globeMaterial={useTexture ? undefined : globeMaterial}
        polygonsData={polygons}
        polygonGeoJsonGeometry="geometry"
        polygonCapColor={(d) => {
          const feat = d as CountryFeature;
          const code = feat.properties.code;
          if (code && fills[code]) {
            if (isSatellite) {
              // Nearly solid so visit color stays readable over earth texture
              return withAlpha(
                fills[code],
                isMinimal
                  ? theme === "light"
                    ? 0.78
                    : 0.82
                  : theme === "light"
                    ? 0.9
                    : 0.92,
              );
            }
            return isMinimal
              ? withAlpha(fills[code], theme === "light" ? 0.88 : 0.9)
              : fills[code];
          }
          if (code && wishlist.has(code)) {
            return isMinimal ? "#C5B8D4" : "#B8A9C9";
          }
          if (isSatellite) {
            return theme === "light"
              ? "rgba(255,255,255,0.03)"
              : "rgba(0,0,0,0.1)";
          }
          return palette.classicUnvisited;
        }}
        polygonSideColor={() =>
          isSatellite
            ? theme === "dark"
              ? "rgba(8,20,28,0.55)"
              : "rgba(30,60,80,0.22)"
            : theme === "dark"
              ? "rgba(20,28,30,0.8)"
              : "rgba(230,224,212,0.9)"
        }
        polygonStrokeColor={(d) => {
          const feat = d as CountryFeature;
          const code = feat.properties.code;
          if (code && (code === focusCode || code === hoveredCode)) {
            return palette.borderFocus;
          }
          if (isSatellite && code && (fills[code] || wishlist.has(code))) {
            return theme === "light"
              ? "rgba(255,255,255,0.9)"
              : "rgba(255,230,150,0.85)";
          }
          if (isSatellite) {
            return theme === "light"
              ? "rgba(255,255,255,0.18)"
              : "rgba(0,0,0,0.32)";
          }
          return palette.classicStroke;
        }}
        polygonAltitude={(d) => {
          const feat = d as CountryFeature;
          const code = feat.properties.code;
          const hovered = Boolean(code && hoveredCode === code && fills[code]);
          if (code && focusCode === code) return isSatellite ? 0.034 : 0.018;
          if (hovered) return isSatellite ? 0.032 : 0.016;
          if (code && (fills[code] || wishlist.has(code))) {
            // Visited countries sit higher so they read as the primary mark
            return isSatellite ? 0.024 : 0.012;
          }
          return isSatellite ? 0.002 : 0.004;
        }}
        polygonsTransitionDuration={380}
        onPolygonHover={(poly) => {
          if (!canHoverRef.current) return;
          if (!poly) {
            revealCountry(null);
            return;
          }
          const feat = poly as CountryFeature;
          const code = feat?.properties?.code;
          if (code && fills[code]) revealCountry(code);
          else revealCountry(null);
        }}
        polygonLabel={
          canHover
            ? (d) => {
                const feat = d as CountryFeature;
                const code = feat.properties.code;
                const meta = code ? countryMeta.get(code) : undefined;
                const name = meta?.name ?? feat.properties.name;
                const flag = meta?.flagEmoji ?? "";
                const visitors = code
                  ? visitMap.visitorsByCountry[code] ?? []
                  : [];
                const countryPins = code
                  ? pins.filter((p) => p.countryCode === code)
                  : [];
                const visitorHtml = visitors.length
                  ? visitors
                      .map(
                        (v) =>
                          `<div style="display:flex;gap:6px;align-items:center;margin-top:4px;font-size:12px"><span style="width:8px;height:8px;border-radius:999px;background:${v.color}"></span>${escapeHtml(v.displayName)}</div>`,
                      )
                      .join("")
                  : `<div style="margin-top:4px;font-size:12px;opacity:.7">Not visited yet</div>`;
                const placesHtml = countryPins.length
                  ? `<div style="margin-top:6px;font-size:11px;opacity:.75">${countryPins
                      .slice(0, 4)
                      .map((p) => escapeHtml(p.name))
                      .join(" · ")}${countryPins.length > 4 ? "…" : ""}</div>`
                  : "";

                return `<div style="font-family:sans-serif;padding:2px 0;max-width:min(16rem,70vw)">
            <div style="font-weight:600">${flag} ${escapeHtml(name)}${code ? ` · ${escapeHtml(code)}` : ""}</div>
            ${visitorHtml}
            ${placesHtml}
          </div>`;
              }
            : undefined
        }
        onPolygonClick={(poly) => {
          const feat = poly as CountryFeature;
          if (!feat?.properties?.code) return;
          suppressBackgroundClick();
          if (onCountryClick) onCountryClick(feat.properties.code);
          else router.push(`/countries/${feat.properties.code}`);
        }}
        onGlobeClick={() => {
          if (suppressBgRef.current) return;
          onBackgroundClickRef.current?.();
        }}
        htmlElementsData={globePins}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.022}
        htmlElement={makeGlobePinElement}
        htmlTransitionDuration={0}
        htmlElementVisibilityModifier={(el, isVisible) => {
          el.style.opacity = isVisible ? "1" : "0";
          el.style.pointerEvents = isVisible ? "auto" : "none";
          el.style.transform = isVisible
            ? "translate(-50%, -50%) scale(1)"
            : "translate(-50%, -50%) scale(0.6)";
        }}
      />

      {!hideReset ? (
        <button
          type="button"
          onClick={resetCamera}
          className="absolute bottom-3 right-3 rounded-[var(--radius-control)] bg-[var(--card)]/90 px-3 py-1.5 text-xs shadow-[var(--shadow-sm)] backdrop-blur-sm"
        >
          Reset view
        </button>
      ) : null}
    </div>
  );
}
