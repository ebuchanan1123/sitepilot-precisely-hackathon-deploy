import type { CommercialListing, CommercialPropertyType } from '../data/commercialListings.js';
import type { BusinessType } from './scoring.js';
import { calculateDistanceKm } from '../utils/helpers.js';
import { fetchDemographics, geocodeAddress, type LocationDemographics } from './geocode.js';
import { getAvailableCommercialPropertyTypes, loadCommercialListings } from './liveListings.js';

export interface RealEstateMatchRequest {
  businessType: BusinessType;
  lat: number;
  lng: number;
  targetAddress?: string;
  budget?: number;
  desiredSquareFeet?: number;
  preferredPropertyType?: CommercialPropertyType | 'Any';
}

export interface RankedCommercialListing {
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
  distanceKm: number;
  fitScore: number;
  matchReasons: string[];
  shortDescription: string;
  demographics: LocationDemographics | null;
  listingUrl?: string;
  source?: string;
}

interface BusinessPreferences {
  compatiblePropertyTypes: CommercialPropertyType[];
  zoningKeywords: string[];
  distanceWeight: number;
  affordabilityWeight: number;
  sizeWeight: number;
  compatibilityWeight: number;
}

type RiverSide = 'ottawa' | 'gatineau' | 'unknown';
type SearchStrategy = {
  radiusSteps: number[];
  minimumResultsBeforeExpanding: number;
  requireSameSideFirst: boolean;
};

const BUSINESS_PREFERENCES: Record<BusinessType, BusinessPreferences> = {
  coffee_shop: {
    compatiblePropertyTypes: ['Storefront', 'Mixed Use', 'Community Retail', 'Restaurant'],
    zoningKeywords: ['retail', 'restaurant', 'mainstreet', 'mixed'],
    distanceWeight: 0.3,
    affordabilityWeight: 0.2,
    sizeWeight: 0.15,
    compatibilityWeight: 0.35,
  },
  clinic: {
    compatiblePropertyTypes: ['Medical', 'Office', 'Mixed Use'],
    zoningKeywords: ['medical', 'wellness', 'office', 'service'],
    distanceWeight: 0.2,
    affordabilityWeight: 0.2,
    sizeWeight: 0.2,
    compatibilityWeight: 0.4,
  },
  gym: {
    compatiblePropertyTypes: ['Flex', 'Mixed Use', 'Storefront'],
    zoningKeywords: ['flex', 'fitness', 'commercial', 'mixed'],
    distanceWeight: 0.2,
    affordabilityWeight: 0.2,
    sizeWeight: 0.25,
    compatibilityWeight: 0.35,
  },
  grocery: {
    compatiblePropertyTypes: ['Storefront', 'Community Retail', 'Mixed Use', 'Flex'],
    zoningKeywords: ['retail', 'commercial', 'mixed', 'showroom'],
    distanceWeight: 0.2,
    affordabilityWeight: 0.2,
    sizeWeight: 0.25,
    compatibilityWeight: 0.35,
  },
  restaurant: {
    compatiblePropertyTypes: ['Restaurant', 'Storefront', 'Mixed Use'],
    zoningKeywords: ['restaurant', 'food', 'mainstreet', 'mixed', 'retail'],
    distanceWeight: 0.3,
    affordabilityWeight: 0.2,
    sizeWeight: 0.15,
    compatibilityWeight: 0.35,
  },
  pharmacy: {
    compatiblePropertyTypes: ['Storefront', 'Medical', 'Community Retail', 'Mixed Use'],
    zoningKeywords: ['medical', 'retail', 'service', 'commercial'],
    distanceWeight: 0.25,
    affordabilityWeight: 0.2,
    sizeWeight: 0.2,
    compatibilityWeight: 0.35,
  },
  bar: {
    compatiblePropertyTypes: ['Restaurant', 'Storefront', 'Mixed Use'],
    zoningKeywords: ['restaurant', 'mainstreet', 'mixed', 'entertainment'],
    distanceWeight: 0.3,
    affordabilityWeight: 0.2,
    sizeWeight: 0.15,
    compatibilityWeight: 0.35,
  },
  retail: {
    compatiblePropertyTypes: ['Storefront', 'Community Retail', 'Mixed Use'],
    zoningKeywords: ['retail', 'mainstreet', 'commercial', 'mixed'],
    distanceWeight: 0.25,
    affordabilityWeight: 0.2,
    sizeWeight: 0.2,
    compatibilityWeight: 0.35,
  },
  salon: {
    compatiblePropertyTypes: ['Storefront', 'Mixed Use', 'Community Retail', 'Office'],
    zoningKeywords: ['retail', 'service', 'mainstreet', 'commercial'],
    distanceWeight: 0.25,
    affordabilityWeight: 0.25,
    sizeWeight: 0.15,
    compatibilityWeight: 0.35,
  },
};

function scoreDistance(distanceKm: number): number {
  if (distanceKm <= 0.5) return 100;
  if (distanceKm <= 1.5) return 88;
  if (distanceKm <= 3) return 72;
  if (distanceKm <= 5) return 55;
  return 30;
}

function scoreAffordability(rent: number, budget?: number): number {
  if (!budget || budget <= 0) {
    if (rent <= 4500) return 82;
    if (rent <= 6000) return 70;
    return 58;
  }

  const ratio = rent / budget;
  if (ratio <= 0.8) return 100;
  if (ratio <= 1) return 88;
  if (ratio <= 1.15) return 66;
  if (ratio <= 1.3) return 42;
  return 20;
}

function scoreSize(squareFeet: number, desiredSquareFeet?: number): number {
  if (!desiredSquareFeet || desiredSquareFeet <= 0) {
    if (squareFeet >= 1200 && squareFeet <= 2200) return 82;
    if (squareFeet >= 900 && squareFeet <= 2800) return 70;
    return 58;
  }

  const diffRatio = Math.abs(squareFeet - desiredSquareFeet) / desiredSquareFeet;
  if (diffRatio <= 0.1) return 100;
  if (diffRatio <= 0.2) return 88;
  if (diffRatio <= 0.35) return 72;
  if (diffRatio <= 0.5) return 52;
  return 28;
}

function scoreCompatibility(listing: CommercialListing, businessType: BusinessType): number {
  const preferences = BUSINESS_PREFERENCES[businessType] ?? BUSINESS_PREFERENCES.coffee_shop;
  let score = preferences.compatiblePropertyTypes.includes(listing.propertyType) ? 82 : 48;

  const zoning = listing.zoningOrUse.toLowerCase();
  if (preferences.zoningKeywords.some((keyword) => zoning.includes(keyword))) {
    score += 12;
  }

  if (businessType === 'coffee_shop' && (listing.propertyType === 'Storefront' || zoning.includes('mainstreet'))) {
    score += 6;
  }
  if (businessType === 'clinic' && (listing.propertyType === 'Medical' || (listing.parkingSpaces ?? 0) >= 4)) {
    score += 10;
  }
  if (businessType === 'gym' && listing.squareFeet >= 1600) {
    score += 8;
  }
  if (businessType === 'grocery' && listing.squareFeet >= 1500 && (listing.parkingSpaces ?? 0) >= 3) {
    score += 10;
  }

  return Math.min(100, score);
}

function inferRiverSideFromAddress(address?: string): RiverSide {
  if (!address) {
    return 'unknown';
  }

  const lower = address.toLowerCase();
  if (/\bgatineau\b|\bhull\b|\bqc\b|\bquebec\b/.test(lower)) {
    return 'gatineau';
  }
  if (/\bottawa\b|\bon\b|\bontario\b/.test(lower)) {
    return 'ottawa';
  }
  return 'unknown';
}

function getRadiusSteps(businessType: BusinessType): number[] {
  switch (businessType) {
    case 'coffee_shop':
    case 'restaurant':
    case 'bar':
    case 'retail':
    case 'salon':
      return [2.5, 4, 6];
    case 'clinic':
    case 'pharmacy':
    case 'grocery':
      return [3, 6, 10];
    case 'gym':
      return [4, 8, 12];
    default:
      return [3, 6, 10];
  }
}

function getSideBias(targetSide: RiverSide, listingAddress: string): number {
  if (targetSide === 'unknown') {
    return 0;
  }

  const listingSide = inferRiverSideFromAddress(listingAddress);
  if (listingSide === 'unknown') {
    return 0;
  }

  return listingSide === targetSide ? 10 : -14;
}

function getSearchStrategy(businessType: BusinessType): SearchStrategy {
  switch (businessType) {
    case 'coffee_shop':
    case 'restaurant':
    case 'bar':
    case 'retail':
    case 'salon':
      return {
        radiusSteps: getRadiusSteps(businessType),
        minimumResultsBeforeExpanding: 5,
        requireSameSideFirst: true,
      };
    case 'clinic':
    case 'pharmacy':
    case 'grocery':
      return {
        radiusSteps: getRadiusSteps(businessType),
        minimumResultsBeforeExpanding: 5,
        requireSameSideFirst: true,
      };
    default:
      return {
        radiusSteps: getRadiusSteps(businessType),
        minimumResultsBeforeExpanding: 4,
        requireSameSideFirst: false,
      };
  }
}

function normalizeListingGroupKey(address: string): string {
  return address
    .toLowerCase()
    .replace(/^(suite|unit|local|bureau)\s+[a-z0-9-]+\s*-\s*/i, '')
    .replace(/^[a-z0-9&/ -]+\s*-\s*(\d+\s)/i, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeNearbyListings(listings: RankedCommercialListing[]): RankedCommercialListing[] {
  const listingsByGroup = new Map<string, RankedCommercialListing>();

  for (const listing of listings) {
    const groupKey = normalizeListingGroupKey(listing.address);
    const existing = listingsByGroup.get(groupKey);
    if (!existing || listing.fitScore > existing.fitScore) {
      listingsByGroup.set(groupKey, listing);
    }
  }

  return [...listingsByGroup.values()].sort((a, b) => b.fitScore - a.fitScore || a.distanceKm - b.distanceKm);
}

function sanitizeListingAddressForGeocode(address: string): string {
  return address
    .replace(/^(suite|unit|local|bureau)\s+[a-z0-9-]+\s*-\s*/i, '')
    .replace(/^[a-z0-9&/ -]+\s*-\s*(\d+\s)/i, '$1')
    .trim();
}

function buildMatchReasons(
  listing: CommercialListing,
  businessType: BusinessType,
  distanceKm: number,
  budget?: number,
  desiredSquareFeet?: number,
): string[] {
  const reasons: string[] = [];

  if (distanceKm <= 1.5) {
    reasons.push(`${distanceKm.toFixed(1)} km from the evaluated area, keeping the search tightly focused nearby.`);
  } else if (distanceKm <= 3) {
    reasons.push(`Still close to the evaluated trade area at ${distanceKm.toFixed(1)} km away.`);
  }

  if (budget && listing.askingRentMonthly <= budget) {
    reasons.push(`Within the current rent target at CA$${listing.askingRentMonthly.toLocaleString()}/month.`);
  } else if (!budget && listing.askingRentMonthly <= 5000) {
    reasons.push(`Reasonable monthly rent for a hackathon-ready shortlist at CA$${listing.askingRentMonthly.toLocaleString()}.`);
  }

  if (desiredSquareFeet) {
    const difference = Math.abs(listing.squareFeet - desiredSquareFeet);
    if (difference <= desiredSquareFeet * 0.2) {
      reasons.push(`Square footage is close to the target footprint at ${listing.squareFeet.toLocaleString()} sq ft.`);
    }
  } else if (listing.squareFeet >= 1200 && listing.squareFeet <= 2200) {
    reasons.push(`Balanced footprint at ${listing.squareFeet.toLocaleString()} sq ft for a flexible operating layout.`);
  }

  if (businessType === 'coffee_shop' && ['Storefront', 'Mixed Use', 'Community Retail'].includes(listing.propertyType)) {
    reasons.push('Storefront-oriented format aligns with a coffee concept that benefits from visibility and walk-up access.');
  }
  if (businessType === 'clinic' && (listing.propertyType === 'Medical' || (listing.parkingSpaces ?? 0) >= 4)) {
    reasons.push('Parking and professional use compatibility make it easier to support appointment-based clinic traffic.');
  }
  if (businessType === 'gym' && listing.propertyType === 'Flex') {
    reasons.push('Flex-style space is a practical fit for equipment layouts, open floor plans, and member circulation.');
  }
  if (businessType === 'grocery' && ['Community Retail', 'Storefront', 'Mixed Use'].includes(listing.propertyType)) {
    reasons.push('Neighbourhood-facing commercial use supports repeat visits and everyday convenience shopping.');
  }
  if (businessType === 'restaurant' && ['Restaurant', 'Mixed Use'].includes(listing.propertyType)) {
    reasons.push('Pre-fitted restaurant shell reduces build-out cost and speeds up time to open.');
  }
  if (businessType === 'pharmacy' && ['Medical', 'Community Retail'].includes(listing.propertyType)) {
    reasons.push('Proximity to medical uses and accessible parking support high prescription pickup volume.');
  }
  if (businessType === 'bar' && listing.zoningOrUse.toLowerCase().includes('entertainment')) {
    reasons.push('Zoning permits licensed premises and extended-hours operation for a bar or pub concept.');
  }
  if (businessType === 'retail' && listing.propertyType === 'Storefront') {
    reasons.push('Street-front retail format maximises display visibility and drop-in browsing traffic.');
  }
  if (businessType === 'salon' && (listing.propertyType === 'Storefront' || listing.propertyType === 'Office')) {
    reasons.push('Private-room potential and a residential-adjacent setting attract loyal appointment-based clientele.');
  }

  if (reasons.length === 0) {
    reasons.push(`Zoning and property format are compatible with a ${businessType.replace('_', ' ')} concept.`);
  }

  return reasons.slice(0, 3);
}

export async function getCommercialPropertyTypes(): Promise<Array<CommercialPropertyType | 'Any'>> {
  return getAvailableCommercialPropertyTypes();
}

export async function matchCommercialListings(request: RealEstateMatchRequest): Promise<RankedCommercialListing[]> {
  const preferences = BUSINESS_PREFERENCES[request.businessType] ?? BUSINESS_PREFERENCES.coffee_shop;
  const commercialListings = await loadCommercialListings();
  const targetSide = inferRiverSideFromAddress(request.targetAddress);
  const searchStrategy = getSearchStrategy(request.businessType);

  const scoredListings = commercialListings
    .map((listing) => {
      const distanceKm = calculateDistanceKm(request.lat, request.lng, listing.lat, listing.lng);
      const distanceScore = scoreDistance(distanceKm);
      const affordabilityScore = scoreAffordability(listing.askingRentMonthly, request.budget);
      const sizeScore = scoreSize(listing.squareFeet, request.desiredSquareFeet);
      const compatibilityScore = scoreCompatibility(listing, request.businessType);
      const sideBias = getSideBias(targetSide, listing.address);

      let fitScore = Math.round(
        distanceScore * preferences.distanceWeight +
          affordabilityScore * preferences.affordabilityWeight +
          sizeScore * preferences.sizeWeight +
          compatibilityScore * preferences.compatibilityWeight,
      );

      if (request.preferredPropertyType && request.preferredPropertyType !== 'Any') {
        fitScore += listing.propertyType === request.preferredPropertyType ? 6 : -12;
      }

      fitScore += sideBias;
      fitScore = Math.max(0, Math.min(100, fitScore));

      return {
        id: listing.id,
        title: listing.title,
        address: listing.address,
        lat: listing.lat,
        lng: listing.lng,
        propertyType: listing.propertyType,
        askingRentMonthly: listing.askingRentMonthly,
        squareFeet: listing.squareFeet,
        zoningOrUse: listing.zoningOrUse,
        parkingSpaces: listing.parkingSpaces,
        distanceKm: parseFloat(distanceKm.toFixed(2)),
        fitScore,
        matchReasons: buildMatchReasons(
          listing,
          request.businessType,
          distanceKm,
          request.budget,
          request.desiredSquareFeet,
        ),
        shortDescription: listing.shortDescription,
        demographics: null as LocationDemographics | null,
        listingUrl: listing.listingUrl,
        source: listing.source,
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore || a.distanceKm - b.distanceKm);

  const sameSideListings =
    searchStrategy.requireSameSideFirst && targetSide !== 'unknown'
      ? scoredListings.filter((listing) => inferRiverSideFromAddress(listing.address) === targetSide)
      : scoredListings;

  let ranked = dedupeNearbyListings(
    sameSideListings.filter((listing) => listing.distanceKm <= searchStrategy.radiusSteps[0]),
  );

  for (const radius of searchStrategy.radiusSteps) {
    const nextListings = dedupeNearbyListings(
      sameSideListings.filter((listing) => listing.distanceKm <= radius),
    );
    ranked = nextListings;
    if (ranked.length >= searchStrategy.minimumResultsBeforeExpanding) {
      break;
    }
  }

  if (ranked.length < searchStrategy.minimumResultsBeforeExpanding) {
    for (const radius of searchStrategy.radiusSteps) {
      const nextListings = dedupeNearbyListings(
        scoredListings.filter((listing) => listing.distanceKm <= radius),
      );
      ranked = nextListings;
      if (ranked.length >= searchStrategy.minimumResultsBeforeExpanding) {
        break;
      }
    }
  }

  ranked = ranked.slice(0, 8);

  const results = await Promise.allSettled(
    ranked.map(async (listing) => {
      const [preciseGeocode, demographics] = await Promise.all([
        geocodeAddress(sanitizeListingAddressForGeocode(listing.address), { requirePrecise: true }).catch(() => null),
        fetchDemographics(listing.address).catch(() => null),
      ]);

      const resolvedLat = preciseGeocode?.lat ?? listing.lat;
      const resolvedLng = preciseGeocode?.lng ?? listing.lng;
      const resolvedDistanceKm = calculateDistanceKm(request.lat, request.lng, resolvedLat, resolvedLng);

      return {
        ...listing,
        lat: resolvedLat,
        lng: resolvedLng,
        distanceKm: parseFloat(resolvedDistanceKm.toFixed(2)),
        matchReasons: buildMatchReasons(
          {
            id: listing.id,
            title: listing.title,
            address: listing.address,
            lat: resolvedLat,
            lng: resolvedLng,
            propertyType: listing.propertyType,
            askingRentMonthly: listing.askingRentMonthly,
            squareFeet: listing.squareFeet,
            zoningOrUse: listing.zoningOrUse,
            parkingSpaces: listing.parkingSpaces,
            shortDescription: listing.shortDescription,
            listingUrl: listing.listingUrl,
            source: listing.source,
          },
          request.businessType,
          resolvedDistanceKm,
          request.budget,
          request.desiredSquareFeet,
        ),
        demographics,
      };
    }),
  );

  return results.map((r) => (r.status === 'fulfilled' ? r.value : ranked[results.indexOf(r)]));
}
