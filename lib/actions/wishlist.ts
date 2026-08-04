"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getFamilyForUser } from "@/lib/actions/family";
import { getCountryByCode } from "@/lib/countries/queries";
import { db } from "@/lib/db";
import { wishlistItems } from "@/lib/db/schema";
import { getSession } from "@/lib/session";

export type WishlistActionState = { error?: string; success?: boolean };

async function requireFamilyMembership() {
  const session = await getSession();
  if (!session?.user) return { error: "You must be signed in." } as const;

  const family = await getFamilyForUser(session.user.id);
  if (!family) return { error: "Create a family first." } as const;

  const member = family.members.find((item) => item.userId === session.user.id);
  if (!member) return { error: "You are not a member of this family." } as const;

  return { family, userId: session.user.id } as const;
}

function revalidateWishlistPaths() {
  revalidatePath("/map");
  revalidatePath("/settings");
  revalidatePath("/countries");
}

export async function addWishlistItemAction(
  countryCode: string,
  note?: string,
): Promise<WishlistActionState> {
  const context = await requireFamilyMembership();
  if ("error" in context) return context;

  const code = countryCode.trim().toUpperCase();
  if (!code) return { error: "Choose a country first." };
  if (!(await getCountryByCode(code))) {
    return { error: "Selected country was not found in the catalog." };
  }

  const existing = await db.query.wishlistItems.findFirst({
    where: and(
      eq(wishlistItems.familyId, context.family.id),
      eq(wishlistItems.countryCode, code),
    ),
  });
  if (existing) return { error: "That country is already on your wishlist." };

  await db.insert(wishlistItems).values({
    id: crypto.randomUUID(),
    familyId: context.family.id,
    countryCode: code,
    note: note?.trim() || null,
    createdByUserId: context.userId,
    createdAt: new Date(),
  });

  revalidateWishlistPaths();
  return { success: true };
}

export async function removeWishlistItemAction(
  countryCodeOrId: string,
): Promise<WishlistActionState> {
  const context = await requireFamilyMembership();
  if ("error" in context) return context;

  const value = countryCodeOrId.trim();
  if (!value) return { error: "Wishlist item is missing." };

  await db
    .delete(wishlistItems)
    .where(
      and(
        eq(wishlistItems.familyId, context.family.id),
        or(
          eq(wishlistItems.id, value),
          eq(wishlistItems.countryCode, value.toUpperCase()),
        ),
      ),
    );

  revalidateWishlistPaths();
  return { success: true };
}
