import {
  CreateTripForm,
  CreateTripWizard,
} from "@/components/trip-form-wrappers";
import { NewTripPageHeader } from "@/components/new-trip-page-header";
import { getFamilyForUser } from "@/lib/actions/family";
import { getCountries } from "@/lib/countries/queries";
import { getSession } from "@/lib/session";

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; form?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const family = await getFamilyForUser(session.user.id);
  if (!family) return null;

  const params = await searchParams;
  const countries = await getCountries();
  const useFullForm = params.form === "full";
  const countryCode = params.country?.toUpperCase();

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl space-y-6">
      <NewTripPageHeader
        useFullForm={useFullForm}
        countryCode={countryCode}
      />
      {useFullForm ? (
        <CreateTripForm
          countries={countries}
          members={family.members}
          defaultCountryCode={countryCode}
        />
      ) : (
        <CreateTripWizard
          countries={countries}
          members={family.members}
          defaultCountryCode={countryCode}
        />
      )}
    </div>
  );
}
