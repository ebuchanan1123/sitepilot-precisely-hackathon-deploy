import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { geocodeAddress } from '../src/services/geocode.js';
import { ensureLiveListingsSchema, getDbPool, hasDatabaseConfigured } from '../src/services/db.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(__dirname, '../data/liveCommercialListings.json');
const BASE_URL = 'https://www.spacelist.ca';
const MAX_LISTINGS_PER_PAGE = 20;
const MAX_LISTINGS_TOTAL = 120;
const PAGES_TO_FETCH = 3;

const SOURCE_CONFIG = [
  {
    slug: 'ottawa',
    listPaths: [
      '/listings/on/ottawa/for-lease',
      '/listings/on/ottawa/office/for-lease',
      '/listings/on/ottawa/retail/for-lease',
      '/listings/on/ottawa/industrial/for-lease',
    ],
  },
  {
    slug: 'gatineau',
    listPaths: [
      '/listings/qc/gatineau/for-lease',
      '/listings/qc/gatineau/office/for-lease',
      '/listings/qc/gatineau/retail/for-lease',
    ],
  },
] as const;

type CommercialPropertyType =
  | 'Storefront'
  | 'Office'
  | 'Mixed Use'
  | 'Restaurant'
  | 'Medical'
  | 'Flex'
  | 'Community Retail';

interface LiveListingRecord {
  id: string;
  title: string;
  address: string;
  lat: number;
  lng: number;
  propertyType: CommercialPropertyType;
  askingRentMonthly: number;
  squareFeet: number;
  zoningOrUse: string;
  parkingSpaces: number | null;
  shortDescription: string;
  listingUrl: string;
  source: string;
  lastSeenAt: string;
  isAvailable: boolean;
}

async function writeListingsToDatabase(listings: LiveListingRecord[]): Promise<boolean> {
  if (!hasDatabaseConfigured()) {
    return false;
  }

  const db = getDbPool();
  if (!db) {
    return false;
  }

  await ensureLiveListingsSchema();

  await db.query('BEGIN');

  try {
    await db.query('UPDATE live_commercial_listings SET is_available = FALSE, updated_at = NOW()');

    for (const listing of listings) {
      await db.query(
        `
          INSERT INTO live_commercial_listings (
            id,
            title,
            address,
            lat,
            lng,
            property_type,
            asking_rent_monthly,
            square_feet,
            zoning_or_use,
            parking_spaces,
            short_description,
            listing_url,
            source,
            last_seen_at,
            is_available,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, TRUE, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            address = EXCLUDED.address,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            property_type = EXCLUDED.property_type,
            asking_rent_monthly = EXCLUDED.asking_rent_monthly,
            square_feet = EXCLUDED.square_feet,
            zoning_or_use = EXCLUDED.zoning_or_use,
            parking_spaces = EXCLUDED.parking_spaces,
            short_description = EXCLUDED.short_description,
            listing_url = EXCLUDED.listing_url,
            source = EXCLUDED.source,
            last_seen_at = EXCLUDED.last_seen_at,
            is_available = TRUE,
            updated_at = NOW()
        `,
        [
          listing.id,
          listing.title,
          listing.address,
          listing.lat,
          listing.lng,
          listing.propertyType,
          listing.askingRentMonthly,
          listing.squareFeet,
          listing.zoningOrUse,
          listing.parkingSpaces,
          listing.shortDescription,
          listing.listingUrl,
          listing.source,
          listing.lastSeenAt,
        ],
      );
    }

    await db.query('COMMIT');
    return true;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

interface ListingCandidate {
  id: string;
  url: string;
  streetAddress: string;
  city: string;
  region: string;
  propertyType: CommercialPropertyType;
  rawPropertyType: string;
  askingRentMonthly: number;
  squareFeet: number;
  lat?: number;
  lng?: number;
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&sup2;/gi, '²')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toAbsoluteUrl(href: string): string {
  return href.startsWith('http') ? href : `${BASE_URL}${href}`;
}

function parseSquareFeet(value: string): number | null {
  const match = value.match(/([\d,]+)(?:\s*-\s*[\d,]+)?\s*ft²/i);
  if (!match) return null;
  const parsed = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCurrency(value: string): number | null {
  const match = value.match(/\$([\d,.]+)/i);
  if (!match) return null;
  const parsed = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePropertyType(value: string): CommercialPropertyType {
  const lower = value.toLowerCase();
  if (lower.includes('medical')) return 'Medical';
  if (lower.includes('restaurant')) return 'Restaurant';
  if (lower.includes('retail')) return 'Storefront';
  if (lower.includes('industrial')) return 'Flex';
  if (lower.includes('office')) return 'Office';
  if (lower.includes('mixed')) return 'Mixed Use';
  return 'Community Retail';
}

function inferZoningOrUse(propertyType: CommercialPropertyType, rawType: string): string {
  const lower = rawType.toLowerCase();
  if (lower.includes('/')) {
    return `${rawType} commercial use`;
  }

  switch (propertyType) {
    case 'Medical':
      return 'Medical / wellness commercial use';
    case 'Restaurant':
      return 'Restaurant / hospitality use';
    case 'Storefront':
      return 'Retail / storefront use';
    case 'Flex':
      return 'Industrial / flex commercial use';
    case 'Office':
      return 'Office / professional services use';
    case 'Mixed Use':
      return 'Mixed-use commercial';
    case 'Community Retail':
      return 'Neighbourhood retail / service commercial';
  }
}

function extractDescription(text: string, propertyType: CommercialPropertyType, address: string): string {
  return `${propertyType} listing in the Ottawa-Gatineau beta coverage area near ${address}.`;
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'");
}

function extractCoordinatesByListingId(html: string): Map<string, { lat: number; lng: number }> {
  const coordsById = new Map<string, { lat: number; lng: number }>();
  const dataMatch = html.match(/data-map-points="([^"]+)"/i);
  if (!dataMatch) return coordsById;

  try {
    const decoded = decodeHtmlAttribute(dataMatch[1]);
    const parsed = JSON.parse(decoded) as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] };
        properties?: { id?: number | string };
      }>;
    };

    for (const feature of parsed.features ?? []) {
      const id = feature.properties?.id;
      const coordinates = feature.geometry?.coordinates;
      if (id == null || !coordinates || coordinates.length < 2) continue;

      coordsById.set(String(id), {
        lng: coordinates[0],
        lat: coordinates[1],
      });
    }
  } catch {
    return coordsById;
  }

  return coordsById;
}

function extractListingCandidates(html: string): ListingCandidate[] {
  const coordsById = extractCoordinatesByListingId(html);
  const candidates: ListingCandidate[] = [];
  const chunks = html.split('<div class="listing-result cell shrink"').slice(1);

  for (const chunk of chunks) {
    const listingIdMatch = chunk.match(/<div class="listing-card listing-(\d+)">/i);
    const urlMatch = chunk.match(/<meta itemprop="url" value="([^"]+\/for-lease\/[^"]+)" \/>/i);
    const sizeMatch = chunk.match(/<div class="default-font dark-font flat-line-height">([^<]+)<\/div>/i);
    const typeMatch = chunk.match(/<div class="heavy-font gray-font tiny-font[^"]*">([^<]+)<\/div>/i);
    const rentPerMonthMatch = chunk.match(/<div class="rent_per_month">([^<]+)<\/div>/i);
    const streetMatch = chunk.match(/<div class="dark-font truncated-text" title="([^"]+)">/i);
    const cityRegionMatch = chunk.match(/itemprop="addressLocality" value="([^"]+)" \/><meta itemprop="addressRegion" value="([^"]+)"/i);

    if (!listingIdMatch || !urlMatch || !sizeMatch || !typeMatch || !rentPerMonthMatch || !streetMatch || !cityRegionMatch) {
      continue;
    }

    const listingId = listingIdMatch[1];
    const coords = coordsById.get(listingId);

    const squareFeet = parseSquareFeet(stripHtml(sizeMatch[1]));
    const askingRentMonthly = parseCurrency(stripHtml(rentPerMonthMatch[1]));
    if (squareFeet == null || askingRentMonthly == null) continue;

    const rawPropertyType = stripHtml(typeMatch[1]);
    const propertyType = normalizePropertyType(rawPropertyType);

    candidates.push({
      id: listingId,
      url: toAbsoluteUrl(urlMatch[1]),
      streetAddress: stripHtml(streetMatch[1]),
      city: stripHtml(cityRegionMatch[1]),
      region: stripHtml(cityRegionMatch[2]),
      propertyType,
      rawPropertyType,
      askingRentMonthly,
      squareFeet,
      lat: coords?.lat,
      lng: coords?.lng,
    });
  }

  return candidates.slice(0, MAX_LISTINGS_PER_PAGE);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'SitePilotBot/0.1 (+portfolio project; Ottawa-Gatineau commercial listing ingestion)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && /HTTP 404\b/.test(error.message);
}

async function toListingRecord(candidate: ListingCandidate, sourceSlug: string): Promise<LiveListingRecord> {
  const address = `${candidate.streetAddress}, ${candidate.city}, ${candidate.region}`;
  const title = `${candidate.rawPropertyType} space at ${candidate.streetAddress}`;
  const geocode = candidate.lat != null && candidate.lng != null
    ? { lat: candidate.lat, lng: candidate.lng }
    : await geocodeAddress(address, { requirePrecise: false });

  return {
    id: `${sourceSlug}-${slugify(address)}-${candidate.squareFeet}`,
    title,
    address,
    lat: geocode.lat,
    lng: geocode.lng,
    propertyType: candidate.propertyType,
    askingRentMonthly: candidate.askingRentMonthly,
    squareFeet: candidate.squareFeet,
    zoningOrUse: inferZoningOrUse(candidate.propertyType, candidate.rawPropertyType),
    parkingSpaces: null,
    shortDescription: extractDescription('', candidate.propertyType, address),
    listingUrl: candidate.url,
    source: sourceSlug,
    lastSeenAt: new Date().toISOString(),
    isAvailable: true,
  };
}

async function ingestRegion(region: (typeof SOURCE_CONFIG)[number]): Promise<LiveListingRecord[]> {
  const candidatesById = new Map<string, ListingCandidate>();

  for (const listPath of region.listPaths) {
    for (let page = 1; page <= PAGES_TO_FETCH; page += 1) {
      const pagePath = page === 1 ? listPath : `${listPath}/page/${page}`;
      let listHtml: string;
      try {
        listHtml = await fetchText(`${BASE_URL}${pagePath}`);
      } catch (error) {
        if (isNotFoundError(error)) {
          break;
        }
        throw error;
      }
      const candidates = extractListingCandidates(listHtml);

      for (const candidate of candidates) {
        candidatesById.set(candidate.id, candidate);
      }
    }
  }

  const parsedListings = await Promise.allSettled(
    [...candidatesById.values()].map((candidate) => toListingRecord(candidate, `spacelist_${region.slug}`)),
  );

  return parsedListings
    .flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
    .slice(0, MAX_LISTINGS_TOTAL);
}

const allListings = (await Promise.all(SOURCE_CONFIG.map((region) => ingestRegion(region)))).flat();

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(allListings, null, 2)}\n`, 'utf8');

const wroteToDatabase = await writeListingsToDatabase(allListings).catch((error) => {
  console.error('Failed to write live listings to Postgres:', error);
  return false;
});

console.log(
  `Wrote ${allListings.length} Ottawa-Gatineau live listing(s) to ${outputPath}${wroteToDatabase ? ' and Postgres' : ''}`,
);
