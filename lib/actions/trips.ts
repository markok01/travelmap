"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getFamilyForUser } from "@/lib/actions/family";
import { getCountryByCode } from "@/lib/countries/queries";
import { db } from "@/lib/db";
import {
  PLACE_TYPES,
  TRIP_PRIVACY,
  tripParticipants,
  tripCountries,
  tripPlaces,
  trips,
  type PlaceType,
  type TripPrivacy,
} from "@/lib/db/schema";
import { getSession } from "@/lib/session";
import { isValidIsoDate } from "@/lib/trips/dates";
import { getTripById } from "@/lib/trips/queries";
import { geocodePlacesForCountry } from "@/lib/geo/geocode";

export type TripActionState = {
  error?: string;
  success?: boolean;
};

function createId() {
  return crypto.randomUUID();
}

function parsePlaces(formData: FormData) {
  const names = formData.getAll("placeName").map((v) => String(v).trim());
  const types = formData.getAll("placeType").map((v) => String(v).trim());
  const notes = formData.getAll("placeNotes").map((v) => String(v).trim());

  const places: { name: string; type: PlaceType; notes: string | null }[] = [];

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (!name) continue;
    const typeRaw = types[i] ?? "city";
    const type = PLACE_TYPES.includes(typeRaw as PlaceType)
      ? (typeRaw as PlaceType)
      : "city";
    places.push({
      name,
      type,
      notes: notes[i] ? notes[i] : null,
    });
  }

  return places;
}

function parseTripForm(formData: FormData) {
  const countryCodes = [
    ...new Set(
      formData
        .getAll("countryCodes")
        .map((value) => String(value).trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  const fallbackCountryCode = String(formData.get("countryCode") ?? "")
    .trim()
    .toUpperCase();
  if (countryCodes.length === 0 && fallbackCountryCode) {
    countryCodes.push(fallbackCountryCode);
  }
  const countryCode = countryCodes[0] ?? "";
  const title = String(formData.get("title") ?? "").trim() || null;
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const privacyRaw = String(formData.get("privacy") ?? "family").trim();
  const privacy = TRIP_PRIVACY.includes(privacyRaw as TripPrivacy)
    ? (privacyRaw as TripPrivacy)
    : "family";
  const participantIds = [
    ...new Set(
      formData
        .getAll("participantIds")
        .map((v) => String(v).trim())
        .filter(Boolean),
    ),
  ];
  const places = parsePlaces(formData);

  return {
    countryCode,
    countryCodes,
    title,
    startDate,
    endDate,
    notes,
    privacy,
    participantIds,
    places,
  };
}

async function requireFamilyContext() {
  const session = await getSession();
  if (!session?.user) {
    return { error: "You must be signed in." } as const;
  }

  const family = await getFamilyForUser(session.user.id);
  if (!family) {
    return { error: "Create a family first." } as const;
  }

  const membership = family.members.find((m) => m.userId === session.user.id);
  if (!membership) {
    return { error: "You are not a member of this family." } as const;
  }

  return { session, family, membership } as const;
}

async function validateTripInput(
  input: ReturnType<typeof parseTripForm>,
  familyMemberIds: Set<string>,
) {
  if (!input.countryCode) {
    return "Country is required.";
  }

  for (const countryCode of input.countryCodes) {
    const country = await getCountryByCode(countryCode);
    if (!country) {
      return "One or more selected countries were not found in the catalog.";
    }
  }

  if (!isValidIsoDate(input.startDate) || !isValidIsoDate(input.endDate)) {
    return "Start and end dates must be valid (YYYY-MM-DD).";
  }

  if (input.endDate < input.startDate) {
    return "End date must be on or after the start date.";
  }

  if (input.participantIds.length === 0) {
    return "Select at least one participant.";
  }

  for (const id of input.participantIds) {
    if (!familyMemberIds.has(id)) {
      return "One or more participants are not in your family.";
    }
  }

  return null;
}

function revalidateTripPaths(tripId?: string, countryCodes: string[] = []) {
  revalidatePath("/trips");
  revalidatePath("/dashboard");
  revalidatePath("/countries");
  revalidatePath("/map");
  revalidatePath("/timeline");
  revalidatePath("/stats");
  if (tripId) {
    revalidatePath(`/trips/${tripId}`);
    revalidatePath(`/trips/${tripId}/edit`);
  }
  for (const countryCode of countryCodes) {
    revalidatePath(`/countries/${countryCode}`);
  }
}

export async function createTripAction(
  _prev: TripActionState,
  formData: FormData,
): Promise<TripActionState> {
  const ctx = await requireFamilyContext();
  if ("error" in ctx) return { error: ctx.error };

  const input = parseTripForm(formData);
  const memberIds = new Set(ctx.family.members.map((m) => m.id));
  const validationError = await validateTripInput(input, memberIds);
  if (validationError) return { error: validationError };

  const now = new Date();
  const tripId = createId();

  await db.insert(trips).values({
    id: tripId,
    familyId: ctx.family.id,
    countryCode: input.countryCode,
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    notes: input.notes,
    privacy: input.privacy,
    createdByUserId: ctx.session.user.id,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(tripCountries).values(
    input.countryCodes.map((countryCode) => ({
      id: createId(),
      tripId,
      countryCode,
    })),
  );

  await db.insert(tripParticipants).values(
    input.participantIds.map((familyMemberId) => ({
      id: createId(),
      tripId,
      familyMemberId,
    })),
  );

  if (input.places.length > 0) {
    const geocoded = await geocodePlacesForCountry(
      input.places,
      input.countryCode,
    );
    await db.insert(tripPlaces).values(
      geocoded.map((place) => ({
        id: createId(),
        tripId,
        name: place.name,
        type: place.type,
        notes: place.notes,
        latitude: place.latitude,
        longitude: place.longitude,
        countryCode: place.countryCode,
      })),
    );
  }

  revalidateTripPaths(tripId, input.countryCodes);
  redirect(`/trips/${tripId}`);
}

export async function updateTripAction(
  _prev: TripActionState,
  formData: FormData,
): Promise<TripActionState> {
  const ctx = await requireFamilyContext();
  if ("error" in ctx) return { error: ctx.error };

  const tripId = String(formData.get("tripId") ?? "").trim();
  if (!tripId) return { error: "Trip id is missing." };

  const existing = await getTripById(tripId);
  if (!existing || existing.familyId !== ctx.family.id) {
    return { error: "Trip not found." };
  }
  if (
    existing.privacy === "private" &&
    existing.createdByUserId !== ctx.session.user.id
  ) {
    return { error: "Only the trip creator can edit a private trip." };
  }

  const input = parseTripForm(formData);
  const memberIds = new Set(ctx.family.members.map((m) => m.id));
  const validationError = await validateTripInput(input, memberIds);
  if (validationError) return { error: validationError };

  await db
    .update(trips)
    .set({
      countryCode: input.countryCode,
      title: input.title,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes,
      privacy: input.privacy,
      updatedAt: new Date(),
    })
    .where(and(eq(trips.id, tripId), eq(trips.familyId, ctx.family.id)));

  await db.delete(tripCountries).where(eq(tripCountries.tripId, tripId));
  await db.insert(tripCountries).values(
    input.countryCodes.map((countryCode) => ({
      id: createId(),
      tripId,
      countryCode,
    })),
  );

  await db.delete(tripParticipants).where(eq(tripParticipants.tripId, tripId));
  await db.insert(tripParticipants).values(
    input.participantIds.map((familyMemberId) => ({
      id: createId(),
      tripId,
      familyMemberId,
    })),
  );

  await db.delete(tripPlaces).where(eq(tripPlaces.tripId, tripId));
  if (input.places.length > 0) {
    const geocoded = await geocodePlacesForCountry(
      input.places,
      input.countryCode,
    );
    await db.insert(tripPlaces).values(
      geocoded.map((place) => ({
        id: createId(),
        tripId,
        name: place.name,
        type: place.type,
        notes: place.notes,
        latitude: place.latitude,
        longitude: place.longitude,
        countryCode: place.countryCode,
      })),
    );
  }

  revalidateTripPaths(tripId, [
    ...new Set([
      ...input.countryCodes,
      existing.countryCode,
      ...existing.countries.map((country) => country.countryCode),
    ]),
  ]);
  redirect(`/trips/${tripId}`);
}

export async function deleteTripAction(formData: FormData) {
  const ctx = await requireFamilyContext();
  if ("error" in ctx) {
    throw new Error(ctx.error);
  }

  const tripId = String(formData.get("tripId") ?? "").trim();
  const existing = await getTripById(tripId);
  if (!existing || existing.familyId !== ctx.family.id) {
    throw new Error("Trip not found.");
  }
  if (
    existing.privacy === "private" &&
    existing.createdByUserId !== ctx.session.user.id
  ) {
    throw new Error("Only the trip creator can delete a private trip.");
  }

  await db
    .delete(trips)
    .where(and(eq(trips.id, tripId), eq(trips.familyId, ctx.family.id)));

  revalidateTripPaths(tripId, [
    existing.countryCode,
    ...existing.countries.map((country) => country.countryCode),
  ]);
  redirect("/trips");
}
