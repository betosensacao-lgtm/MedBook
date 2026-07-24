import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/db";
import { adminUsers, passwordResetTokens } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

const COOKIE_NAME = "admin_session";
const JWT_SECRET_RAW = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || "medbook-dev-secret-key-change-in-production";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);
const TOKEN_EXPIRY = "24h";
const RESET_TOKEN_EXPIRY_HOURS = 1;

// ─── Password hashing ────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT Session tokens ──────────────────────────────────────────────────────

export interface SessionPayload {
  userId: string;
  email: string;
  role: "admin" | "super_admin";
  clinicId: string | null;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Password reset tokens ───────────────────────────────────────────────────

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createResetToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
  } as any);

  return rawToken;
}

export async function verifyResetToken(token: string): Promise<string | null> {
  const tokenHash = hashToken(token);
  const now = new Date();

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        eq(passwordResetTokens.used, false),
        gt(passwordResetTokens.expiresAt, now)
      )
    )
    .limit(1);

  return record ? record.userId : null;
}

export async function markTokenUsed(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await db
    .update(passwordResetTokens)
    .set({ used: true } as any)
    .where(eq(passwordResetTokens.tokenHash, tokenHash));
}

// ─── User lookup ─────────────────────────────────────────────────────────────

export async function getAdminByEmail(email: string) {
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email.toLowerCase().trim()))
    .limit(1);
  return user || null;
}

export async function getAdminById(id: string) {
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);
  return user || null;
}

export async function updateLastLogin(userId: string) {
  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date() } as any)
    .where(eq(adminUsers.id, userId));
}

export async function updatePassword(userId: string, newPasswordHash: string) {
  await db
    .update(adminUsers)
    .set({ passwordHash: newPasswordHash, updatedAt: new Date() } as any)
    .where(eq(adminUsers.id, userId));
}

export { COOKIE_NAME };
