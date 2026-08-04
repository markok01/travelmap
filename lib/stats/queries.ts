import { getCountries } from "@/lib/countries/queries";
import type { StatsMember, StatsTrip } from "@/lib/stats/compute";
import { getTripsForFamily } from "@/lib/trips/queries";
import type { TripViewer } from "@/lib/trips/privacy";

export async function getStatsTripsForFamily(
  familyId: string,
  viewer?: TripViewer,
): Promise<StatsTrip[]> {
  const trips = await getTripsForFamily(familyId, {}, viewer);

  return trips.map((trip) => ({
    id: trip.id,
    countryCode: trip.countryCode,
    countryName: trip.country.name,
    continent: trip.country.continent,
    flagEmoji: trip.country.flagEmoji,
    countries: [
      {
        code: trip.country.code,
        name: trip.country.name,
        continent: trip.country.continent,
        flagEmoji: trip.country.flagEmoji,
      },
      ...trip.countries
        .map((tripCountry) => tripCountry.country)
        .filter((country) => country.code !== trip.country.code)
        .map((country) => ({
          code: country.code,
          name: country.name,
          continent: country.continent,
          flagEmoji: country.flagEmoji,
        })),
    ],
    title: trip.title,
    startDate: trip.startDate,
    endDate: trip.endDate,
    participantIds: trip.participants.map((p) => p.familyMemberId),
    cities: trip.places
      .filter((p) => p.type === "city")
      .map((p) => p.name),
    places: trip.places.map((p) => p.name),
  }));
}

export async function getStatsCatalogSize() {
  const countries = await getCountries();
  return countries.length;
}

export function toStatsMembers(
  members: { id: string; displayName: string; color: string }[],
): StatsMember[] {
  return members.map((m) => ({
    id: m.id,
    displayName: m.displayName,
    color: m.color,
  }));
}
