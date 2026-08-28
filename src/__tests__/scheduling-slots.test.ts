/**
 * @jest-environment node
 */
import { buildSlots, subtractTaken, toMinutes, toTimeString } from "@/lib/scheduling/slots";

describe("time conversion", () => {
  it.each([
    ["09:00", 540],
    ["09:00:00", 540],
    ["00:00", 0],
    ["23:30", 1410],
  ])("toMinutes(%s) = %i", (input, expected) => {
    expect(toMinutes(input as string)).toBe(expected);
  });

  it("toTimeString always returns two-digit HH:MM", () => {
    expect(toTimeString(540)).toBe("09:00");
    expect(toTimeString(0)).toBe("00:00");
    expect(toTimeString(1410)).toBe("23:30");
  });

  it("toMinutes returns null for invalid input", () => {
    expect(toMinutes("banana")).toBeNull();
    expect(toMinutes("25:00")).toBeNull();
    expect(toMinutes("09:70")).toBeNull();
    expect(toMinutes(null)).toBeNull();
    expect(toMinutes(undefined)).toBeNull();
  });
});

describe("buildSlots", () => {
  it("generates working-hour slots by slot duration", () => {
    expect(buildSlots({ start: "09:00", end: "11:00", slotMinutes: 30 })).toEqual([
      "09:00", "09:30", "10:00", "10:30",
    ]);
  });

  it("does not generate a slot that runs past the end of the day", () => {
    // The 45min grid from 09:00 is 09:00, 09:45, 10:30.
    // 10:30 + 45min = 11:15, past 11:00, so it is not offered.
    expect(buildSlots({ start: "09:00", end: "11:00", slotMinutes: 45 })).toEqual([
      "09:00", "09:45",
    ]);
  });

  it("drops slots that overlap the break", () => {
    expect(
      buildSlots({
        start: "09:00", end: "13:00", slotMinutes: 60,
        breakStart: "11:00", breakEnd: "12:00",
      }),
    ).toEqual(["09:00", "10:00", "12:00"]);
  });

  it("keeps a slot that merely touches the break", () => {
    // 10:00-11:00 ends exactly when the break begins.
    expect(
      buildSlots({
        start: "10:00", end: "12:00", slotMinutes: 60,
        breakStart: "11:00", breakEnd: "12:00",
      }),
    ).toEqual(["10:00"]);
  });

  it("returns nothing when the end is before the start", () => {
    expect(buildSlots({ start: "18:00", end: "08:00", slotMinutes: 30 })).toEqual([]);
  });

  it("returns nothing for an invalid slot duration", () => {
    expect(buildSlots({ start: "09:00", end: "17:00", slotMinutes: 0 })).toEqual([]);
    expect(buildSlots({ start: "09:00", end: "17:00", slotMinutes: -30 })).toEqual([]);
  });

  it("returns nothing for a fractional slot duration", () => {
    // A fractional step would produce "09:12.5" -- not a time.
    expect(buildSlots({ start: "09:00", end: "10:00", slotMinutes: 12.5 })).toEqual([]);
  });

  it("returns nothing for unparseable working hours", () => {
    expect(buildSlots({ start: "banana", end: "17:00", slotMinutes: 30 })).toEqual([]);
  });

  it("ignores a malformed break rather than dropping every slot", () => {
    expect(
      buildSlots({
        start: "09:00", end: "11:00", slotMinutes: 60,
        breakStart: "banana", breakEnd: null,
      }),
    ).toEqual(["09:00", "10:00"]);
  });
});

describe("subtractTaken", () => {
  it("removes times already booked", () => {
    expect(subtractTaken(["09:00", "09:30", "10:00"], ["09:30"])).toEqual(["09:00", "10:00"]);
  });

  it("normalises the HH:MM:SS form the database returns", () => {
    expect(subtractTaken(["09:00", "09:30"], ["09:30:00"])).toEqual(["09:00"]);
  });

  it("ignores a booked time that is not one of the slots", () => {
    expect(subtractTaken(["09:00", "09:30"], ["09:17"])).toEqual(["09:00", "09:30"]);
  });

  it("returns nothing when every slot is taken", () => {
    expect(subtractTaken(["09:00"], ["09:00"])).toEqual([]);
  });

  it("tolerates nulls in the booked list", () => {
    expect(subtractTaken(["09:00", "09:30"], [null, "09:00"])).toEqual(["09:30"]);
  });
});
