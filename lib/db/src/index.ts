import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = process.env.DATABASE_URL;
const isLocalDatabase = /(?:localhost|127\.0\.0\.1)/i.test(databaseUrl);
const aivenCaCert = process.env.AIVEN_CA_CERT?.trim();

// node-postgres parses sslmode in the connection string and may overwrite the
// explicit ssl.ca option. Remove URL SSL parameters when a CA is supplied so
// the trusted Aiven certificate is actually used for verification.
let connectionString = databaseUrl;
if (aivenCaCert && !isLocalDatabase) {
  const parsed = new URL(databaseUrl);
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) {
    parsed.searchParams.delete(key);
  }
  connectionString = parsed.toString();
}

export const pool = new Pool({
  connectionString,
  ssl: isLocalDatabase
    ? false
    : aivenCaCert
      ? { ca: aivenCaCert.replace(/\\n/g, "\n"), rejectUnauthorized: true }
      : { rejectUnauthorized: false },
});
export const db = drizzle(pool, { schema });

export * from "./schema";
