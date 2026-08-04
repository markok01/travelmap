import "dotenv/config";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db";
import { families, familyMembers, user } from "../lib/db/schema";
import { nextMemberColor } from "../lib/member-colors";

const DEMO = {
  email: "demo@familytravel.app",
  password: "demo1234",
  name: "Alex Rivera",
  familyName: "Rivera Family",
  members: [
    { name: "Alex Rivera", email: "demo@familytravel.app", linked: true },
    { name: "Sam Rivera", email: "sam@familytravel.app", linked: false },
    { name: "Jordan Rivera", email: null, linked: false },
  ],
};

async function seed() {
  const existing = await db.query.user.findFirst({
    where: eq(user.email, DEMO.email),
  });

  let userId = existing?.id;

  if (!userId) {
    const result = await auth.api.signUpEmail({
      body: {
        email: DEMO.email,
        password: DEMO.password,
        name: DEMO.name,
      },
    });
    userId = result.user.id;
    console.log("Created demo user:", DEMO.email);
  } else {
    console.log("Demo user already exists:", DEMO.email);
  }

  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, userId),
  });

  if (membership) {
    console.log("Demo family already exists. Skipping.");
    console.log("Login with:", DEMO.email, "/", DEMO.password);
    return;
  }

  const now = new Date();
  const familyId = crypto.randomUUID();

  await db.insert(families).values({
    id: familyId,
    name: DEMO.familyName,
    createdAt: now,
  });

  for (const [index, member] of DEMO.members.entries()) {
    await db.insert(familyMembers).values({
      id: crypto.randomUUID(),
      familyId,
      userId: member.linked ? userId : null,
      role: index === 0 ? "owner" : "member",
      displayName: member.name,
      color: nextMemberColor(index),
      inviteEmail: member.email,
      createdAt: now,
    });
  }

  console.log("Seeded demo family:", DEMO.familyName);
  console.log("Login with:", DEMO.email, "/", DEMO.password);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
