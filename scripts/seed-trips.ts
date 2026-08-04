import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  families,
  familyMembers,
  tripCountries,
  tripParticipants,
  tripPlaces,
  trips,
  user,
} from "../lib/db/schema";
import { geocodePlace } from "../lib/geo/geocode";

async function seedTrips() {
  const demoUser = await db.query.user.findFirst({
    where: eq(user.email, "demo@familytravel.app"),
  });

  if (!demoUser) {
    console.log("Demo user not found. Run npm run db:seed first.");
    return;
  }

  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, demoUser.id),
  });

  if (!membership) {
    console.log("Demo family membership not found.");
    return;
  }

  const family = await db.query.families.findFirst({
    where: eq(families.id, membership.familyId),
    with: { members: true },
  });

  if (!family) return;

  const existing = await db.query.trips.findFirst({
    where: eq(trips.familyId, family.id),
  });

  if (existing) {
    console.log("Demo trips already exist — backfilling countries and place coordinates…");
    await backfillTripCountries(family.id);
    await backfillPlaceCoords(family.id);
    return;
  }

  const alex = family.members.find((m) => m.displayName.includes("Alex"));
  const sam = family.members.find((m) => m.displayName.includes("Sam"));
  const jordan = family.members.find((m) => m.displayName.includes("Jordan"));

  if (!alex) {
    console.log("Could not find Alex member.");
    return;
  }

  const now = new Date();

  const samples = [
    {
      countryCode: "RS",
      title: "Belgrade long weekend",
      startDate: "2024-05-10",
      endDate: "2024-05-13",
      notes: "Kalemegdan at sunset and too much burek.",
      participants: [alex, sam].filter(Boolean).map((m) => m!.id),
      places: [
        { name: "Belgrade", type: "city" as const },
        { name: "Kalemegdan", type: "landmark" as const },
      ],
    },
    {
      countryCode: "IT",
      title: "Rome with the kids",
      startDate: "2023-08-02",
      endDate: "2023-08-09",
      notes: "Colosseum, gelato every evening.",
      participants: [alex, sam, jordan].filter(Boolean).map((m) => m!.id),
      places: [
        { name: "Rome", type: "city" as const },
        { name: "Colosseum", type: "landmark" as const },
        { name: "Trastevere", type: "place" as const },
      ],
    },
    {
      countryCode: "JP",
      title: "Tokyo spring",
      startDate: "2025-03-18",
      endDate: "2025-03-28",
      notes: "Cherry blossoms in Ueno Park.",
      participants: [alex.id],
      places: [
        { name: "Tokyo", type: "city" as const },
        { name: "Kyoto", type: "city" as const },
      ],
    },
  ];

  for (const sample of samples) {
    const tripId = crypto.randomUUID();
    await db.insert(trips).values({
      id: tripId,
      familyId: family.id,
      countryCode: sample.countryCode,
      title: sample.title,
      startDate: sample.startDate,
      endDate: sample.endDate,
      notes: sample.notes,
      privacy: "family",
      createdByUserId: demoUser.id,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(tripCountries).values({
      id: crypto.randomUUID(),
      tripId,
      countryCode: sample.countryCode,
    });

    await db.insert(tripParticipants).values(
      sample.participants.map((familyMemberId) => ({
        id: crypto.randomUUID(),
        tripId,
        familyMemberId,
      })),
    );

    for (const place of sample.places) {
      const point = await geocodePlace(place.name, sample.countryCode);
      await db.insert(tripPlaces).values({
        id: crypto.randomUUID(),
        tripId,
        name: place.name,
        type: place.type,
        notes: null,
        latitude: point?.latitude ?? null,
        longitude: point?.longitude ?? null,
        countryCode: sample.countryCode,
      });
    }
  }

  console.log(`Seeded ${samples.length} demo trips with place pins.`);
}

async function backfillTripCountries(familyId: string) {
  const familyTrips = await db.query.trips.findMany({
    where: eq(trips.familyId, familyId),
    with: { countries: true },
  });

  const missing = familyTrips.filter(
    (trip) =>
      !trip.countries.some(
        (country) => country.countryCode === trip.countryCode,
      ),
  );
  if (missing.length > 0) {
    await db.insert(tripCountries).values(
      missing.map((trip) => ({
        id: crypto.randomUUID(),
        tripId: trip.id,
        countryCode: trip.countryCode,
      })),
    );
  }
  console.log(`Backfilled primary countries on ${missing.length} trip(s).`);
}

async function backfillPlaceCoords(familyId: string) {
  const familyTrips = await db.query.trips.findMany({
    where: eq(trips.familyId, familyId),
    with: { places: true },
  });

  let updated = 0;
  for (const trip of familyTrips) {
    for (const place of trip.places) {
      if (place.latitude != null && place.longitude != null) continue;
      const point = await geocodePlace(place.name, trip.countryCode);
      if (!point) continue;
      await db
        .update(tripPlaces)
        .set({
          latitude: point.latitude,
          longitude: point.longitude,
          countryCode: trip.countryCode,
        })
        .where(eq(tripPlaces.id, place.id));
      updated += 1;
    }
  }
  console.log(`Backfilled coordinates on ${updated} place(s).`);
}

seedTrips()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
