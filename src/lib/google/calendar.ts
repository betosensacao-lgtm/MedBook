import type { calendar_v3 } from "googleapis";

export async function listEvents(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  opts?: { timeMin?: string; timeMax?: string; maxResults?: number }
) {
  const res = await calendar.events.list({
    calendarId,
    timeMin: opts?.timeMin || new Date().toISOString(),
    timeMax: opts?.timeMax,
    maxResults: opts?.maxResults || 50,
    singleEvents: true,
    orderBy: "startTime",
  });
  return res.data.items || [];
}

export async function createEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  event: calendar_v3.Schema$Event
) {
  const res = await calendar.events.insert({
    calendarId,
    requestBody: event,
  });
  return res.data;
}

export async function deleteEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  eventId: string
) {
  await calendar.events.delete({ calendarId, eventId });
}

export async function checkAvailability(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  timeMin: string,
  timeMax: string
) {
  const res = await calendar.freebusy.query({
    requestBody: {
      items: [{ id: calendarId }],
      timeMin,
      timeMax,
    },
  });
  return res.data.calendars?.[calendarId]?.busy || [];
}
