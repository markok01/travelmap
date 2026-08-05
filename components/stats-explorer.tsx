"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { useT } from "@/components/language-provider";
import {
  collectYearsFromTrips,
  computeStats,
  type FamilyStats,
  type StatsMember,
  type StatsScope,
  type StatsTrip,
} from "@/lib/stats/compute";
import { formatTripDates } from "@/lib/trips/dates";

function scopeLabel(scope: StatsScope, t: ReturnType<typeof useT>) {
  const keys = {
    anyone: "stats.scopeAnyone",
    individual: "stats.scopeIndividual",
    couple: "stats.scopeCouple",
    family: "stats.scopeFamily",
  } as const;
  return t(keys[scope]);
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--background)] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}

function BarList({
  items,
  emptyLabel,
  countSuffix,
}: {
  items: { label: string; count: number }[];
  emptyLabel: string;
  countSuffix?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0 || items.every((i) => i.count === 0)) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">{emptyLabel}</p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="shrink-0 text-[var(--muted-foreground)]">
              {item.count}
              {countSuffix ? ` ${countSuffix}` : ""}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Highlights({
  stats,
  t,
}: {
  stats: FamilyStats;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--background)] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {t("stats.topCountry")}
        </p>
        <p className="mt-2 text-lg font-medium">
          {stats.topCountry
            ? `${stats.topCountry.meta ?? ""} ${stats.topCountry.label}`.trim()
            : "—"}
        </p>
        {stats.topCountry ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            {stats.topCountry.count}{" "}
            {stats.topCountry.count === 1
              ? t("common.visit")
              : t("common.visits")}
          </p>
        ) : null}
      </div>
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--background)] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {t("stats.topCity")}
        </p>
        <p className="mt-2 text-lg font-medium">
          {stats.topCity?.label ?? "—"}
        </p>
        {stats.topCity ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            {stats.topCity.count}{" "}
            {stats.topCity.count === 1
              ? t("common.visit")
              : t("common.visits")}
          </p>
        ) : null}
      </div>
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--background)] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {t("stats.topContinent")}
        </p>
        <p className="mt-2 text-lg font-medium">
          {stats.topContinent?.label ?? "—"}
        </p>
        {stats.topContinent ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            {stats.topContinent.count}{" "}
            {stats.topContinent.count === 1
              ? t("map.trip").toLowerCase()
              : t("stats.trips").toLowerCase()}
          </p>
        ) : null}
      </div>
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--background)] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {t("stats.longestShortest")}
        </p>
        <p className="mt-2 text-sm">
          <span className="font-medium">{t("stats.longest")}</span>{" "}
          {stats.longestTrip
            ? `${stats.longestTrip.flagEmoji ?? ""} ${stats.longestTrip.title} (${stats.longestTrip.days}d)`.trim()
            : "—"}
        </p>
        <p className="mt-1 text-sm">
          <span className="font-medium">{t("stats.shortest")}</span>{" "}
          {stats.shortestTrip
            ? `${stats.shortestTrip.flagEmoji ?? ""} ${stats.shortestTrip.title} (${stats.shortestTrip.days}d)`.trim()
            : "—"}
        </p>
        {stats.longestTrip ? (
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            {formatTripDates(
              stats.longestTrip.startDate,
              stats.longestTrip.endDate,
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function StatsExplorer({
  trips,
  members,
  catalogSize,
}: {
  trips: StatsTrip[];
  members: StatsMember[];
  catalogSize: number;
}) {
  const t = useT();
  const [scope, setScope] = useState<StatsScope>("anyone");
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [coupleA, setCoupleA] = useState(members[0]?.id ?? "");
  const [coupleB, setCoupleB] = useState(
    members[1]?.id ?? members[0]?.id ?? "",
  );
  const [year, setYear] = useState<string>("all");

  const years = useMemo(() => collectYearsFromTrips(trips), [trips]);
  const allMemberIds = useMemo(() => members.map((m) => m.id), [members]);

  const stats = useMemo(
    () =>
      computeStats(trips, catalogSize, {
        scope,
        memberId,
        coupleMemberIds: [coupleA, coupleB],
        allMemberIds,
        year: year === "all" ? null : Number(year),
      }),
    [trips, catalogSize, scope, memberId, coupleA, coupleB, allMemberIds, year],
  );

  if (trips.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center">
        <EmptyState
          eyebrow={t("stats.title")}
          title={t("stats.emptyTitle")}
          description={t("stats.emptyDescription")}
          actionHref="/trips/new"
          actionLabel={t("common.addFirstTrip")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            {t("stats.eyebrow")}
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
            {t("stats.title")}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted-foreground)]">
            {scopeLabel(scope, t)}
          </p>
        </div>
        <Link href="/map" className="btn-secondary">
          {t("stats.seeOnMap")}
        </Link>
      </div>

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
      </div>

      {stats.tripCount === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--border)] px-6 py-10 text-center text-[var(--muted-foreground)]">
          {t("stats.noMatch")}
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t("stats.countriesVisited")}
              value={String(stats.visitedCountries)}
              hint={`${stats.coveragePercent}% of ${stats.catalogSize}`}
            />
            <StatCard label={t("stats.trips")} value={String(stats.tripCount)} />
            <StatCard
              label={t("stats.daysOnRoad")}
              value={String(stats.totalDays)}
              hint={
                stats.averageTripDays != null
                  ? t("stats.avgDaysPerTrip", { days: stats.averageTripDays })
                  : undefined
              }
            />
            <StatCard
              label={t("stats.tripsPerYear")}
              value={
                stats.averageTripsPerYear != null
                  ? String(stats.averageTripsPerYear)
                  : "—"
              }
              hint={t("stats.uniqueRepeats", {
                unique: stats.uniqueDestinations,
                repeats: stats.repeatVisits,
              })}
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              {t("stats.highlights")}
            </h2>
            <Highlights stats={stats} t={t} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-3xl border border-[var(--border)] bg-[var(--background)] p-5">
              <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                {t("stats.countryVisits")}
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                {t("stats.countryVisitsHint")}
              </p>
              <BarList
                items={stats.countryVisits.map((row) => ({
                  label: `${row.meta ? `${row.meta} ` : ""}${row.label}`,
                  count: row.count,
                }))}
                emptyLabel={t("stats.noCountriesScope")}
                countSuffix={t("common.visits")}
              />
            </div>
            <div className="space-y-3 rounded-3xl border border-[var(--border)] bg-[var(--background)] p-5">
              <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                {t("stats.cityVisits")}
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                {t("stats.cityVisitsHint")}
              </p>
              <BarList
                items={stats.cityVisits.map((row) => ({
                  label: row.label,
                  count: row.count,
                }))}
                emptyLabel={t("stats.noCitiesLogged")}
                countSuffix={t("common.visits")}
              />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-3xl border border-[var(--border)] bg-[var(--background)] p-5">
              <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                {t("stats.byContinent")}
              </h2>
              <BarList
                items={stats.countriesByContinent.map((row) => ({
                  label: row.continent,
                  count: row.count,
                }))}
                emptyLabel={t("stats.noContinentsScope")}
              />
            </div>
            <div className="space-y-3 rounded-3xl border border-[var(--border)] bg-[var(--background)] p-5">
              <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                {t("stats.bySeason")}
              </h2>
              <BarList
                items={stats.bySeason.map((row) => ({
                  label: row.label,
                  count: row.count,
                }))}
                emptyLabel={t("stats.noSeasonalData")}
              />
            </div>
          </section>

          <section className="space-y-3 rounded-3xl border border-[var(--border)] bg-[var(--background)] p-5">
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              {t("stats.byMonth")}
            </h2>
            <BarList
              items={stats.byMonth.map((row) => ({
                label: row.label,
                count: row.count,
              }))}
              emptyLabel={t("stats.noMonthlyData")}
            />
          </section>
        </>
      )}
    </div>
  );
}
