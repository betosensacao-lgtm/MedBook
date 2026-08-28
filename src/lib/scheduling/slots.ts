/**
 * Pure time arithmetic for appointment slots. No database, no IO — so it can
 * be tested exhaustively and cheaply.
 *
 * Postgres `time` columns come back as "HH:MM:SS"; the model and the UI speak
 * "HH:MM". Everything here normalises to minutes-since-midnight and formats
 * back to "HH:MM".
 */

const MINUTES_IN_DAY = 24 * 60;

export function toMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

export function toTimeString(minutes: number): string {
  const wrapped = ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hours = Math.floor(wrapped / 60);
  const mins = wrapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export interface BuildSlotsInput {
  start: string;
  end: string;
  slotMinutes: number;
  breakStart?: string | null;
  breakEnd?: string | null;
}

/**
 * Every slot that fits entirely inside the working window and does not overlap
 * the break. A slot that ends exactly when the break starts is kept — it fits.
 *
 * A malformed break is ignored rather than treated as covering the whole day:
 * losing the break is a scheduling annoyance, losing every slot would look
 * like a fully booked calendar, which is a lie.
 */
export function buildSlots(input: BuildSlotsInput): string[] {
  const start = toMinutes(input.start);
  const end = toMinutes(input.end);
  const step = input.slotMinutes;

  if (start === null || end === null) return [];
  if (!Number.isFinite(step) || step <= 0) return [];
  if (end <= start) return [];

  const breakStart = toMinutes(input.breakStart);
  const breakEnd = toMinutes(input.breakEnd);
  const hasBreak = breakStart !== null && breakEnd !== null && breakEnd > breakStart;

  const slots: string[] = [];
  for (let at = start; at + step <= end; at += step) {
    if (hasBreak && at < breakEnd && at + step > breakStart) continue;
    slots.push(toTimeString(at));
  }
  return slots;
}

/** Removes slots already booked. Both sides are normalised before comparing. */
export function subtractTaken(
  slots: string[],
  taken: Array<string | null | undefined>,
): string[] {
  const takenMinutes = new Set(
    taken.map((t) => toMinutes(t)).filter((m): m is number => m !== null),
  );
  return slots.filter((slot) => {
    const minutes = toMinutes(slot);
    return minutes === null ? false : !takenMinutes.has(minutes);
  });
}
