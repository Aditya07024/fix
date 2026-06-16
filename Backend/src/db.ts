import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import { ServiceUnavailableError } from "./utils/errors.js";

export const supabase = createClient(config.supabase.url, config.supabase.key);

// Direct database connection for raw queries
import pg from "pg";
const { Pool } = pg;

const DB_CONNECT_TIMEOUT_MS = parseInt(
  process.env.DB_CONNECT_TIMEOUT_MS || "15000",
  10,
);
const DB_QUERY_TIMEOUT_MS = parseInt(
  process.env.DB_QUERY_TIMEOUT_MS || "20000",
  10,
);

type DatabaseTarget = {
  host: string;
  port: string;
  isSupabasePooler: boolean;
  poolMode: "transaction" | "session" | "direct" | "unknown";
};

const getDatabaseTarget = (): DatabaseTarget => {
  try {
    const url = new URL(config.supabase.databaseUrl);
    const host = url.hostname;
    const port = url.port || "5432";
    const isSupabasePooler = host.includes("pooler.supabase.com");

    let poolMode: DatabaseTarget["poolMode"] = "unknown";

    if (isSupabasePooler) {
      if (port === "6543") {
        poolMode = "transaction";
      } else if (port === "5432") {
        poolMode = "session";
      }
    } else if (host) {
      poolMode = "direct";
    }

    return { host, port, isSupabasePooler, poolMode };
  } catch {
    return {
      host: "",
      port: "",
      isSupabasePooler: false,
      poolMode: "unknown",
    };
  }
};

const databaseTarget = getDatabaseTarget();
const databaseLabel =
  databaseTarget.host && databaseTarget.port
    ? `${databaseTarget.host}:${databaseTarget.port}`
    : "unknown target";

if (databaseTarget.poolMode === "transaction") {
  console.warn(
    "⚠️ Using Supabase transaction pooler (port 6543). For a persistent Express server, prefer the session pooler on port 5432 or a direct connection.",
  );
}

export const pool = new Pool({
  connectionString: config.supabase.databaseUrl,
  connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
  query_timeout: DB_QUERY_TIMEOUT_MS,
  statement_timeout: DB_QUERY_TIMEOUT_MS,
  idleTimeoutMillis: 60000,
  keepAlive: true,
  max: 10,
  keepAliveInitialDelayMillis: 10000,
  ssl: { rejectUnauthorized: false },
});

pool
  .connect()
  .then((client) => {
    console.log(`✅ DB Connected Successfully (${databaseLabel})`);
    client.release();
  })
  .catch((err) => {
    console.error(`❌ DB Connection Failed (${databaseLabel}):`, err.message);
  });

const hasConnectivityMessage = (error: any) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("connection timeout") ||
    message.includes("connection terminated") ||
    message.includes("connection failed") ||
    message.includes("network") ||
    message.includes("socket")
  );
};

const isDatabaseConnectivityError = (error: any) =>
  error?.code === "ETIMEDOUT" ||
  error?.code === "ENOTFOUND" ||
  error?.code === "ECONNREFUSED" ||
  error?.code === "EHOSTUNREACH" ||
  error?.code === "ENETUNREACH" ||
  hasConnectivityMessage(error) ||
  hasConnectivityMessage(error?.cause);

export const db = {
  async query(sql: string, values?: any[]) {
    try {
      const result = await pool.query(sql, values);
      return result.rows;
    } catch (error) {
      console.error("Database query error:", error);

      if (isDatabaseConnectivityError(error)) {
        const poolerHint =
          databaseTarget.poolMode === "transaction"
            ? " This app is a persistent server, so Supabase recommends the session pooler on port 5432 or a direct database connection."
            : "";

        throw new ServiceUnavailableError(
          `Database connection failed for ${databaseLabel}. Check the DATABASE_URL and local network access to Supabase.${poolerHint}`,
        );
      }

      if (
        Array.isArray((error as any)?.errors) &&
        (error as any).errors.some((nestedError: any) =>
          isDatabaseConnectivityError(nestedError),
        )
      ) {
        throw new ServiceUnavailableError(
          `Database connection timed out for ${databaseLabel}. Check your local network access to Supabase.${databaseTarget.isSupabasePooler ? " If you are using the transaction pooler on port 6543, switch this backend to the session pooler on port 5432." : ""}`,
        );
      }

      throw error;
    }
  },

  async queryOne(sql: string, values?: any[]) {
    const results = await this.query(sql, values);
    return results[0] || null;
  },
};
