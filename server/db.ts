import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Database not configured. Set SUPABASE_DATABASE_URL in your Secrets to your Supabase connection string.\n" +
    "Find it in: Supabase Dashboard → Project Settings → Database → Connection string (URI mode)."
  );
}

const isSupabase = !!(process.env.SUPABASE_DATABASE_URL);

export const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : (process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });
