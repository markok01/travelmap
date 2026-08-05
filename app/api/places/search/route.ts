import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/geo/geocode";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const countryCode = searchParams.get("countryCode")?.trim() || null;

  if (q.length < 2) {
    return NextResponse.json({ count: 0, data: [] });
  }

  try {
    const data = await searchPlaces(q, countryCode, 6);
    return NextResponse.json(
      { count: data.length, data },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Place search failed.", count: 0, data: [] },
      { status: 502 },
    );
  }
}
