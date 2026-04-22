import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let schemaReady = false;

function getDatabaseUrl(): string | null {
  const value = process.env.DATABASE_URL?.trim();
  return value ? value : null;
}

export function hasDatabaseConfigured(): boolean {
  return getDatabaseUrl() !== null;
}

export function getDbPool(): pg.Pool | null {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
    });
  }

  return pool;
}

export async function ensureLiveListingsSchema(): Promise<boolean> {
  const db = getDbPool();
  if (!db) {
    return false;
  }

  if (schemaReady) {
    return true;
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS live_commercial_listings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      address TEXT NOT NULL,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      property_type TEXT NOT NULL,
      asking_rent_monthly INTEGER NOT NULL,
      square_feet INTEGER NOT NULL,
      zoning_or_use TEXT NOT NULL,
      parking_spaces INTEGER NULL,
      short_description TEXT NOT NULL,
      listing_url TEXT NULL,
      source TEXT NULL,
      last_seen_at TIMESTAMPTZ NULL,
      is_available BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_live_commercial_listings_available
      ON live_commercial_listings (is_available)
  `);

  schemaReady = true;
  return true;
}
