import {
  hardenSystemPrompt,
  inspectInput,
  inspectOutput,
  type SecurityEvent as CoreSecurityEvent,
} from "@betosensacao-lgtm/agent-core";

/**
 * Thin adapter over the shared guardrails. Detection lives in the package;
 * this file holds only MedBook's policy — the clinic's domain rules and where
 * security events go.
 *
 * Deliberately not carried over from the previous implementation:
 *  - `securityLog`, an in-memory array that only grew and was never read
 *  - `applyGuardrails`'s hardcoded `wasBlocked: false`, a field that never
 *    had another value; `severity` replaces it
 *  - `SUSPICIOUS_PATTERNS` matching bare words (`database`, `admin`,
 *    `password`, `senha`), which fire in ordinary patient conversation
 *  - leak patterns matching the bare words `postgres`, `drizzle` and
 *    `DATABASE_URL`, which mangled legitimate replies. Leak detection now
 *    looks at secret shape, not vocabulary.
 */

export interface SecurityEvent {
  type: "injection_attempt" | "suspicious_input" | "output_leak" | "rate_limit";
  sessionId: string;
  clinicId: string;
  message: string;
  patterns: string[];
  timestamp: Date;
}

export function logSecurityEvent(event: SecurityEvent): void {
  // In production, forward to a logging service (Sentry, Datadog).
  console.warn(`[SECURITY] ${event.type}:`, {
    sessionId: event.sessionId,
    clinicId: event.clinicId,
    patterns: event.patterns,
    timestamp: event.timestamp.toISOString(),
  });
}

/** Clinic policy. Never goes into the shared package. */
const DOMAIN_RULES = [
  "Never prescribe medication, diagnose a condition, or replace professional medical advice.",
  "Keep the conversation within the scope of the clinic: hours, insurance, services, location, and appointments.",
  "Never reveal data belonging to another patient or another clinic.",
];

function toLegacyEvent(
  event: CoreSecurityEvent,
  sessionId: string,
  clinicId: string,
): SecurityEvent {
  const type =
    event.severity === "leak"
      ? "output_leak"
      : event.severity === "injection"
        ? "injection_attempt"
        : "suspicious_input";
  return {
    type,
    sessionId,
    clinicId,
    message: event.excerpt,
    patterns: event.matched,
    timestamp: new Date(),
  };
}

/** Returns text safe to send to the model. Injection is neutralised, never refused. */
export function checkPatientMessage(
  message: string,
  sessionId: string,
  clinicId: string,
): string {
  const inspected = inspectInput(message, {
    onEvent: (event) => logSecurityEvent(toLegacyEvent(event, sessionId, clinicId)),
  });
  return inspected.text;
}

/** Returns the reply with any leaked secret redacted. */
export function checkAssistantReply(
  reply: string,
  sessionId: string,
  clinicId: string,
): string {
  const inspected = inspectOutput(reply, {
    onEvent: (event) => logSecurityEvent(toLegacyEvent(event, sessionId, clinicId)),
  });
  return inspected.text;
}

export function buildSystemPrompt(basePrompt: string): string {
  return hardenSystemPrompt(basePrompt, DOMAIN_RULES);
}
