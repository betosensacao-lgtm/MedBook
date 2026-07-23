export interface GoogleConnection {
  id: string;
  userId: string;
  email: string;
  scope: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  scope: string;
  expiresAt: Date;
  email: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export type GoogleScope =
  | "https://www.googleapis.com/auth/calendar"
  | "https://www.googleapis.com/auth/calendar.events"
  | "https://www.googleapis.com/auth/spreadsheets"
  | "https://www.googleapis.com/auth/drive.readonly"
  | "https://www.googleapis.com/auth/drive.file"
  | "https://www.googleapis.com/auth/documents";
