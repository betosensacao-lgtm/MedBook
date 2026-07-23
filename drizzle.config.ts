import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

// Migrations need a direct connection (no pooler).
// DIRECT_URL = postgresql://postgres:[pass]@db.[ref].supabase.co:5432/postgres
// DATABASE_URL = pooler URL used by the app at runtime
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL!;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
  schemaFilter: ["medbook"],
});
