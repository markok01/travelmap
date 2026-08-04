"use client";

import { useMemo, useState } from "react";
import type { Country, FamilyMember } from "@/lib/db/schema";
import { PLACE_TYPES, TRIP_PRIVACY } from "@/lib/db/schema";

type PlaceDraft = {
  key: string;
  name: string;
  type: string;
  notes: string;
};

type TripFormValues = {
  countryCode: string;
  countryCodes: string[];
  title: string;
  startDate: string;
  endDate: string;
  notes: string;
  privacy: string;
  participantIds: string[];
  places: PlaceDraft[];
};

export function TripForm({
  action,
  countries,
  members,
  defaultValues,
  submitLabel,
  error,
  pending,
}: {
  action: (payload: FormData) => void;
  countries: Country[];
  members: FamilyMember[];
  defaultValues?: Partial<TripFormValues> & { tripId?: string };
  submitLabel: string;
  error?: string;
  pending?: boolean;
}) {
  const [countryQuery, setCountryQuery] = useState("");
  const [countryCodes, setCountryCodes] = useState<string[]>(
    defaultValues?.countryCodes?.length
      ? [...new Set(defaultValues.countryCodes)]
      : defaultValues?.countryCode
        ? [defaultValues.countryCode]
        : [],
  );
  const [participantIds, setParticipantIds] = useState<string[]>(
    defaultValues?.participantIds ??
      members.filter((m) => m.userId).map((m) => m.id).slice(0, 1),
  );
  const [places, setPlaces] = useState<PlaceDraft[]>(
    defaultValues?.places?.length
      ? defaultValues.places
      : [{ key: crypto.randomUUID(), name: "", type: "city", notes: "" }],
  );

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

  const selectedCountries = countryCodes
    .map((code) => countries.find((country) => country.code === code))
    .filter((country): country is Country => Boolean(country));

  function addCountry(code: string) {
    setCountryCodes((previous) =>
      previous.includes(code) ? previous : [...previous, code],
    );
    setCountryQuery("");
  }

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <form action={action} className="space-y-6">
      {defaultValues?.tripId ? (
        <input type="hidden" name="tripId" value={defaultValues.tripId} />
      ) : null}
      <input
        type="hidden"
        name="countryCode"
        value={countryCodes[0] ?? ""}
        required
      />
      {countryCodes.map((code) => (
        <input key={code} type="hidden" name="countryCodes" value={code} />
      ))}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Title (optional)</span>
        <input
          name="title"
          className="field"
          placeholder="Summer in Serbia"
          defaultValue={defaultValues?.title ?? ""}
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm font-medium">Countries</span>
        {selectedCountries.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedCountries.map((country, index) => (
              <span
                key={country.code}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-sm"
              >
                <span>{country.flagEmoji}</span>
                {country.name}
                {index === 0 ? (
                  <span className="text-xs text-[var(--muted-foreground)]">
                    Primary
                  </span>
                ) : null}
                <button
                  type="button"
                  className="ml-0.5 text-[var(--muted-foreground)] hover:text-[var(--danger)]"
                  onClick={() =>
                    setCountryCodes((previous) =>
                      previous.filter((code) => code !== country.code),
                    )
                  }
                  aria-label={`Remove ${country.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <input
          value={countryQuery}
          onChange={(e) => setCountryQuery(e.target.value)}
          className="field"
          placeholder="Search and add countries…"
          aria-label="Search countries"
        />
        <ul className="max-h-48 overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--background)]">
          {filteredCountries.map((country) => {
            const selected = countryCodes.includes(country.code);
            return (
              <li key={country.code}>
                <button
                  type="button"
                  disabled={selected}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--muted)] disabled:cursor-default disabled:opacity-50"
                  onClick={() => addCountry(country.code)}
                >
                  <span>{country.flagEmoji}</span>
                  <span className="flex-1">{country.name}</span>
                  <span className="text-[var(--muted-foreground)]">
                    {selected ? "Added" : country.code}
                  </span>
                </button>
              </li>
            );
          })}
          {filteredCountries.length === 0 ? (
            <li className="px-3 py-3 text-sm text-[var(--muted-foreground)]">
              No matches
            </li>
          ) : null}
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Start date</span>
          <input
            type="date"
            name="startDate"
            required
            className="field"
            defaultValue={defaultValues?.startDate ?? ""}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">End date</span>
          <input
            type="date"
            name="endDate"
            required
            className="field"
            defaultValue={defaultValues?.endDate ?? ""}
          />
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Participants</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {members.map((member) => {
            const checked = participantIds.includes(member.id);
            return (
              <label
                key={member.id}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 ${
                  checked
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[var(--background)]"
                }`}
              >
                <input
                  type="checkbox"
                  name="participantIds"
                  value={member.id}
                  checked={checked}
                  onChange={() => toggleParticipant(member.id)}
                  className="sr-only"
                />
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: member.color }}
                  aria-hidden
                />
                <span className="text-sm">{member.displayName}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Places</span>
          <button
            type="button"
            className="text-sm text-[var(--accent)]"
            onClick={() =>
              setPlaces((prev) => [
                ...prev,
                {
                  key: crypto.randomUUID(),
                  name: "",
                  type: "city",
                  notes: "",
                },
              ])
            }
          >
            Add place
          </button>
        </div>
        <div className="space-y-2">
          {places.map((place, index) => (
            <div
              key={place.key}
              className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 sm:grid-cols-[1fr_8rem_auto]"
            >
              <input
                name="placeName"
                className="field"
                placeholder="City, place, or landmark"
                value={place.name}
                onChange={(e) =>
                  setPlaces((prev) =>
                    prev.map((p, i) =>
                      i === index ? { ...p, name: e.target.value } : p,
                    ),
                  )
                }
              />
              <select
                name="placeType"
                className="field"
                value={place.type}
                onChange={(e) =>
                  setPlaces((prev) =>
                    prev.map((p, i) =>
                      i === index ? { ...p, type: e.target.value } : p,
                    ),
                  )
                }
              >
                {PLACE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded-xl px-3 text-sm text-[var(--danger)]"
                onClick={() =>
                  setPlaces((prev) =>
                    prev.length === 1
                      ? [{ key: crypto.randomUUID(), name: "", type: "city", notes: "" }]
                      : prev.filter((_, i) => i !== index),
                  )
                }
              >
                Remove
              </button>
              <input type="hidden" name="placeNotes" value={place.notes} />
            </div>
          ))}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Notes</span>
        <textarea
          name="notes"
          rows={4}
          className="field resize-y"
          placeholder="Highlights, people we met, favorite meals…"
          defaultValue={defaultValues?.notes ?? ""}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Privacy</span>
        <select
          name="privacy"
          className="field"
          defaultValue={defaultValues?.privacy ?? "family"}
        >
          {TRIP_PRIVACY.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      {error ? (
        <p className="rounded-2xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      {countryCodes.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Select a country to enable saving.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || countryCodes.length === 0}
        className="btn-primary"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
