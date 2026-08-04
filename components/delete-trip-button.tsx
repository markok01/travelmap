import { deleteTripAction } from "@/lib/actions/trips";

export function DeleteTripButton({ tripId }: { tripId: string }) {
  return (
    <form action={deleteTripAction}>
      <input type="hidden" name="tripId" value={tripId} />
      <button
        type="submit"
        className="rounded-full border border-[var(--danger)] px-4 py-2 text-sm text-[var(--danger)] transition hover:bg-[var(--danger-soft)]"
      >
        Delete trip
      </button>
    </form>
  );
}
