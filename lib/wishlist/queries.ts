import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { wishlistItems } from "@/lib/db/schema";

export async function getWishlistForFamily(familyId: string) {
  return db.query.wishlistItems.findMany({
    where: eq(wishlistItems.familyId, familyId),
    with: {
      country: true,
    },
    orderBy: [asc(wishlistItems.createdAt)],
  });
}
