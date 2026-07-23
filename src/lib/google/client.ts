import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { getAuthenticatedClient, getServiceAccountAuth } from "./auth";
import type { GoogleTokens } from "./types";

export async function getCalendarClient(auth: OAuth2Client) {
  return google.calendar({ version: "v3", auth });
}

export async function getSheetsClient(auth: OAuth2Client) {
  return google.sheets({ version: "v4", auth });
}

export async function getDriveClient(auth: OAuth2Client) {
  return google.drive({ version: "v3", auth });
}

export async function getDocsClient(auth: OAuth2Client) {
  return google.docs({ version: "v1", auth });
}

export async function getOAuthCalendarClient(dbTokens: GoogleTokens) {
  const auth = await getAuthenticatedClient(dbTokens);
  return getCalendarClient(auth);
}

export async function getOAuthSheetsClient(dbTokens: GoogleTokens) {
  const auth = await getAuthenticatedClient(dbTokens);
  return getSheetsClient(auth);
}

export async function getOAuthDriveClient(dbTokens: GoogleTokens) {
  const auth = await getAuthenticatedClient(dbTokens);
  return getDriveClient(auth);
}

export async function getOAuthDocsClient(dbTokens: GoogleTokens) {
  const auth = await getAuthenticatedClient(dbTokens);
  return getDocsClient(auth);
}

export async function getServiceAccountCalendarClient() {
  const auth = getServiceAccountAuth(["https://www.googleapis.com/auth/calendar"]);
  return google.calendar({ version: "v3", auth });
}
