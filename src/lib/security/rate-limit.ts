import {
  checkRateLimit,
  clientIpFrom,
  createPostgresStore,
  type RateLimitStore,
} from "@betosensacao-lgtm/agent-core";
import postgres from "postgres";

/**
 * Thin adapter. The algorithm and the SQL live in the package; this file only
 * wires them to the driver this app already uses.
 *
 * Replaces an in-memory Map keyed by a client-supplied sessionId. That limiter
 * failed twice over: each serverless instance had its own Map, so the real
 * ceiling was 30/min per instance, and a caller could reset the count at will
 * by sending a new sessionId. The key is now the caller's IP.
 *
 * `postgres(undefined)` does NOT throw -- it falls back to localhost -- so the
 * client is built lazily inside a function. Building it at module scope would
 * hide a missing DATABASE_URL behind a confusing ECONNREFUSED at request time.
 * `prepare: false` is required by Supabase's transaction pooler. Two
 * connections is enough for one statement per request, and keeping the limiter
 * off the app's pool means a slow query elsewhere cannot starve it.
 */

let clientInstance: ReturnType<typeof postgres> | null = null;
let storeInstance: RateLimitStore | null = null;

function getClient() {
  if (!clientInstance) {
    const url = process.env.DATABASE_URL;

    if (!url) {
      throw new Error("DATABASE_URL not configured");
    }

    clientInstance = postgres(url, { prepare: false, max: 2, idle_timeout: 10 });
  }

  return clientInstance;
}

function getStore(): RateLimitStore {
  if (!storeInstance) {
    // `client.unsafe(query, params)` rather than Drizzle: src/db/index.ts does
    // not export the raw client, and Drizzle's sql.raw() takes no parameters --
    // interpolating the key into the query text would be injection by the front
    // door.
    storeInstance = createPostgresStore(
      async (query, params) => {
        const rows = await getClient().unsafe(query, params as never[]);
        return rows as unknown as Array<{ count: number }>;
      },
      {
        onCleanupError: (error) => {
          console.warn("[RATE LIMIT] cleanup failed", error);
        },
      },
    );
  }

  return storeInstance;
}

const CHAT_LIMIT = 30;
const CHAT_WINDOW_MS = 60_000;

export async function checkChatRateLimit(request: Request) {
  return checkRateLimit({
    key: `chat:${clientIpFrom(request)}`,
    limit: CHAT_LIMIT,
    windowMs: CHAT_WINDOW_MS,
    store: getStore(),
    onEvent: (event) => {
      console.warn("[RATE LIMIT]", {
        key: event.key,
        count: event.count,
        limit: event.limit,
        degraded: event.degraded,
      });
    },
  });
}
