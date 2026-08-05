"use client";

import { useMemo, useRef, useState, useActionState, startTransition } from "react";
import { DateRangePicker } from "@/components/date-range-picker";
import { useT } from "@/components/language-provider";
import {
  PlaceAutocomplete,
  type PlaceLocationValue,
} from "@/components/place-autocomplete";
import {
  createTripAction,
  type TripActionState,
} from "@/lib/actions/trips";
import type { Country, FamilyMember } from "@/lib/db/schema";

const initialState: TripActionState = {};
const TOTAL_STEPS = 4;

type WizardPlace = PlaceLocationValue & { key: string };

function emptyPlace(): WizardPlace {
  return {
    key: crypto.randomUUID(),
    name: "",
    latitude: null,
    longitude: null,
    countryCode: null,
    pinned: false,
  };
}

export function FirstTripWizard({
  countries,
  members,
  defaultCountryCode,
}: {
  countries: Country[];
  members: FamilyMember[];
  defaultCountryCode?: string;
}) {
  const t = useT();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createTripAction,
    initialState,
  );

  const [step, setStep] = useState(1);
  const [countryQuery, setCountryQuery] = useState("");
  const [countryCode, setCountryCode] = useState(defaultCountryCode ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>(
    members.filter((m) => m.userId).map((m) => m.id).slice(0, 1),
  );
  const [places, setPlaces] = useState<WizardPlace[]>([emptyPlace()]);
  const [title, setTitle] = useState("");

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return countries.slice(0, 12);
    return countries
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.nativeName?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 20);
  }, [countries, countryQuery]);

  const selectedCountry = countries.find((c) => c.code === countryCode);

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function updatePlace(index: number, next: PlaceLocationValue) {
    setPlaces((prev) =>
      prev.map((place, i) => (i === index ? { ...place, ...next } : place)),
    );
  }

  const canAdvance =
    (step === 1 && Boolean(countryCode)) ||
    (step === 2 && Boolean(startDate && endDate)) ||
    (step === 3 && participantIds.length > 0) ||
    step === 4;

  function goNext() {
    if (!canAdvance || step >= TOTAL_STEPS) return;
    setStep((s) => s + 1);
  }

  function goBack() {
    if (step <= 1) return;
    setStep((s) => s - 1);
  }

  /** Only Save button may create the trip — never Enter while typing the city. */
  function saveTrip() {
    if (!formRef.current || pending) return;
    if (!countryCode || participantIds.length === 0) return;
    const payload = new FormData(formRef.current);
    startTransition(() => {
      formAction(payload);
    });
  }

  function blockEnterSubmit(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") e.preventDefault();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="w-full min-w-0 max-w-full space-y-6"
      onSubmit={(e) => {
        // Block implicit submits (Enter in inputs). Saving is via Save button only.
        e.preventDefault();
      }}
    >
      <input type="hidden" name="countryCode" value={countryCode} />
      <input type="hidden" name="startDate" value={startDate} />
      <input type="hidden" name="endDate" value={endDate} />
      <input type="hidden" name="privacy" value="family" />
      {participantIds.map((id) => (
        <input key={id} type="hidden" name="participantIds" value={id} />
      ))}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("trips.wizardStep", { step, total: TOTAL_STEPS })}
        </p>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i + 1 <= step ? "bg-[var(--accent)]" : "bg-[var(--muted)]"
              }`}
            />
          ))}
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              {t("trips.whereTitle")}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {t("trips.whereHint")}
            </p>
          </div>
          {selectedCountry ? (
            <div className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm">
                <span className="text-xl">{selectedCountry.flagEmoji}</span>
                {selectedCountry.name} ({selectedCountry.code})
              </span>
              <button
                type="button"
                className="text-sm text-[var(--accent)]"
                onClick={() => {
                  setCountryCode("");
                  setCountryQuery("");
                }}
              >
                {t("common.change")}
              </button>
            </div>
          ) : (
            <>
              <input
                value={countryQuery}
                onChange={(e) => setCountryQuery(e.target.value)}
                onKeyDown={blockEnterSubmit}
                className="field"
                placeholder={t("trips.searchCountriesShort")}
                aria-label={t("trips.searchCountriesAria")}
              />
              <ul className="max-h-48 overflow-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)]">
                {filteredCountries.map((country) => (
                  <li key={country.code}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--muted)]"
                      onClick={() => {
                        setCountryCode(country.code);
                        setCountryQuery("");
                      }}
                    >
                      <span>{country.flagEmoji}</span>
                      <span className="flex-1">{country.name}</span>
                      <span className="text-[var(--muted-foreground)]">
                        {country.code}
                      </span>
                    </button>
                  </li>
                ))}
                {filteredCountries.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-[var(--muted-foreground)]">
                    {t("common.noMatches")}
                  </li>
                ) : null}
              </ul>
            </>
          )}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              {t("trips.whenTitle")}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {t("trips.whenHint")}
            </p>
          </div>
          <DateRangePicker
            inline
            includeHiddenFields={false}
            startDate={startDate}
            endDate={endDate}
            onChange={({ startDate: nextStart, endDate: nextEnd }) => {
              setStartDate(nextStart);
              setEndDate(nextEnd);
            }}
          />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              {t("trips.whoTitle")}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {t("trips.whoHint")}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {members.map((member) => {
              const checked = participantIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleParticipant(member.id)}
                  className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] border px-3 py-2.5 text-left ${
                    checked
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--background)]"
                  }`}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: member.color }}
                    aria-hidden
                  />
                  <span className="text-sm">{member.displayName}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              {t("trips.detailsTitle")}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {t("trips.detailsHint")}
            </p>
          </div>
          {selectedCountry ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              {selectedCountry.flagEmoji} {selectedCountry.name} ·{" "}
              {startDate && endDate
                ? `${startDate} → ${endDate}`
                : t("trips.datesSet")}
            </p>
          ) : null}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t("trips.tripTitle")}</span>
            <input
              name="title"
              className="field"
              placeholder={
                selectedCountry
                  ? t("trips.titlePlaceholderNamed", {
                      name: selectedCountry.name,
                    })
                  : t("trips.titlePlaceholderFallback")
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={blockEnterSubmit}
              autoComplete="off"
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{t("trips.citiesPlaces")}</span>
              <button
                type="button"
                className="text-sm text-[var(--accent)]"
                onClick={() => setPlaces((prev) => [...prev, emptyPlace()])}
              >
                {t("trips.addCity")}
              </button>
            </div>
            <div className="space-y-2">
              {places.map((place, index) => (
                <div
                  key={place.key}
                  className="flex gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <PlaceAutocomplete
                      value={place}
                      countryCodes={countryCode ? [countryCode] : []}
                      placeholder={t("trips.placeSearchExamples")}
                      onChange={(next) => updatePlace(index, next)}
                      onKeyDown={blockEnterSubmit}
                      enterKeyHint="done"
                    />
                    <input type="hidden" name="placeType" value="city" />
                    <input type="hidden" name="placeNotes" value="" />
                  </div>
                  <button
                    type="button"
                    className="shrink-0 self-start rounded-[var(--radius-control)] px-2 py-2 text-sm text-[var(--danger)] hover:bg-[var(--muted)]"
                    onClick={() =>
                      setPlaces((prev) =>
                        prev.length === 1
                          ? [emptyPlace()]
                          : prev.filter((_, i) => i !== index),
                      )
                    }
                    aria-label={t("trips.removeCity")}
                  >
                    {t("common.remove")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {state.error ? (
        <p className="rounded-[var(--radius-lg)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        {step > 1 ? (
          <button type="button" className="btn-secondary" onClick={goBack}>
            {t("common.back")}
          </button>
        ) : null}
        <div className="flex-1" />
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            className="btn-primary"
            onClick={goNext}
            disabled={!canAdvance}
          >
            {t("common.next")}
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={saveTrip}
            disabled={pending || !countryCode || participantIds.length === 0}
          >
            {pending ? t("common.saving") : t("trips.saveTrip")}
          </button>
        )}
      </div>
    </form>
  );
}
