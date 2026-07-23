import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { GoogleTokens, OAuthConfig } from "./types";

function getConfig(): OAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI must be set");
  }

  return { clientId, clientSecret, redirectUri };
}

let _oauthClient: OAuth2Client | null = null;

export function getOAuthClient(): OAuth2Client {
  if (_oauthClient) return _oauthClient;

  const config = getConfig();
  _oauthClient = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  return _oauthClient;
}

export function generateAuthUrl(scopes: string[]): string {
  const oauth2Client = getOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });
}

export async function getTokensFromCode(code: string): Promise<GoogleTokens> {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    throw new Error("Failed to obtain tokens from Google");
  }

  oauth2Client.setCredentials(tokens);

  const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    scope: tokens.scope || tokenInfo.scopes.join(" "),
    expiresAt: new Date(tokens.expiry_date),
    email: tokenInfo.email || "",
  };
}

export async function getAuthenticatedClient(dbTokens: GoogleTokens): Promise<OAuth2Client> {
  const oauth2Client = getOAuthClient();

  const isExpired = new Date() >= dbTokens.expiresAt;

  oauth2Client.setCredentials({
    access_token: dbTokens.accessToken,
    refresh_token: dbTokens.refreshToken,
    expiry_date: dbTokens.expiresAt.getTime(),
  });

  if (isExpired) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return Object.assign(oauth2Client, { credentials });
  }

  return oauth2Client;
}

export function getServiceAccountAuth(scopes: string[]) {
  const clientEmail = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_CALENDAR_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error("GOOGLE_CALENDAR_CLIENT_EMAIL and GOOGLE_CALENDAR_PRIVATE_KEY must be set");
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes,
  });
}
