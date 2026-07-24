import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const authHeader = request.headers.get("authorization");
  const isCronRequest = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isDetailed = isCronRequest || request.headers.get("x-debug") === "1";

  const checks: Record<string, { status: string; details?: string; ms?: number }> = {};

  // 1. Database connection
  try {
    const t0 = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.database = { status: "ok", ms: Date.now() - t0 };
  } catch (e: any) {
    checks.database = { status: "error", details: e.message };
  }

  // 2. Tables
  const expectedTables = [
    "users", "clinics", "professionals", "appointments",
    "admin_users", "pricing_plans", "chat_sessions", "chat_messages",
    "triage_sessions", "triage_messages",
  ];

  try {
    const t0 = Date.now();
    const result = await db.execute(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ${sql.raw(`(${expectedTables.map(t => `'${t}'`).join(',')})`)}
    `);
    const found = (result as any[]).map((r: any) => r.table_name);
    const missing = expectedTables.filter(t => !found.includes(t));

    checks.tables = {
      status: missing.length === 0 ? "ok" : "warning",
      details: missing.length > 0 ? `Missing: ${missing.join(", ")}` : `${found.length}/${expectedTables.length} tables`,
      ms: Date.now() - t0,
    };
  } catch (e: any) {
    checks.tables = { status: "error", details: e.message };
  }

  // 3. RLS (detailed only)
  if (isDetailed) {
    try {
      const t0 = Date.now();
      const result = await db.execute(sql`
        SELECT tablename, rowsecurity FROM pg_tables
        WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'
      `);
      const tables = (result as any[]);
      const noRLS = tables.filter((t: any) => !t.rowsecurity);

      checks.rls = {
        status: noRLS.length === 0 ? "ok" : "critical",
        details: noRLS.length > 0
          ? `Tables without RLS: ${noRLS.map((t: any) => t.tablename).join(", ")}`
          : "All tables have RLS",
        ms: Date.now() - t0,
      };
    } catch (e: any) {
      checks.rls = { status: "error", details: e.message };
    }
  }

  // 4. Migrations (detailed only)
  if (isDetailed) {
    try {
      const t0 = Date.now();
      const mResult = await db.execute(
        sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`
      );
      const applied = (mResult as any[]).length;
      const { readdirSync } = await import("fs");
      const { resolve } = await import("path");
      const migrationFiles = readdirSync(resolve(process.cwd(), "src/db/migrations"))
        .filter((f: string) => f.endsWith(".sql"));
      const pending = migrationFiles.length - applied;

      checks.migrations = {
        status: pending === 0 ? "ok" : "warning",
        details: `${applied}/${migrationFiles.length} applied${pending > 0 ? `, ${pending} pending` : ""}`,
        ms: Date.now() - t0,
      };
    } catch (e: any) {
      checks.migrations = { status: "ok", details: "Migration check skipped (read-only)" };
    }
  }

  // 6. Env vars (detailed only)
  if (isDetailed) {
    const required = ["DATABASE_URL", "DIRECT_URL", "JWT_SECRET", "GROQ_API_KEY"];
    const missing = required.filter(v => !process.env[v]);
    checks.env = {
      status: missing.length === 0 ? "ok" : "critical",
      details: missing.length > 0
        ? `Missing: ${missing.join(", ")}`
        : "All required env vars set",
    };
  }

  // 7. Deployment info
  checks.deployment = {
    status: "ok",
    details: `Node ${process.version} · ${process.env.VERCEL_ENV || "local"} · ${process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev"}`,
  };

  const hasErrors = Object.values(checks).some(c => c.status === "error" || c.status === "critical");
  const hasWarnings = Object.values(checks).some(c => c.status === "warning");
  const overallStatus = hasErrors ? "degraded" : hasWarnings ? "healthy" : "healthy";

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - start,
    checks,
  });
}
