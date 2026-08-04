import Link from "next/link";
import { getFamilyForUser } from "@/lib/actions/family";
import {
  CreateTripForm,
  CreateTripWizard,
} from "@/components/trip-form-wrappers";
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
  const querySuffix = countryCode ? `&country=${countryCode}` : "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            New entry
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Add trip
          </h1>
        </div>
        <Link href="/trips" className="btn-secondary">
          Cancel
        </Link>
      </div>

      {useFullForm ? (
        <>
          <p className="text-sm text-[var(--muted-foreground)]">
            <Link
              href={`/trips/new${countryCode ? `?country=${countryCode}` : ""}`}
              className="text-[var(--accent)] hover:underline"
            >
              Use step-by-step wizard
            </Link>
          </p>
          <CreateTripForm
            countries={countries}
            members={family.members}
            defaultCountryCode={countryCode}
          />
        </>
      ) : (
        <>
          <p className="text-sm text-[var(--muted-foreground)]">
            <Link
              href={`/trips/new?form=full${querySuffix}`}
              className="text-[var(--accent)] hover:underline"
            >
              Use full form
            </Link>
          </p>
          <CreateTripWizard
            countries={countries}
            members={family.members}
            defaultCountryCode={countryCode}
          />
        </>
      )}
    </div>
  );
}
