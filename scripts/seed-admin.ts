/**
 * Seed script: creates the initial admin user.
 * Run with: npx tsx scripts/seed-admin.ts
 *
 * Uses ADMIN_PASSWORD from .env.local as the initial password.
 */

import { config } from "dotenv";
import { resolve } from "path";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { adminUsers } from "../src/db/schema";
import { eq } from "drizzle-orm";

config({ path: resolve(__dirname, "../.env.local") });

async function main() {
  const client = postgres(process.env.DIRECT_URL || process.env.DATABASE_URL!, {
    prepare: false,
  });
  const db = drizzle(client, { schema });

  const email = "admin@medbook.com";
  const password = process.env.ADMIN_PASSWORD || "medbook123";
  const clinicId = process.env.CLINIC_ID;

  console.log("Seeding admin user...");

  // Check if admin already exists
  const [existing] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  if (existing) {
    console.log(`Admin user ${email} already exists. Updating password...`);
    const hash = await bcrypt.hash(password, 12);
    await db
      .update(adminUsers)
      .set({ passwordHash: hash })
      .where(eq(adminUsers.id, existing.id));
    console.log("Password updated.");
  } else {
    const hash = await bcrypt.hash(password, 12);
    await db.insert(adminUsers).values({
      email,
      passwordHash: hash,
      name: "Administrador",
      role: "super_admin",
      clinicId: clinicId || null,
    } as any);
    console.log(`Admin user created: ${email}`);
  }

  console.log(`Login at: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/login`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
