/**
 * One-time migration: creates Luca's user account and assigns
 * all existing watchlist items and settings to him.
 *
 * Run: npx tsx src/db/migrate-to-multiuser.ts
 */
import { db } from "./index";
import { users, watchlist, settings, rotationPlans } from "./schema";
import { hash } from "bcryptjs";
import { sql } from "drizzle-orm";

const LUCA_EMAIL = "luca@streamplanner.com";
const LUCA_NAME = "Luca";
const LUCA_PASSWORD = "streamplanner2026";

async function migrate() {
  console.log("=== Multi-user migration ===");

  // 1. Create Luca's user account
  const passwordHash = await hash(LUCA_PASSWORD, 12);

  const [user] = await db
    .insert(users)
    .values({
      name: LUCA_NAME,
      email: LUCA_EMAIL,
      passwordHash,
    })
    .onConflictDoNothing({ target: users.email })
    .returning();

  const lucaId = user?.id;

  if (!lucaId) {
    // Already exists — fetch
    const rows = await db.execute(
      sql`SELECT id FROM users WHERE email = ${LUCA_EMAIL}`
    );
    const existingId = (rows as unknown as { id: string }[])[0]?.id;
    if (!existingId) {
      console.error("Cannot find or create user");
      process.exit(1);
    }
    console.log("User already exists:", existingId);
    await assignData(existingId);
  } else {
    console.log("Created user:", lucaId);
    await assignData(lucaId);
  }

  console.log("=== Migration complete ===");
  process.exit(0);
}

async function assignData(userId: string) {
  // 2. Assign all existing watchlist items (that have no userId) to Luca
  const wlResult = await db.execute(
    sql`UPDATE watchlist SET user_id = ${userId} WHERE user_id IS NULL OR user_id = ${userId}`
  );
  console.log("Watchlist items assigned");

  // 3. Delete old settings (no userId) and create new ones for Luca
  await db.execute(sql`DELETE FROM settings WHERE user_id IS NULL`);

  await db
    .insert(settings)
    .values([
      { userId, key: "monthly_budget", value: "15" },
      { userId, key: "excluded_platforms", value: "[]" },
      { userId, key: "always_on_platforms", value: "[]" },
      { userId, key: "active_subscriptions", value: '["netflix","amazon-prime"]' },
    ])
    .onConflictDoNothing();
  console.log("Settings created for Luca (Netflix + Prime active)");

  // 4. Assign rotation plans
  await db.execute(
    sql`UPDATE rotation_plans SET user_id = ${userId} WHERE user_id IS NULL OR user_id = ${userId}`
  );
  console.log("Rotation plans assigned");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
