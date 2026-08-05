import { CountriesCatalog } from "@/components/countries-catalog";
import { CountriesPageHeader } from "@/components/countries-page-header";
import { getCountries, getCountryCount } from "@/lib/countries/queries";

export default async function CountriesPage() {
  const [list, count] = await Promise.all([getCountries(), getCountryCount()]);

  return (
    <div className="space-y-6">
      <CountriesPageHeader count={count} />

      <CountriesCatalog countries={list} />
    </div>
  );
}
