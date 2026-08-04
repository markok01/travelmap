import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { familyShares } from "@/lib/db/schema";

export async function getShareByToken(token: string) {
  return db.query.familyShares.findFirst({
    where: and(eq(familyShares.token, token), eq(familyShares.enabled, true)),
    with: {
      family: {
        with: {
          members: true,
        },
      },
    },
  });
}

export async function getShareForFamily(familyId: string) {
  return db.query.familyShares.findFirst({
    where: eq(familyShares.familyId, familyId),
  });
}

export async function getOrCreateShareForFamily(familyId: string) {
  const existing = await db.query.familyShares.findFirst({
    where: eq(familyShares.familyId, familyId),
  });
  if (existing) return existing;

  const now = new Date();
  const share = {
    id: crypto.randomUUID(),
    familyId,
    token: crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", ""),
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(familyShares).values(share);
  return share;
}
