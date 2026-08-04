import { NextResponse } from "next/server";
import { getCountries } from "@/lib/countries/queries";
import { CONTINENTS } from "@/lib/db/schema";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const continent = searchParams.get("continent");
  const q = searchParams.get("q");

  if (
    continent &&
    !CONTINENTS.some((c) => c.toLowerCase() === continent.toLowerCase())
  ) {
    return NextResponse.json(
      {
        error: `Invalid continent. Use one of: ${CONTINENTS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const data = await getCountries({ continent, q });
  return NextResponse.json({ count: data.length, data });
}
