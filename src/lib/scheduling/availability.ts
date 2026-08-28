import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { appointments, professionals } from "@/db/schema";
import { buildSlots, subtractTaken } from "./slots";

export type AvailabilityFailure =
  | "invalid_date"
  | "past_date"
  | "no_active_professional"
  | "schedule_not_configured"
  | "lookup_failed";

export type EmptyReason = "closed_that_day" | "fully_booked";

export interface ProfessionalAvailability {
  professionalId: string;
  professionalName: string;
  slots: string[];
}

export type AvailabilityResult =
  | {
      success: true;
      date: string;
      availableSlots: string[];
      byProfessional: ProfessionalAvailability[];
      reason?: EmptyReason;
    }
  | { success: false; date: string; reason: AvailabilityFailure };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A model calling this tool will happily invent an id like "default" or "any".
 * Passing that to Postgres throws on the uuid cast, which surfaced as
 * `lookup_failed` and made the whole feature unusable in production. An
 * invented filter is ignored instead: narrowing is a hint, not the answer.
 */
function asUuid(value: string | undefined): string | undefined {
  return value && UUID.test(value) ? value : undefined;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Real availability, computed from the same tables `create_event` writes to.
 *
 * Before this existed, `check_calendar` returned a hardcoded list of times and
 * reported success, while `create_event` — sitting next to it in the same tool
 * list — wrote real rows. The assistant confirmed availability it had never
 * checked and then booked for real.
 *
 * A failure NEVER carries `availableSlots`. And "nobody works that day",
 * "every slot is taken" and "this schedule produces no slots at all" are kept
 * apart, because collapsing them into one empty list is its own quiet lie.
 */
export async function getAvailability(params: {
  date: string;
  clinicId?: string;
  professionalId?: string;
}): Promise<AvailabilityResult> {
  const { date } = params;

  // Round-trip, not just Date.parse: JS rolls impossible dates over, so
  // "2026-02-30" parses happily as March 2. Without this a nonexistent date
  // could come back as a confident answer about the day it rolled into.
  if (!ISO_DATE.test(date)) {
    return { success: false, date, reason: "invalid_date" };
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    return { success: false, date, reason: "invalid_date" };
  }
  if (date < todayIsoDate()) {
    return { success: false, date, reason: "past_date" };
  }

  try {
    const clinicId = asUuid(params.clinicId);
    const professionalId = asUuid(params.professionalId);

    const filters = [eq(professionals.isActive, true)];
    if (clinicId) filters.push(eq(professionals.clinicId, clinicId));
    if (professionalId) filters.push(eq(professionals.id, professionalId));

    const staff = await db.select().from(professionals).where(and(...filters));

    if (staff.length === 0) {
      return { success: false, date, reason: "no_active_professional" };
    }

    // getUTCDay() and not getDay(): the date string carries no timezone, so
    // reading it in local time would shift the weekday for anyone west of UTC.
    const weekday = parsed.getUTCDay();

    const byProfessional: ProfessionalAvailability[] = [];
    let anyWorksToday = false;
    let anyHasSlots = false;

    for (const person of staff) {
      const availableDays = person.availableDays ?? [1, 2, 3, 4, 5];
      if (!availableDays.includes(weekday)) continue;
      anyWorksToday = true;

      const candidates = buildSlots({
        start: person.workingHoursStart ?? "08:00",
        end: person.workingHoursEnd ?? "18:00",
        slotMinutes: person.slotDuration ?? 30,
        breakStart: person.breakStart,
        breakEnd: person.breakEnd,
      });
      if (candidates.length === 0) continue;
      anyHasSlots = true;

      const booked = await db
        .select({ startTime: appointments.startTime })
        .from(appointments)
        .where(
          and(
            eq(appointments.professionalId, person.id),
            eq(appointments.date, date),
            ne(appointments.status, "cancelled"),
          ),
        );

      const free = subtractTaken(candidates, booked.map((b) => b.startTime));
      if (free.length > 0) {
        byProfessional.push({
          professionalId: person.id,
          professionalName: person.name,
          slots: free,
        });
      }
    }

    if (byProfessional.length > 0) {
      const availableSlots = [...new Set(byProfessional.flatMap((p) => p.slots))].sort();
      return { success: true, date, availableSlots, byProfessional };
    }

    if (!anyWorksToday) {
      return { success: true, date, availableSlots: [], byProfessional: [], reason: "closed_that_day" };
    }
    if (!anyHasSlots) {
      // Someone works today, yet no schedule yields a single slot. That is a
      // configuration problem, not an answer about availability.
      return { success: false, date, reason: "schedule_not_configured" };
    }
    return { success: true, date, availableSlots: [], byProfessional: [], reason: "fully_booked" };
  } catch (error) {
    // Never fall back to a slot list. Not knowing is a valid answer; inventing
    // availability is not.
    console.error("[Scheduling] availability lookup failed", error);
    return { success: false, date, reason: "lookup_failed" };
  }
}
