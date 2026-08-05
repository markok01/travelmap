"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { useLanguage, useT } from "@/components/language-provider";
import {
  collectYearsFromTrips,
  filterTripsForScope,
  type StatsMember,
  type StatsScope,
  type StatsTrip,
} from "@/lib/stats/compute";
import { formatTripDates, tripDurationDays } from "@/lib/trips/dates";
import {
  buildCalendarMonth,
  filterOverlappingYear,
  groupTripsByYear,
  yearOverview,
} from "@/lib/timeline/helpers";

type View = "timeline" | "year" | "calendar";

const WEEKDAY_MON_KEYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

function scopeLabel(scope: StatsScope, t: ReturnType<typeof useT>) {
  const keys = {
    anyone: "stats.scopeAnyone",
    individual: "stats.scopeIndividual",
    couple: "stats.scopeCouple",
    family: "stats.scopeFamily",
  } as const;
  return t(keys[scope]);
}

function ScopeFilters({
  scope,
  setScope,
  members,
  memberId,
  setMemberId,
  coupleA,
  setCoupleA,
  coupleB,
  setCoupleB,
  year,
  setYear,
  years,
  showYear = true,
}: {
  scope: StatsScope;
  setScope: (s: StatsScope) => void;
  members: StatsMember[];
  memberId: string;
  setMemberId: (id: string) => void;
  coupleA: string;
  setCoupleA: (id: string) => void;
  coupleB: string;
  setCoupleB: (id: string) => void;
  year: string;
  setYear: (y: string) => void;
  years: number[];
  showYear?: boolean;
}) {
  const t = useT();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["anyone", t("common.anyone")],
            ["individual", t("common.individual")],
            ["couple", t("common.couple")],
            ["family", t("common.wholeFamily")],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setScope(value)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              scope === value
                ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                : "border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {scope === "individual" ? (
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              {t("common.member")}
            </span>
            <select
              className="field"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {scope === "couple" ? (
          <>
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                {t("common.memberA")}
              </span>
              <select
                className="field"
                value={coupleA}
                onChange={(e) => setCoupleA(e.target.value)}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                {t("common.memberB")}
              </span>
              <select
                className="field"
                value={coupleB}
                onChange={(e) => setCoupleB(e.target.value)}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        {showYear ? (
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              {t("common.year")}
            </span>
            <select
              className="field"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="all">{t("common.allYears")}</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </div>
  );
}

function TimelineItem({
  trip,
  members,
}: {
  trip: StatsTrip;
  members: StatsMember[];
}) {
  const title = trip.title?.trim() || trip.countryName;
  const days = tripDurationDays(trip.startDate, trip.endDate);
  const participants = members.filter((m) =>
    trip.participantIds.includes(m.id),
  );

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="block rounded-3xl border border-[var(--border)] bg-[var(--background)] p-4 transition hover:border-[var(--accent)]"
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none">{trip.flagEmoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-medium">{title}</h3>
            <span className="text-xs text-[var(--muted-foreground)]">
              {days}d
            </span>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {trip.countryName} · {formatTripDates(trip.startDate, trip.endDate)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {participants.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                {p.displayName}
              </span>
            ))}
          </div>
          {trip.places.length > 0 ? (
            <p className="mt-2 truncate text-xs text-[var(--muted-foreground)]">
              {trip.places.join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function TimelineExplorer({
  trips,
  members,
}: {
  trips: StatsTrip[];
  members: StatsMember[];
}) {
  const t = useT();
  const { locale } = useLanguage();
  const localeTag = locale === "sr" ? "sr-Latn" : "en-US";
  const [view, setView] = useState<View>("timeline");
  const [scope, setScope] = useState<StatsScope>("anyone");
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [coupleA, setCoupleA] = useState(members[0]?.id ?? "");
  const [coupleB, setCoupleB] = useState(
    members[1]?.id ?? members[0]?.id ?? "",
  );
  const [year, setYear] = useState("all");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");

  const years = useMemo(() => collectYearsFromTrips(trips), [trips]);
  const defaultYear = years[0] ?? new Date().getFullYear();
  const [overviewYear, setOverviewYear] = useState(String(defaultYear));
  const [calYear, setCalYear] = useState(defaultYear);
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const allMemberIds = useMemo(() => members.map((m) => m.id), [members]);
  const scopeOptions = useMemo(
    () => ({
      scope,
      memberId,
      coupleMemberIds: [coupleA, coupleB] as [string, string],
      allMemberIds,
    }),
    [scope, memberId, coupleA, coupleB, allMemberIds],
  );

  const scopedTrips = useMemo(
    () =>
      filterTripsForScope(trips, {
        ...scopeOptions,
        year: year === "all" ? null : Number(year),
      }),
    [trips, scopeOptions, year],
  );

  const yearGroups = useMemo(
    () => groupTripsByYear(scopedTrips, order),
    [scopedTrips, order],
  );

  const overview = useMemo(
    () => yearOverview(trips, Number(overviewYear), scopeOptions),
    [trips, overviewYear, scopeOptions],
  );

  const calendarScoped = useMemo(() => {
    const base = filterTripsForScope(trips, { ...scopeOptions, year: null });
    return filterOverlappingYear(base, calYear);
  }, [trips, scopeOptions, calYear]);

  const calendarCells = useMemo(
    () => buildCalendarMonth(calYear, calMonth, calendarScoped),
    [calYear, calMonth, calendarScoped],
  );

  const selectedTrips = useMemo(() => {
    if (!selectedDay) return [];
    return (
      calendarCells.find((c) => c.date === selectedDay)?.trips ?? []
    );
  }, [calendarCells, selectedDay]);

  const memberColor = useMemo(() => {
    const map = new Map(members.map((m) => [m.id, m.color]));
    return map;
  }, [members]);

  function dayColor(dayTrips: StatsTrip[]) {
    if (dayTrips.length === 0) return null;
    const first = dayTrips[0];
    const color = memberColor.get(first.participantIds[0] ?? "");
    return color ?? "#2F6F6A";
  }

  function shiftMonth(delta: number) {
    let m = calMonth + delta;
    let y = calYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setCalMonth(m);
    setCalYear(y);
    setSelectedDay(null);
  }

  if (trips.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center">
        <EmptyState
          eyebrow={t("timeline.title")}
          title={t("timeline.emptyTitle")}
          description={t("timeline.emptyDescription")}
          actionHref="/trips/new"
          actionLabel={t("common.addFirstTrip")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {t("timeline.eyebrow")}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
          {t("timeline.title")}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {scopeLabel(scope, t)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["timeline", t("timeline.viewTimeline")],
            ["year", t("timeline.viewYear")],
            ["calendar", t("timeline.viewCalendar")],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setView(value)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              view === value
                ? "bg-[var(--secondary-soft)] font-medium text-[var(--foreground)]"
                : "border border-[var(--border)] text-[var(--muted-foreground)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ScopeFilters
        scope={scope}
        setScope={setScope}
        members={members}
        memberId={memberId}
        setMemberId={setMemberId}
        coupleA={coupleA}
        setCoupleA={setCoupleA}
        coupleB={coupleB}
        setCoupleB={setCoupleB}
        year={year}
        setYear={setYear}
        years={years}
        showYear={view === "timeline"}
      />

      {view === "timeline" ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              className="btn-secondary !py-2 !px-3 text-xs"
              onClick={() =>
                setOrder((o) => (o === "newest" ? "oldest" : "newest"))
              }
            >
              {order === "newest"
                ? t("timeline.newestFirst")
                : t("timeline.oldestFirst")}
            </button>
          </div>

          {yearGroups.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-[var(--border)] px-6 py-10 text-center text-[var(--muted-foreground)]">
              {t("timeline.noMatch")}
            </p>
          ) : (
            yearGroups.map((group) => (
              <section key={group.year} className="space-y-3">
                <h2 className="sticky top-2 z-10 inline-flex rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-sm font-medium shadow-[var(--shadow-sm)]">
                  {group.year}
                </h2>
                <ul className="space-y-3">
                  {group.trips.map((trip) => (
                    <li key={trip.id}>
                      <TimelineItem trip={trip} members={members} />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      ) : null}

      {view === "year" ? (
        <div className="space-y-6">
          <label className="block max-w-xs space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              {t("timeline.overviewYear")}
            </span>
            <select
              className="field"
              value={overviewYear}
              onChange={(e) => setOverviewYear(e.target.value)}
            >
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                {t("timeline.tripsLabel")}
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
                {overview.tripCount}
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                {t("timeline.countriesLabel")}
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
                {overview.countryCount}
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                {t("timeline.daysLabel")}
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
                {overview.totalDays}
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                {t("stats.topCountry")}
              </p>
              <p className="mt-2 text-lg font-medium">
                {overview.topCountry
                  ? `${overview.topCountry.flag ?? ""} ${overview.topCountry.name}`.trim()
                  : "—"}
              </p>
            </div>
          </div>

          {overview.longestTrip ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("stats.longest")} {overview.longestTrip.flagEmoji}{" "}
              {overview.longestTrip.title} ({overview.longestTrip.days}d)
            </p>
          ) : null}

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--background)] p-5">
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              {t("timeline.monthStrip")}
            </h2>
            <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-12">
              {overview.byMonth.map((m) => (
                <div
                  key={m.month}
                  className="rounded-2xl border border-[var(--border)] px-2 py-3 text-center"
                >
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    {m.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold">{m.count}</p>
                </div>
              ))}
            </div>
          </div>

          <ul className="space-y-3">
            {overview.trips.map((trip) => (
              <li key={trip.id}>
                <TimelineItem trip={trip} members={members} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {view === "calendar" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="btn-secondary !px-3 !py-2"
              onClick={() => shiftMonth(-1)}
            >
              {t("timeline.prev")}
            </button>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              {new Date(Date.UTC(calYear, calMonth - 1, 1)).toLocaleString(
                localeTag,
                { month: "long", year: "numeric", timeZone: "UTC" },
              )}
            </h2>
            <button
              type="button"
              className="btn-secondary !px-3 !py-2"
              onClick={() => shiftMonth(1)}
            >
              {t("timeline.next")}
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--muted-foreground)]">
            {WEEKDAY_MON_KEYS.map((key) => (
              <div key={key} className="py-2">
                {t(`dates.weekdaysMon.${key}`)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, index) => {
              if (!cell.inMonth || !cell.date) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-16 rounded-2xl bg-transparent"
                  />
                );
              }
              const active = selectedDay === cell.date;
              const color = dayColor(cell.trips);
              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelectedDay(cell.date)}
                  className={`min-h-16 rounded-2xl border p-2 text-left transition ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent)]"
                  }`}
                >
                  <p className="text-xs font-medium">
                    {Number(cell.date.slice(8, 10))}
                  </p>
                  {cell.trips.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {cell.trips.slice(0, 3).map((t) => (
                        <span
                          key={t.id}
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              memberColor.get(t.participantIds[0] ?? "") ??
                              color ??
                              "#2F6F6A",
                          }}
                        />
                      ))}
                      {cell.trips.length > 3 ? (
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          +{cell.trips.length - 3}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {selectedDay ? (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-sm font-medium">
                {formatTripDates(selectedDay, selectedDay)}
              </p>
              {selectedTrips.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  {t("timeline.noTravelDay")}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {selectedTrips.map((trip) => (
                    <li key={trip.id}>
                      <Link
                        href={`/trips/${trip.id}`}
                        className="flex items-center gap-2 text-sm hover:text-[var(--accent)]"
                      >
                        <span>{trip.flagEmoji}</span>
                        <span className="font-medium">
                          {trip.title?.trim() || trip.countryName}
                        </span>
                        <span className="text-[var(--muted-foreground)]">
                          {formatTripDates(trip.startDate, trip.endDate)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("timeline.tapDay")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
