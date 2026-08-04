"use client";

import { useActionState } from "react";
import {
  createTripAction,
  updateTripAction,
  type TripActionState,
} from "@/lib/actions/trips";
import type { Country, FamilyMember } from "@/lib/db/schema";
import { FirstTripWizard } from "@/components/first-trip-wizard";
import { TripForm } from "@/components/trip-form";

const initialState: TripActionState = {};

export function CreateTripWizard({
  countries,
  members,
  defaultCountryCode,
}: {
  countries: Country[];
  members: FamilyMember[];
  defaultCountryCode?: string;
}) {
  return (
    <FirstTripWizard
      countries={countries}
      members={members}
      defaultCountryCode={defaultCountryCode}
    />
  );
}

export function CreateTripForm({
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

  return (
    <TripForm
      action={formAction}
      countries={countries}
      members={members}
      defaultValues={{
        countryCode: defaultCountryCode ?? "",
        privacy: "family",
      }}
      submitLabel="Create trip"
      error={state.error}
      pending={pending}
    />
  );
}

export function EditTripForm({
  countries,
  members,
  tripId,
  defaults,
}: {
  countries: Country[];
  members: FamilyMember[];
  tripId: string;
  defaults: {
    countryCode: string;
    countryCodes: string[];
    title: string;
    startDate: string;
    endDate: string;
    notes: string;
    privacy: string;
    participantIds: string[];
    places: { key: string; name: string; type: string; notes: string }[];
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateTripAction,
    initialState,
  );

  return (
    <TripForm
      action={formAction}
      countries={countries}
      members={members}
      defaultValues={{ tripId, ...defaults }}
      submitLabel="Save changes"
      error={state.error}
      pending={pending}
    />
  );
}
