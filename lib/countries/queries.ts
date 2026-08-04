import { and, asc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { CONTINENTS, countries, type Continent } from "@/lib/db/schema";

export type CountryFilters = {
  continent?: Continent | string | null;
  q?: string | null;
};

function normalizeContinent(value?: string | null): Continent | null {
  if (!value) return null;
  const match = CONTINENTS.find(
    (c) => c.toLowerCase() === value.toLowerCase(),
  );
  return match ?? null;
}

export async function getCountries(filters: CountryFilters = {}) {
  const continent = normalizeContinent(filters.continent);
  const q = filters.q?.trim();

  const conditions = [];

  if (continent) {
    conditions.push(eq(countries.continent, continent));
  }

  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        like(countries.name, pattern),
        like(countries.code, `%${q.toUpperCase()}%`),
        like(countries.nativeName, pattern),
      ),
    );
  }

  return db
    .select()
    .from(countries)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(countries.name));
}

export async function getCountryByCode(code: string) {
  const normalized = code.trim().toUpperCase();
  const [country] = await db
    .select()
    .from(countries)
    .where(eq(countries.code, normalized))
    .limit(1);
  return country ?? null;
}

export async function getCountriesByContinent(continent: Continent | string) {
  return getCountries({ continent });
}

export async function getCountryCount() {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(countries);
  return Number(row?.count ?? 0);
}
