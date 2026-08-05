"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useT } from "@/components/language-provider";
import type { PlaceSuggestion } from "@/lib/geo/geocode";

export type PlaceLocationValue = {
  name: string;
  latitude: number | null;
  longitude: number | null;
  countryCode: string | null;
  pinned: boolean;
};

type Props = {
  value: PlaceLocationValue;
  onChange: (next: PlaceLocationValue) => void;
  /** Narrow Nominatim to these countries when set (e.g. trip countries). */
  countryCodes?: string[];
  placeholder?: string;
  inputName?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  enterKeyHint?: React.InputHTMLAttributes<HTMLInputElement>["enterKeyHint"];
};

export function PlaceAutocomplete({
  value,
  onChange,
  countryCodes,
  placeholder,
  inputName = "placeName",
  className = "field",
  onKeyDown,
  autoComplete = "off",
  enterKeyHint,
}: Props) {
  const t = useT();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);

  const countryFilter = countryCodes?.length
    ? countryCodes.map((c) => c.toUpperCase()).join(",")
    : "";

  useEffect(() => {
    const q = value.name.trim();
    if (q.length < 2 || value.pinned) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      try {
        const params = new URLSearchParams({ q });
        if (countryFilter) params.set("countryCode", countryFilter);

        const res = await fetch(`/api/places/search?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const json = (await res.json()) as { data?: PlaceSuggestion[] };
        setSuggestions(json.data ?? []);
        setActiveIndex(-1);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [value.name, value.pinned, countryFilter]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function selectSuggestion(item: PlaceSuggestion) {
    onChange({
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      countryCode: item.countryCode,
      pinned: true,
    });
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onInputChange(raw: string) {
    onChange({
      name: raw,
      latitude: null,
      longitude: null,
      countryCode: null,
      pinned: false,
    });
    setOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % suggestions.length);
      return;
    }
    if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      return;
    }
    if (e.key === "Enter" && open && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
    onKeyDown?.(e);
  }

  const showList = open && !value.pinned && (loading || suggestions.length > 0);
  const typedWithoutPin =
    value.name.trim().length >= 2 && !value.pinned && !loading;

  return (
    <div ref={wrapRef} className="relative space-y-1.5">
      <input
        name={inputName}
        className={className}
        placeholder={placeholder ?? t("trips.placeSearch")}
        value={value.name}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => {
          if (!value.pinned && suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        autoComplete={autoComplete}
        enterKeyHint={enterKeyHint}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
        }
      />
      <input
        type="hidden"
        name="placeLat"
        value={value.latitude != null ? String(value.latitude) : ""}
      />
      <input
        type="hidden"
        name="placeLng"
        value={value.longitude != null ? String(value.longitude) : ""}
      />
      <input
        type="hidden"
        name="placeCountryCode"
        value={value.countryCode ?? ""}
      />

      {value.pinned && value.latitude != null ? (
        <p className="text-xs text-[var(--accent)]">
          {t("trips.pinned")}
          {value.countryCode ? ` · ${value.countryCode}` : ""}
        </p>
      ) : null}

      {typedWithoutPin && !showList ? (
        <p className="text-xs text-[var(--muted-foreground)]">
          {t("trips.pickSuggestion")}
        </p>
      ) : null}

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] py-1 shadow-[var(--shadow-md)]"
        >
          {loading && suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--muted-foreground)]">
              {t("trips.searching")}
            </li>
          ) : null}
          {suggestions.map((item, index) => (
            <li key={`${item.name}-${item.latitude}-${item.longitude}`}>
              <button
                type="button"
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--muted)] ${
                  index === activeIndex ? "bg-[var(--muted)]" : ""
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(item)}
              >
                <span className="font-medium">{item.label}</span>
                <span className="truncate text-xs text-[var(--muted-foreground)]">
                  {item.countryName || item.countryCode}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
