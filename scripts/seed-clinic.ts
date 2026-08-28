/**
 * Seeds a working clinic: professionals with real schedules, and the knowledge
 * base the assistant answers questions from.
 *
 * Why this exists: without professionals, `check_calendar` correctly reports
 * `no_active_professional` and the assistant cannot offer any time — the
 * booking flow simply does not work. It used to *look* like it worked because
 * the tool returned a hardcoded list of times; that was removed on 2026-08-28.
 * Without `clinic_context`, `query_knowledge_base` correctly refuses to state
 * opening hours rather than inventing them.
 *
 * Idempotent: professionals are matched by (clinicId, name) and context rows by
 * (clinicId, key), so re-running updates instead of duplicating.
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/seed-clinic.ts
 *
 * `dotenv/config` alone is not enough — it reads `.env`, not `.env.local`, and
 * postgres.js silently falls back to localhost when DATABASE_URL is undefined.
 */
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { clinicContext, clinics, professionals } from "../src/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Run with: npx tsx --env-file=.env.local scripts/seed-clinic.ts",
  );
  process.exit(1);
}

const client = postgres(DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
const db = drizzle(client, { schema });

/**
 * Weekdays are 0=Sunday. Slot duration drives what `check_calendar` offers, so
 * these numbers are the clinic's real appointment length, not a display choice.
 */
const STAFF = [
  {
    name: "Dr. Alex Carter",
    specialty: "General Practice",
    registrationNumber: "GP-10482",
    bio: "General practitioner. Routine consultations, preventive care and referrals.",
    availableDays: [1, 2, 3, 4, 5],
    workingHoursStart: "08:00",
    workingHoursEnd: "18:00",
    slotDuration: 30,
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    name: "Dr. Marina Lopes",
    specialty: "Cardiology",
    registrationNumber: "CAR-20915",
    bio: "Cardiologist. Follow-up consultations, ECG and cardiovascular risk assessment.",
    availableDays: [1, 3, 5],
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    slotDuration: 45,
    breakStart: "12:30",
    breakEnd: "13:30",
  },
  {
    name: "Dr. Rafael Souza",
    specialty: "Dermatology",
    registrationNumber: "DER-33170",
    bio: "Dermatologist. Skin lesion assessment, acne and routine dermatological care.",
    availableDays: [2, 4, 6],
    workingHoursStart: "08:00",
    workingHoursEnd: "14:00",
    slotDuration: 30,
    breakStart: null,
    breakEnd: null,
  },
];

/**
 * What the assistant is allowed to say about the clinic. Everything here is
 * read by `query_knowledge_base`; anything not here, the assistant will say it
 * does not know rather than guess.
 */
const CONTEXT: Array<{ key: string; content: string }> = [
  {
    key: "hours",
    content:
      "The clinic is open Monday to Friday from 8am to 6pm, and Saturday from 8am to 2pm. " +
      "It is closed on Sundays and public holidays.",
  },
  {
    key: "insurance",
    content:
      "The clinic accepts Aetna, BlueCross, UnitedHealth and Cigna, and also sees self-pay patients. " +
      "Coverage should be confirmed with the insurer before the appointment.",
  },
  {
    key: "specialties",
    content:
      "Available specialties: General Practice (Dr. Alex Carter, Monday to Friday), " +
      "Cardiology (Dr. Marina Lopes, Monday, Wednesday and Friday) and " +
      "Dermatology (Dr. Rafael Souza, Tuesday, Thursday and Saturday).",
  },
  {
    key: "preparation",
    content:
      "Please arrive 15 minutes before the appointment and bring a photo ID, your insurance card " +
      "and any previous test results. Fasting is only required when the clinic says so in advance.",
  },
  {
    key: "cancellation",
    content:
      "Appointments can be cancelled or rescheduled up to 24 hours in advance at no charge, " +
      "through this assistant or by calling the clinic.",
  },
];

async function main() {
  const [clinic] = await db.select().from(clinics).limit(1);
  if (!clinic) {
    console.error("No clinic found. Seed a clinic first.");
    process.exit(1);
  }
  console.log(`clinic: ${clinic.name} (${clinic.id})\n`);

  console.log("professionals");
  for (const person of STAFF) {
    const [existing] = await db
      .select()
      .from(professionals)
      .where(and(eq(professionals.clinicId, clinic.id), eq(professionals.name, person.name)))
      .limit(1);

    if (existing) {
      await db
        .update(professionals)
        .set({ ...person, isActive: true } as never)
        .where(eq(professionals.id, existing.id));
      console.log(`  updated  ${person.name} (${person.specialty})`);
    } else {
      await db
        .insert(professionals)
        .values({ ...person, clinicId: clinic.id, isActive: true } as never);
      console.log(`  created  ${person.name} (${person.specialty})`);
    }
  }

  console.log("\nknowledge base");
  for (const entry of CONTEXT) {
    const [existing] = await db
      .select()
      .from(clinicContext)
      .where(and(eq(clinicContext.clinicId, clinic.id), eq(clinicContext.key, entry.key)))
      .limit(1);

    if (existing) {
      await db
        .update(clinicContext)
        .set({ content: entry.content, updatedAt: new Date() } as never)
        .where(eq(clinicContext.id, existing.id));
      console.log(`  updated  ${entry.key}`);
    } else {
      await db
        .insert(clinicContext)
        .values({ clinicId: clinic.id, key: entry.key, content: entry.content } as never);
      console.log(`  created  ${entry.key}`);
    }
  }

  const staff = await db.select().from(professionals).where(eq(professionals.clinicId, clinic.id));
  const context = await db.select().from(clinicContext).where(eq(clinicContext.clinicId, clinic.id));
  console.log(`\nclinic now has ${staff.length} professional(s) and ${context.length} context entrie(s).`);
}

main()
  .then(async () => {
    await client.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await client.end();
    process.exit(1);
  });
