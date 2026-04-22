import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { commercialListings, type CommercialListing, type CommercialPropertyType } from '../data/commercialListings.js';
import { ensureLiveListingsSchema, getDbPool, hasDatabaseConfigured } from './db.js';

export interface RawLiveCommercialListing {
  id?: unknown;
  title?: unknown;
  address?: unknown;
  lat?: unknown;
  lng?: unknown;
  propertyType?: unknown;
  askingRentMonthly?: unknown;
  squareFeet?: unknown;
  zoningOrUse?: unknown;
  parkingSpaces?: unknown;
  shortDescription?: unknown;
  listingUrl?: unknown;
  source?: unknown;
  lastSeenAt?: unknown;
  isAvailable?: unknown;
}

const PROPERTY_TYPES = new Set<CommercialPropertyType>([
  'Storefront',
  'Office',
  'Mixed Use',
  'Restaurant',
  'Medical',
  'Flex',
  'Community Retail',
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const liveListingsPath = path.resolve(__dirname, '../../data/liveCommercialListings.json');

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toNullableNumber(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }

  return toNumber(value);
}

function normalizePropertyType(value: unknown): CommercialPropertyType | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  const normalized = value.trim() as CommercialPropertyType;
  return PROPERTY_TYPES.has(normalized) ? normalized : null;
}

export function normalizeLiveListing(raw: RawLiveCommercialListing): CommercialListing | null {
  const lat = toNumber(raw.lat);
  const lng = toNumber(raw.lng);
  const askingRentMonthly = toNumber(raw.askingRentMonthly);
  const squareFeet = toNumber(raw.squareFeet);
  const propertyType = normalizePropertyType(raw.propertyType);

  if (
    !isNonEmptyString(raw.id)
    || !isNonEmptyString(raw.title)
    || !isNonEmptyString(raw.address)
    || lat == null
    || lng == null
    || propertyType == null
    || askingRentMonthly == null
    || squareFeet == null
    || !isNonEmptyString(raw.zoningOrUse)
    || !isNonEmptyString(raw.shortDescription)
  ) {
    return null;
  }

  return {
    id: raw.id.trim(),
    title: raw.title.trim(),
    address: raw.address.trim(),
    lat,
    lng,
    propertyType,
    askingRentMonthly,
    squareFeet,
    zoningOrUse: raw.zoningOrUse.trim(),
    parkingSpaces: toNullableNumber(raw.parkingSpaces),
    shortDescription: raw.shortDescription.trim(),
    listingUrl: isNonEmptyString(raw.listingUrl) ? raw.listingUrl.trim() : undefined,
    source: isNonEmptyString(raw.source) ? raw.source.trim() : undefined,
    lastSeenAt: isNonEmptyString(raw.lastSeenAt) ? raw.lastSeenAt.trim() : undefined,
    isAvailable: raw.isAvailable === false ? false : true,
  };
}

async function loadCommercialListingsFromDatabase(): Promise<CommercialListing[]> {
  if (!hasDatabaseConfigured()) {
    return [];
  }

  const db = getDbPool();
  if (!db) {
    return [];
  }

  await ensureLiveListingsSchema();

  const result = await db.query(`
    SELECT
      id,
      title,
      address,
      lat,
      lng,
      property_type AS "propertyType",
      asking_rent_monthly AS "askingRentMonthly",
      square_feet AS "squareFeet",
      zoning_or_use AS "zoningOrUse",
      parking_spaces AS "parkingSpaces",
      short_description AS "shortDescription",
      listing_url AS "listingUrl",
      source,
      last_seen_at AS "lastSeenAt",
      is_available AS "isAvailable"
    FROM live_commercial_listings
    WHERE is_available = TRUE
    ORDER BY updated_at DESC, title ASC
  `);

  return result.rows
    .map((row) => normalizeLiveListing(row as RawLiveCommercialListing))
    .filter((listing): listing is CommercialListing => listing !== null);
}

async function loadCommercialListingsFromJson(): Promise<CommercialListing[]> {
  try {
    const rawText = await readFile(liveListingsPath, 'utf8');
    const parsed = JSON.parse(rawText) as unknown;
    if (!Array.isArray(parsed)) {
      return commercialListings;
    }

    const liveListings = parsed
      .map((item) => normalizeLiveListing(item as RawLiveCommercialListing))
      .filter((listing): listing is CommercialListing => listing !== null)
      .filter((listing) => listing.isAvailable !== false);

    if (liveListings.length === 0) {
      return commercialListings;
    }

    return liveListings;
  } catch {
    return [];
  }
}

export async function loadCommercialListings(): Promise<CommercialListing[]> {
  const dbListings = await loadCommercialListingsFromDatabase().catch(() => []);
  if (dbListings.length > 0) {
    return dbListings;
  }

  const jsonListings = await loadCommercialListingsFromJson();
  if (jsonListings.length > 0) {
    return jsonListings;
  }

  return commercialListings;
}

export async function getAvailableCommercialPropertyTypes(): Promise<Array<CommercialPropertyType | 'Any'>> {
  const listings = await loadCommercialListings();
  return ['Any', ...new Set(listings.map((listing) => listing.propertyType))];
}
