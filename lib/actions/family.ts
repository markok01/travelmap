"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { families, familyMembers } from "@/lib/db/schema";
import { nextMemberColor } from "@/lib/member-colors";
import { getSession } from "@/lib/session";

function createId() {
  return crypto.randomUUID();
}

export async function getFamilyForUser(userId: string) {
  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, userId),
    with: {
      family: {
        with: {
          members: true,
        },
      },
    },
  });

  return membership?.family ?? null;
}

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function createFamilyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session?.user) {
    return { error: "You must be signed in." };
  }

  const existing = await getFamilyForUser(session.user.id);
  if (existing) {
    redirect("/dashboard");
  }

  const familyName = String(formData.get("familyName") ?? "").trim();
  const displayName =
    String(formData.get("displayName") ?? "").trim() || session.user.name;

  const extraMembers = [1, 2, 3]
    .map((i) => ({
      name: String(formData.get(`memberName${i}`) ?? "").trim(),
      email: String(formData.get(`memberEmail${i}`) ?? "").trim() || null,
    }))
    .filter((m) => m.name.length > 0);

  if (!familyName) {
    return { error: "Family name is required." };
  }

  const now = new Date();
  const familyId = createId();

  await db.insert(families).values({
    id: familyId,
    name: familyName,
    createdAt: now,
  });

  await db.insert(familyMembers).values({
    id: createId(),
    familyId,
    userId: session.user.id,
    role: "owner",
    displayName,
    color: nextMemberColor(0),
    inviteEmail: session.user.email,
    createdAt: now,
  });

  for (const [index, member] of extraMembers.entries()) {
    await db.insert(familyMembers).values({
      id: createId(),
      familyId,
      userId: null,
      role: "member",
      displayName: member.name,
      color: nextMemberColor(index + 1),
      inviteEmail: member.email,
      createdAt: now,
    });
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateFamilyNameAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session?.user) {
    return { error: "You must be signed in." };
  }

  const family = await getFamilyForUser(session.user.id);
  if (!family) {
    return { error: "Create a family first." };
  }

  const ownership = family.members.find(
    (m) => m.userId === session.user.id && m.role === "owner",
  );
  if (!ownership) {
    return { error: "Only the family owner can rename the family." };
  }

  const name = String(formData.get("familyName") ?? "").trim();
  if (!name) {
    return { error: "Family name is required." };
  }
  if (name.length > 255) {
    return { error: "Family name is too long." };
  }

  if (name === family.name) {
    return { success: true };
  }

  await db
    .update(families)
    .set({ name })
    .where(eq(families.id, family.id));

  revalidateFamilyPaths();
  return { success: true };
}

export async function addFamilyMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session?.user) {
    return { error: "You must be signed in." };
  }

  const family = await getFamilyForUser(session.user.id);
  if (!family) {
    return { error: "Create a family first." };
  }

  const ownership = family.members.find(
    (m) => m.userId === session.user.id && m.role === "owner",
  );
  if (!ownership) {
    return { error: "Only the family owner can add members." };
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  const inviteEmail = String(formData.get("inviteEmail") ?? "").trim() || null;

  if (!displayName) {
    return { error: "Display name is required." };
  }

  if (inviteEmail) {
    const duplicate = family.members.find(
      (m) =>
        m.inviteEmail &&
        m.inviteEmail.toLowerCase() === inviteEmail.toLowerCase(),
    );
    if (duplicate) {
      return {
        error: `${inviteEmail} is already invited in this family.`,
      };
    }
  }

  await db.insert(familyMembers).values({
    id: createId(),
    familyId: family.id,
    userId: null,
    role: "member",
    displayName,
    color: nextMemberColor(family.members.length),
    inviteEmail,
    createdAt: new Date(),
  });

  revalidateFamilyPaths();
  return { success: true };
}

export async function removeFamilyMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session?.user) {
    return { error: "You must be signed in." };
  }

  const family = await getFamilyForUser(session.user.id);
  if (!family) {
    return { error: "Create a family first." };
  }

  const ownership = family.members.find(
    (m) => m.userId === session.user.id && m.role === "owner",
  );
  if (!ownership) {
    return { error: "Only the family owner can remove members." };
  }

  const memberId = String(formData.get("memberId") ?? "").trim();
  if (!memberId) {
    return { error: "Member is required." };
  }

  const target = family.members.find((m) => m.id === memberId);
  if (!target) {
    return { error: "Member not found." };
  }

  if (target.role === "owner") {
    return { error: "The family owner cannot be removed." };
  }

  if (target.userId === session.user.id) {
    return { error: "You cannot remove yourself." };
  }

  await db.delete(familyMembers).where(eq(familyMembers.id, memberId));

  revalidateFamilyPaths();
  return { success: true };
}

function revalidateFamilyPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/map");
  revalidatePath("/stats");
  revalidatePath("/timeline");
  revalidatePath("/trips");
}
