import { CountriesCatalog } from "@/components/countries-catalog";
import { getCountries, getCountryCount } from "@/lib/countries/queries";

export default async function CountriesPage() {
  const [list, count] = await Promise.all([getCountries(), getCountryCount()]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Catalog
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
          Countries
        </h1>
        <p className="mt-2 max-w-xl text-[var(--muted-foreground)]">
          {count} destinations ready for trips and the map — UN members plus
          common travel entries (Palestine, Taiwan).
        </p>
      </div>

      <CountriesCatalog countries={list} />
    </div>
  );
}
