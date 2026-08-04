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
  /** How many logged visits (trips/places) for this city. */
  visitCount: number;
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

function pinColor(participants: { color: string }[]): string {
  if (participants.length === 1) return participants[0].color;
  if (participants.length === 2) return "#C4875A";
  return "#2F6F6A";
}

function placeKey(countryCode: string, name: string) {
  return `${countryCode}|${name.trim().toLowerCase()}`;
}

/**
 * Places with coordinates for map pins.
 * Same city across trips is merged into one pin with visitCount.
 */
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
    orderBy: (t, { desc }) => [desc(t.startDate)],
  });

  type Acc = {
    pin: MapPin;
    latSum: number;
    lngSum: number;
    samples: number;
    participantMap: Map<string, { id: string; displayName: string; color: string }>;
  };

  const byCity = new Map<string, Acc>();

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

    for (const place of trip.places) {
      if (
        place.latitude == null ||
        place.longitude == null ||
        !Number.isFinite(place.latitude) ||
        !Number.isFinite(place.longitude)
      ) {
        continue;
      }

      const countryCode = place.countryCode ?? trip.countryCode;
      const key = placeKey(countryCode, place.name);
      const existing = byCity.get(key);

      if (!existing) {
        const participantMap = new Map(
          participants.map((p) => [p.id, p] as const),
        );
        byCity.set(key, {
          latSum: place.latitude,
          lngSum: place.longitude,
          samples: 1,
          participantMap,
          pin: {
            id: place.id,
            name: place.name.trim(),
            type: place.type,
            latitude: place.latitude,
            longitude: place.longitude,
            countryCode,
            tripId: trip.id,
            tripTitle: trip.title,
            tripStartDate: trip.startDate,
            tripEndDate: trip.endDate,
            visitCount: 1,
            color: pinColor(participants),
            participants,
          },
        });
        continue;
      }

      existing.latSum += place.latitude;
      existing.lngSum += place.longitude;
      existing.samples += 1;
      existing.pin.visitCount += 1;
      for (const p of participants) existing.participantMap.set(p.id, p);
      // Keep most recent trip as the pin's primary trip (trips ordered desc)
    }
  }

  return [...byCity.values()].map((entry) => {
    const participants = [...entry.participantMap.values()];
    return {
      ...entry.pin,
      latitude: entry.latSum / entry.samples,
      longitude: entry.lngSum / entry.samples,
      color: pinColor(participants),
      participants,
    };
  });
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
