import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { countries, trips } from "../lib/db/schema";
import {
  EXCLUDED_COUNTRY_CODES,
  mapToContinent,
  nativeCommonName,
  TRAVEL_EXTRA_CODES,
} from "../lib/countries/utils";

type WorldCountry = {
  cca2: string;
  unMember?: boolean;
  flag?: string;
  latlng?: [number, number];
  region: string;
  subregion?: string;
  name: {
    common: string;
    native?: Record<string, { common?: string }>;
  };
};

async function seedCountries() {
  const worldCountries = (await import("world-countries"))
    .default as WorldCountry[];

  const rows = worldCountries
    .filter(
      (c) =>
        !EXCLUDED_COUNTRY_CODES.has(c.cca2) &&
        (c.unMember || TRAVEL_EXTRA_CODES.has(c.cca2)),
    )
    .map((c) => ({
      code: c.cca2,
      name: c.name.common,
      nativeName: nativeCommonName(c.name.native),
      continent: mapToContinent(c.region, c.subregion),
      region: c.subregion ?? c.region,
      latitude: c.latlng?.[0] ?? null,
      longitude: c.latlng?.[1] ?? null,
      flagEmoji: c.flag ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  await db
    .insert(countries)
    .values(rows)
    .onDuplicateKeyUpdate({
      set: {
        name: sql`VALUES(name)`,
        nativeName: sql`VALUES(native_name)`,
        continent: sql`VALUES(continent)`,
        region: sql`VALUES(region)`,
        latitude: sql`VALUES(latitude)`,
        longitude: sql`VALUES(longitude)`,
        flagEmoji: sql`VALUES(flag_emoji)`,
      },
    });

  // Move any Kosovo trips under Serbia, then drop XK from catalog
  await db
    .update(trips)
    .set({ countryCode: "RS" })
    .where(eq(trips.countryCode, "XK"));
  await db.delete(countries).where(eq(countries.code, "XK"));

  console.log(`Upserted ${rows.length} countries (Kosovo excluded → Serbia).`);
  const byContinent = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.continent] = (acc[row.continent] ?? 0) + 1;
    return acc;
  }, {});
  console.table(byContinent);
}

seedCountries()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
