import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { trips, type PlaceType } from "@/lib/db/schema";
import { canViewTrip, type TripViewer } from "@/lib/trips/privacy";

export type MapPin = {
  id: string;
  name: string;
  type: PlaceType;
  latitude: number;
  longitude: number;
  countryCode: string;
  tripId: string;
  tripTitle: string | null;
  tripStartDate: string;
  tripEndDate: string;
  /** Display color for the pin (member or shared). */
  color: string;
  participants: { id: string; displayName: string; color: string }[];
};

export type MapTripCard = {
  id: string;
  title: string | null;
  countryCode: string;
  countryCodes: string[];
  countryName: string;
  countryFlag: string | null;
  startDate: string;
  endDate: string;
  notes: string | null;
  places: {
    id: string;
    name: string;
    type: PlaceType;
    latitude: number | null;
    longitude: number | null;
    countryCode: string | null;
  }[];
  participants: { id: string; displayName: string; color: string }[];
};

function pinColor(
  participants: { color: string }[],
): string {
  if (participants.length === 1) return participants[0].color;
  if (participants.length === 2) return "#C4875A";
  return "#2F6F6A";
}

/** Places with coordinates for map pins. */
export async function getFamilyMapPins(
  familyId: string,
  viewer?: TripViewer,
): Promise<MapPin[]> {
  const familyTrips = await db.query.trips.findMany({
    where: eq(trips.familyId, familyId),
    with: {
      places: true,
      participants: { with: { member: true } },
    },
  });

  const pins: MapPin[] = [];

  for (const trip of familyTrips) {
    if (viewer && !canViewTrip(trip, viewer)) continue;
    const participants = trip.participants
      .map((p) => p.member)
      .filter(Boolean)
      .map((m) => ({
        id: m.id,
        displayName: m.displayName,
        color: m.color,
      }));

    const color = pinColor(participants);

    for (const place of trip.places) {
      if (
        place.latitude == null ||
        place.longitude == null ||
        !Number.isFinite(place.latitude) ||
        !Number.isFinite(place.longitude)
      ) {
        continue;
      }

      pins.push({
        id: place.id,
        name: place.name,
        type: place.type,
        latitude: place.latitude,
        longitude: place.longitude,
        countryCode: place.countryCode ?? trip.countryCode,
        tripId: trip.id,
        tripTitle: trip.title,
        tripStartDate: trip.startDate,
        tripEndDate: trip.endDate,
        color,
        participants,
      });
    }
  }

  return pins;
}

/** Trip summaries for map side panel (by country or all). */
export async function getFamilyMapTrips(
  familyId: string,
  countryCode?: string | null,
  viewer?: TripViewer,
): Promise<MapTripCard[]> {
  const code = countryCode?.trim().toUpperCase() || null;

  const familyTrips = await db.query.trips.findMany({
    where: eq(trips.familyId, familyId),
    with: {
      country: true,
      countries: true,
      places: true,
      participants: { with: { member: true } },
    },
    orderBy: (t, { desc }) => [desc(t.startDate)],
  });

  return familyTrips
    .filter((trip) => {
      if (viewer && !canViewTrip(trip, viewer)) return false;
      if (!code) return true;
      return (
        trip.countryCode === code ||
        trip.countries.some((country) => country.countryCode === code) ||
        trip.places.some((place) => place.countryCode === code)
      );
    })
    .map((trip) => ({
    id: trip.id,
    title: trip.title,
    countryCode: trip.countryCode,
    countryCodes: [
      ...new Set([
        trip.countryCode,
        ...trip.countries.map((country) => country.countryCode),
      ]),
    ],
    countryName: trip.country.name,
    countryFlag: trip.country.flagEmoji,
    startDate: trip.startDate,
    endDate: trip.endDate,
    notes: trip.notes,
    places: trip.places.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      latitude: p.latitude,
      longitude: p.longitude,
      countryCode: p.countryCode,
    })),
    participants: trip.participants
      .map((p) => p.member)
      .filter(Boolean)
      .map((m) => ({
        id: m.id,
        displayName: m.displayName,
        color: m.color,
      })),
  }));
}
