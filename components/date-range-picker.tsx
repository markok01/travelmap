"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage, useT } from "@/components/language-provider";

type Props = {
  startDate: string;
  endDate: string;
  onChange: (next: { startDate: string; endDate: string }) => void;
  /** When true, calendar is always visible (wizard). Otherwise opens from trigger. */
  inline?: boolean;
  startName?: string;
  endName?: string;
  /** Emit hidden inputs for form submit (default true). */
  includeHiddenFields?: boolean;
};

const WEEKDAY_SUN_KEYS = ["su", "mo", "tu", "we", "th", "fr", "sa"] as const;
const MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

function dateLocale(locale: string) {
  return locale === "sr" ? "sr-Latn" : "en-US";
}

function yearOptions() {
  const now = new Date().getFullYear();
  const years: number[] = [];
  for (let y = now + 2; y >= now - 80; y--) years.push(y);
  return years;
}

function parseIso(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function daysBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86_400_000);
}

function formatRangeLabel(
  start: string,
  end: string,
  selectDates: string,
  localeTag: string,
) {
  const s = parseIso(start);
  const e = parseIso(end);
  if (!s && !e) return selectDates;
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  if (s && e) {
    if (start === end) return s.toLocaleDateString(localeTag, opts);
    return `${s.toLocaleDateString(localeTag, opts)} – ${e.toLocaleDateString(localeTag, opts)}`;
  }
  if (s) return `${s.toLocaleDateString(localeTag, opts)} – …`;
  return selectDates;
}

function monthLabel(date: Date, localeTag: string) {
  return date.toLocaleDateString(localeTag, { month: "long", year: "numeric" });
}

function buildMonthCells(month: Date) {
  const first = startOfMonth(month);
  const startPad = first.getDay();
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  inline = false,
  startName = "startDate",
  endName = "endDate",
  includeHiddenFields = true,
}: Props) {
  const t = useT();
  const { locale } = useLanguage();
  const localeTag = dateLocale(locale);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(inline);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const start = parseIso(startDate);
    const end = parseIso(endDate);
    return startOfMonth(start ?? end ?? new Date());
  });

  useEffect(() => {
    if (inline) setOpen(true);
  }, [inline]);

  useEffect(() => {
    if (inline || !open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [inline, open]);

  const start = parseIso(startDate);
  const end = parseIso(endDate);
  const selectingEnd = Boolean(start && !end);

  const previewEnd = useMemo(() => {
    if (!selectingEnd || !hoverDate) return null;
    const h = parseIso(hoverDate);
    if (!h || !start) return null;
    return h < start ? null : h;
  }, [selectingEnd, hoverDate, start]);

  const rangeEnd = end ?? previewEnd;

  const months = useMemo(() => {
    return [viewMonth, addMonths(viewMonth, 1)];
  }, [viewMonth]);

  const nightCount =
    start && end ? Math.max(0, daysBetween(start, end)) : null;
  const dayCount =
    start && end ? Math.max(1, daysBetween(start, end) + 1) : null;

  const years = useMemo(() => yearOptions(), []);

  function jumpToMonth(monthIndex: number) {
    setViewMonth(new Date(viewMonth.getFullYear(), monthIndex, 1));
  }

  function jumpToYear(year: number) {
    setViewMonth(new Date(year, viewMonth.getMonth(), 1));
  }

  function selectDay(date: Date) {
    const iso = toIso(date);

    if (!start || (start && end)) {
      onChange({ startDate: iso, endDate: "" });
      setHoverDate(null);
      return;
    }

    if (date < start) {
      onChange({ startDate: iso, endDate: "" });
      setHoverDate(null);
      return;
    }

    onChange({ startDate: startDate, endDate: iso });
    setHoverDate(null);
    if (!inline) setOpen(false);
  }

  function clearDates() {
    onChange({ startDate: "", endDate: "" });
    setHoverDate(null);
  }

  function dayState(date: Date) {
    const isStart = start ? sameDay(date, start) : false;
    const isEnd = rangeEnd ? sameDay(date, rangeEnd) : false;
    const inRange =
      start &&
      rangeEnd &&
      date > start &&
      date < rangeEnd &&
      !sameDay(date, start) &&
      !sameDay(date, rangeEnd);

    return { isStart, isEnd, inRange: Boolean(inRange) };
  }

  return (
    <div ref={rootRef} className="relative w-full min-w-0 max-w-full space-y-2">
      {includeHiddenFields ? (
        <>
          <input type="hidden" name={startName} value={startDate} />
          <input type="hidden" name={endName} value={endDate} />
        </>
      ) : null}

      <button
        type="button"
        className={`field flex w-full min-w-0 max-w-full items-center justify-between gap-3 text-left ${
          open && !inline ? "border-[var(--accent)]" : ""
        }`}
        onClick={() => {
          if (!inline) setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="min-w-0 flex-1 overflow-hidden">
          <span className="block text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            {t("trips.dates")}
          </span>
          <span
            className={`block truncate text-sm ${
              startDate || endDate
                ? "text-[var(--foreground)]"
                : "text-[var(--muted-foreground)]"
            }`}
          >
            {formatRangeLabel(
              startDate,
              endDate,
              t("dates.selectDates"),
              localeTag,
            )}
          </span>
        </span>
        {dayCount ? (
          <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]">
            {dayCount === 1
              ? t("common.dayCount", { count: dayCount })
              : t("common.daysCount", { count: dayCount })}
            {nightCount != null && nightCount > 0
              ? ` · ${
                  nightCount === 1
                    ? t("common.night")
                    : `${nightCount} ${t("common.nights")}`
                }`
              : ""}
          </span>
        ) : (
          <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
            {selectingEnd ? t("trips.pickEnd") : t("trips.pickRange")}
          </span>
        )}
      </button>

      {open ? (
        <div
          className={`${
            inline
              ? "w-full min-w-0 max-w-full"
              : "absolute left-0 right-0 z-40 mt-1 w-full min-w-0 max-w-full sm:right-auto sm:max-w-xl"
          } box-border overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-md)] sm:p-4`}
          role="dialog"
          aria-label={t("dates.chooseTripDates")}
        >
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="shrink-0 rounded-[var(--radius-control)] border border-[var(--border)] px-2.5 py-1.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
                aria-label={t("dates.prevMonth")}
              >
                ‹
              </button>
              <p className="min-w-0 flex-1 truncate text-center text-sm text-[var(--muted-foreground)]">
                {selectingEnd
                  ? t("trips.selectEnd")
                  : start && end
                    ? t("trips.tapStartOver")
                    : t("trips.selectStart")}
              </p>
              <button
                type="button"
                className="shrink-0 rounded-[var(--radius-control)] border border-[var(--border)] px-2.5 py-1.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                aria-label={t("dates.nextMonth")}
              >
                ›
              </button>
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-2">
              <label className="block min-w-0 space-y-1">
                <span className="sr-only">{t("common.month")}</span>
                <select
                  className="field py-2 text-sm"
                  value={viewMonth.getMonth()}
                  onChange={(e) => jumpToMonth(Number(e.target.value))}
                  aria-label={t("dates.jumpToMonth")}
                >
                  {MONTH_KEYS.map((key, index) => (
                    <option key={key} value={index}>
                      {t(`dates.months.${key}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0 space-y-1">
                <span className="sr-only">{t("common.year")}</span>
                <select
                  className="field py-2 text-sm"
                  value={viewMonth.getFullYear()}
                  onChange={(e) => jumpToYear(Number(e.target.value))}
                  aria-label={t("dates.jumpToYear")}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {months.map((month, monthIndex) => {
              const cells = buildMonthCells(month);
              return (
                <div
                  key={`${month.getFullYear()}-${month.getMonth()}`}
                  className={`min-w-0 ${monthIndex === 1 ? "hidden sm:block" : ""}`}
                >
                  <p className="mb-2 truncate text-center font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight">
                    {monthLabel(month, localeTag)}
                  </p>
                  <div className="mb-1 grid min-w-0 grid-cols-7 gap-0.5">
                    {WEEKDAY_SUN_KEYS.map((key) => (
                      <div
                        key={key}
                        className="py-1 text-center text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]"
                      >
                        {t(`dates.weekdaysSun.${key}`)}
                      </div>
                    ))}
                  </div>
                  <div className="grid min-w-0 grid-cols-7 gap-0.5">
                    {cells.map((date, i) => {
                      if (!date) {
                        return (
                          <div key={`e-${i}`} className="aspect-square min-w-0" />
                        );
                      }
                      const { isStart, isEnd, inRange } = dayState(date);
                      const isEdge = isStart || isEnd;
                      const iso = toIso(date);
                      const isToday = sameDay(date, new Date());

                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => selectDay(date)}
                          onMouseEnter={() => setHoverDate(iso)}
                          onMouseLeave={() => setHoverDate(null)}
                          className={`relative aspect-square min-w-0 w-full rounded-full text-sm transition ${
                            isEdge
                              ? "bg-[var(--accent)] font-semibold text-[var(--accent-foreground)]"
                              : inRange
                                ? "bg-[var(--accent-soft)] text-[var(--foreground)]"
                                : "hover:bg-[var(--muted)]"
                          } ${
                            !isEdge && isToday
                              ? "ring-1 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--card)]"
                              : ""
                          }`}
                          aria-label={iso}
                          aria-pressed={isEdge}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex min-w-0 items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
            <button
              type="button"
              className="text-sm text-[var(--muted-foreground)] underline-offset-2 hover:text-[var(--foreground)] hover:underline disabled:opacity-40"
              onClick={clearDates}
              disabled={!startDate && !endDate}
            >
              {t("common.clear")}
            </button>
            {!inline ? (
              <button
                type="button"
                className="btn-primary px-4 py-1.5 text-sm"
                onClick={() => setOpen(false)}
                disabled={!startDate || !endDate}
              >
                {t("common.done")}
              </button>
            ) : startDate && endDate ? (
              <p className="min-w-0 truncate text-sm text-[var(--muted-foreground)]">
                {formatRangeLabel(
                  startDate,
                  endDate,
                  t("dates.selectDates"),
                  localeTag,
                )}
              </p>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("trips.clickStartEnd")}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
