"use client";

import { useMemo, useState, useActionState } from "react";
import {
  createTripAction,
  type TripActionState,
} from "@/lib/actions/trips";
import type { Country, FamilyMember } from "@/lib/db/schema";

const initialState: TripActionState = {};
const TOTAL_STEPS = 4;

export function FirstTripWizard({
  countries,
  members,
  defaultCountryCode,
}: {
  countries: Country[];
  members: FamilyMember[];
  defaultCountryCode?: string;
}) {
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
  const [placeName, setPlaceName] = useState("");

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

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="countryCode" value={countryCode} />
      <input type="hidden" name="startDate" value={startDate} />
      <input type="hidden" name="endDate" value={endDate} />
      <input type="hidden" name="privacy" value="family" />
      <input type="hidden" name="placeType" value="city" />
      <input type="hidden" name="placeNotes" value="" />
      {participantIds.map((id) => (
        <input key={id} type="hidden" name="participantIds" value={id} />
      ))}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted-foreground)]">
          Step {step} of {TOTAL_STEPS}
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
              Where did you go?
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Pick the country for this trip.
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
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                value={countryQuery}
                onChange={(e) => setCountryQuery(e.target.value)}
                className="field"
                placeholder="Search countries…"
                aria-label="Search countries"
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
                    No matches
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
              When was it?
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Start and end dates for this journey.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Start date</span>
              <input
                type="date"
                required
                className="field"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">End date</span>
              <input
                type="date"
                required
                className="field"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              Who went?
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Select everyone who joined this trip.
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
              Add a city? (optional)
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Pin a main city or place — you can add more later.
            </p>
          </div>
          {selectedCountry ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              {selectedCountry.flagEmoji} {selectedCountry.name} ·{" "}
              {startDate && endDate
                ? `${startDate} → ${endDate}`
                : "Dates set"}
            </p>
          ) : null}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">City or place</span>
            <input
              name="placeName"
              className="field"
              placeholder="Belgrade, Kyoto, Reykjavik…"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
            />
          </label>
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
            Back
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
            Next
          </button>
        ) : (
          <button
            type="submit"
            className="btn-primary"
            disabled={pending || !countryCode || participantIds.length === 0}
          >
            {pending ? "Saving…" : "Save trip"}
          </button>
        )}
      </div>
    </form>
  );
}
