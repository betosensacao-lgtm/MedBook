import crypto from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers, passwordResetTokens } from "@/db/schema";

import {
  verifySessionToken as verifyToken,
  getSessionFromRequest as getSession,
} from "@betosensacao-lgtm/agent-core";

export {
  hashPassword,
  verifyPassword,
  createSessionToken,
  DEFAULT_COOKIE_NAME as COOKIE_NAME,
} from "@betosensacao-lgtm/agent-core";

/**
 * The previous chain was:
 *   JWT_SECRET || ADMIN_PASSWORD || "medbook-dev-secret-key-change-in-production"
 *
 * In production JWT_SECRET was not set, so the key signing every session was
 * THE ADMIN PASSWORD. Anyone who captured a token could attack it offline and
 * recover that password; anyone who knew the password could forge any
 * session, super_admin included. Fixed by setting the environment variable on
 * 2026-08-24; this commit removes the fallback from the code itself.
 */

export interface SessionPayload {
  userId: string;
  email: string;
  role: "admin" | "super_admin";
  clinicId: string | null;
}

/**
 * Versões já tipadas com o payload deste projeto. O pacote expõe
 * `verifySessionToken<T>` genérico; sem o parâmetro de tipo o retorno é
 * `unknown`, e o compilador rejeita acesso a propriedade — inclusive com
 * `strict: false`. Fixar o tipo aqui, uma vez, é melhor que repeti-lo nos
 * oito call sites, e preserva exatamente a assinatura que este projeto já
 * tinha antes da migração.
 */
export function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  return verifyToken<SessionPayload>(token);
}

export function getSessionFromRequest(
  request: Request,
  cookieName?: string,
): Promise<SessionPayload | null> {
  return getSession<SessionPayload>(request, cookieName);
}

const RESET_TOKEN_EXPIRY_HOURS = 1;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createResetToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 3600 * 1000),
  } as any);
  return rawToken;
}

export async function verifyResetToken(token: string): Promise<string | null> {
  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(token)),
        eq(passwordResetTokens.used, false),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return record ? record.userId : null;
}

export async function markTokenUsed(token: string): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ used: true } as any)
    .where(eq(passwordResetTokens.tokenHash, hashToken(token)));
}

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
