"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getFamilyForUser } from "@/lib/actions/family";
import { db } from "@/lib/db";
import { familyShares } from "@/lib/db/schema";
import { getSession } from "@/lib/session";
import { getOrCreateShareForFamily } from "@/lib/share/queries";

export type ShareActionState = {
  error?: string;
  success?: boolean;
  token?: string;
};

function createToken() {
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
}

async function requireFamilyOwner() {
  const session = await getSession();
  if (!session?.user) return { error: "You must be signed in." } as const;

  const family = await getFamilyForUser(session.user.id);
  const membership = family?.members.find((member) => member.userId === session.user.id);
  if (!family || membership?.role !== "owner") {
    return { error: "Only the family owner can manage sharing." } as const;
  }
  return { family } as const;
}

export async function enableFamilyShareAction(): Promise<ShareActionState> {
  const context = await requireFamilyOwner();
  if ("error" in context) return context;

  const share = await getOrCreateShareForFamily(context.family.id);
  await db
    .update(familyShares)
    .set({ enabled: true, updatedAt: new Date() })
    .where(eq(familyShares.id, share.id));

  revalidatePath("/settings");
  revalidatePath(`/share/${share.token}`);
  return { success: true, token: share.token };
}

export async function rotateFamilyShareAction(): Promise<ShareActionState> {
  const context = await requireFamilyOwner();
  if ("error" in context) return context;

  const share = await getOrCreateShareForFamily(context.family.id);
  const token = createToken();
  await db
    .update(familyShares)
    .set({ token, enabled: true, updatedAt: new Date() })
    .where(eq(familyShares.id, share.id));

  revalidatePath("/settings");
  revalidatePath(`/share/${share.token}`);
  revalidatePath(`/share/${token}`);
  return { success: true, token };
}

export async function disableFamilyShareAction(): Promise<ShareActionState> {
  const context = await requireFamilyOwner();
  if ("error" in context) return context;

  const share = await db.query.familyShares.findFirst({
    where: eq(familyShares.familyId, context.family.id),
  });
  if (!share) return { success: true };

  await db
    .update(familyShares)
    .set({ enabled: false, updatedAt: new Date() })
    .where(eq(familyShares.id, share.id));

  revalidatePath("/settings");
  revalidatePath(`/share/${share.token}`);
  return { success: true };
}
