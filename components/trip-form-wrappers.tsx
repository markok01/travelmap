"use client";

import { useActionState } from "react";
import {
  createTripAction,
  updateTripAction,
  type TripActionState,
} from "@/lib/actions/trips";
import type { Country, FamilyMember } from "@/lib/db/schema";
import { FirstTripWizard } from "@/components/first-trip-wizard";
import { OfflineWriteGuard } from "@/components/offline-write-guard";
import { TripForm } from "@/components/trip-form";
import { useT } from "@/components/language-provider";

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
    <OfflineWriteGuard>
      <FirstTripWizard
        countries={countries}
        members={members}
        defaultCountryCode={defaultCountryCode}
      />
    </OfflineWriteGuard>
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
  const t = useT();
  const [state, formAction, pending] = useActionState(
    createTripAction,
    initialState,
  );

  return (
    <OfflineWriteGuard>
      <TripForm
        action={formAction}
        countries={countries}
        members={members}
        defaultValues={{
          countryCode: defaultCountryCode ?? "",
          privacy: "family",
        }}
        submitLabel={t("trips.create")}
        error={state.error}
        pending={pending}
      />
    </OfflineWriteGuard>
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
    places: {
      key: string;
      name: string;
      type: string;
      notes: string;
      latitude?: number | null;
      longitude?: number | null;
      countryCode?: string | null;
      pinned?: boolean;
    }[];
  };
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    updateTripAction,
    initialState,
  );

  return (
    <OfflineWriteGuard>
      <TripForm
        action={formAction}
        countries={countries}
        members={members}
        defaultValues={{ tripId, ...defaults }}
        submitLabel={t("trips.saveChanges")}
        error={state.error}
        pending={pending}
      />
    </OfflineWriteGuard>
  );
}
