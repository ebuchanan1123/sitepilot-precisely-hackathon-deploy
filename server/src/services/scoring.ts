import { fetchDemographics, getPreciselyToken } from './geocode.js';
import { loadCommercialListings } from './liveListings.js';
import { calculateDistanceKm } from '../utils/helpers.js';

export type BusinessType = 'coffee_shop' | 'clinic' | 'gym' | 'grocery' | 'restaurant' | 'pharmacy' | 'bar' | 'retail' | 'salon';
export type Priority = 'high_foot_traffic' | 'low_competition' | 'family_area' | 'premium_demographic' | 'accessibility';

export interface FactorScore {
  score: number;
  label: string;
  weight: number;
  preciselySource: string;
  fromPrecisely: boolean;
}

export interface ScoreBreakdown {
  addressQuality: FactorScore;
  demographicFit: FactorScore;
  competitionDensity: FactorScore;
  accessibility: FactorScore;
  commercialSuitability: FactorScore;
}

export interface SiteScore {
  score: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  breakdown: ScoreBreakdown;
  nearbyCompetitorCount: number;
}

interface AmenityCounts {
  transit: number;
  shopping: number;
  parks: number;
}

interface Weights {
  address: number;
  demographic: number;
  competition: number;
  accessibility: number;
  commercial: number;
}

const BASE_WEIGHTS: Record<BusinessType, Weights> = {
  coffee_shop: { address: 0.10, demographic: 0.25, competition: 0.30, accessibility: 0.25, commercial: 0.10 },
  clinic:      { address: 0.15, demographic: 0.20, competition: 0.20, accessibility: 0.25, commercial: 0.20 },
  gym:         { address: 0.10, demographic: 0.25, competition: 0.25, accessibility: 0.25, commercial: 0.15 },
  grocery:     { address: 0.10, demographic: 0.30, competition: 0.25, accessibility: 0.20, commercial: 0.15 },
  restaurant:  { address: 0.10, demographic: 0.25, competition: 0.30, accessibility: 0.25, commercial: 0.10 },
  pharmacy:    { address: 0.10, demographic: 0.25, competition: 0.20, accessibility: 0.25, commercial: 0.20 },
  bar:         { address: 0.10, demographic: 0.20, competition: 0.30, accessibility: 0.30, commercial: 0.10 },
  retail:      { address: 0.10, demographic: 0.30, competition: 0.25, accessibility: 0.25, commercial: 0.10 },
  salon:       { address: 0.10, demographic: 0.30, competition: 0.25, accessibility: 0.20, commercial: 0.15 },
};

function applyPriorities(weights: Weights, priorities: Priority[]): Weights {
  const w = { ...weights };
  for (const p of priorities) {
    if (p === 'high_foot_traffic') { w.accessibility = Math.min(0.45, w.accessibility + 0.07); w.commercial -= 0.03; w.address -= 0.04; }
    if (p === 'low_competition')   { w.competition   = Math.min(0.45, w.competition   + 0.07); w.commercial -= 0.04; w.demographic -= 0.03; }
    if (p === 'family_area' || p === 'premium_demographic') { w.demographic = Math.min(0.45, w.demographic + 0.07); w.address -= 0.04; w.commercial -= 0.03; }
    if (p === 'accessibility')     { w.accessibility = Math.min(0.45, w.accessibility + 0.07); w.commercial -= 0.04; w.address -= 0.03; }
  }
  const total = w.address + w.demographic + w.competition + w.accessibility + w.commercial;
  return {
    address:      Math.max(0.05, w.address      / total),
    demographic:  Math.max(0.05, w.demographic  / total),
    competition:  Math.max(0.05, w.competition  / total),
    accessibility:Math.max(0.05, w.accessibility/ total),
    commercial:   Math.max(0.05, w.commercial   / total),
  };
}

function hashFract(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return Math.abs(s - Math.floor(s));
}

export function geoScore(lat: number, lng: number, seed: number): number {
  return Math.round(hashFract(lat + seed * 0.01, lng + seed * 0.017) * 100);
}

function factorLabel(score: number, dim: 'generic' | 'competition'): string {
  if (dim === 'competition') {
    if (score >= 80) return 'Low Competition';
    if (score >= 60) return 'Moderate Competition';
    if (score >= 40) return 'High Competition';
    return 'Saturated Market';
  }
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Strong';
  if (score >= 50) return 'Moderate';
  if (score >= 35) return 'Below Average';
  return 'Poor';
}

async function fetchPreciselyPOIs(
  lat: number,
  lng: number,
  businessType: BusinessType,
): Promise<{ count: number; fromPrecisely: boolean }> {
  const nameMap: Record<BusinessType, string> = {
    coffee_shop: 'Coffee',
    clinic: 'Clinic',
    gym: 'Fitness',
    grocery: 'Grocery',
    restaurant: 'Restaurant',
    pharmacy: 'Pharmacy',
    bar: 'Bar',
    retail: 'Shopping',
    salon: 'Salon',
  };
  try {
    const token = await getPreciselyToken();
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      searchRadius: '500',
      searchRadiusUnit: 'METERS',
      maxCandidates: '25',
      name: nameMap[businessType],
    });
    const resp = await fetch(`https://api.precisely.com/places/v1/poi/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`POI ${resp.status}`);
    const data = (await resp.json()) as { poi?: unknown[] };
    return { count: data.poi?.length ?? 0, fromPrecisely: true };
  } catch {
    const raw = geoScore(lat, lng, 4);
    return { count: Math.round((raw / 100) * 10), fromPrecisely: false };
  }
}

async function fetchAmenityCount(
  lat: number,
  lng: number,
  name: string,
  searchRadius = 1000,
): Promise<number> {
  const token = await getPreciselyToken();
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    searchRadius: searchRadius.toString(),
    searchRadiusUnit: 'METERS',
    maxCandidates: '25',
    name,
  });
  const resp = await fetch(`https://api.precisely.com/places/v1/poi/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`POI ${resp.status}`);
  const data = (await resp.json()) as { poi?: unknown[] };
  return data.poi?.length ?? 0;
}

async function fetchAmenityCounts(lat: number, lng: number): Promise<{ counts: AmenityCounts; fromPrecisely: boolean }> {
  try {
    const [transit, shopping, parks] = await Promise.all([
      fetchAmenityCount(lat, lng, 'Transit', 1200),
      fetchAmenityCount(lat, lng, 'Shopping', 1200),
      fetchAmenityCount(lat, lng, 'Park', 1500),
    ]);
    return {
      counts: { transit, shopping, parks },
      fromPrecisely: true,
    };
  } catch {
    return {
      counts: {
        transit: Math.round((geoScore(lat, lng, 9) / 100) * 6),
        shopping: Math.round((geoScore(lat, lng, 10) / 100) * 8),
        parks: Math.round((geoScore(lat, lng, 11) / 100) * 5),
      },
      fromPrecisely: false,
    };
  }
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function scoreLinear(value: number | null, min: number, max: number): number {
  if (value === null) return 50;
  if (value <= min) return 0;
  if (value >= max) return 100;
  return ((value - min) / (max - min)) * 100;
}

function demographicProfileScore(
  businessType: BusinessType,
  demographics: Awaited<ReturnType<typeof fetchDemographics>> | null,
): number {
  if (!demographics) {
    return 50;
  }

  const populationScore = scoreLinear(demographics.population, 800, 6000);
  const incomeScore = scoreLinear(demographics.averageHouseholdIncome, 65000, 165000);
  const educationScore = scoreLinear(demographics.educationBachelorsPct, 15, 65);
  const homeValueScore = scoreLinear(demographics.averageHomeValue, 300000, 1100000);

  switch (businessType) {
    case 'coffee_shop':
    case 'restaurant':
    case 'bar':
      return clampScore(populationScore * 0.35 + incomeScore * 0.30 + educationScore * 0.20 + homeValueScore * 0.15);
    case 'retail':
    case 'salon':
      return clampScore(populationScore * 0.30 + incomeScore * 0.30 + educationScore * 0.15 + homeValueScore * 0.25);
    case 'grocery':
    case 'pharmacy':
      return clampScore(populationScore * 0.45 + incomeScore * 0.20 + educationScore * 0.10 + homeValueScore * 0.25);
    case 'clinic':
      return clampScore(populationScore * 0.35 + incomeScore * 0.20 + educationScore * 0.20 + homeValueScore * 0.25);
    case 'gym':
      return clampScore(populationScore * 0.30 + incomeScore * 0.25 + educationScore * 0.25 + homeValueScore * 0.20);
    default:
      return clampScore(populationScore * 0.35 + incomeScore * 0.25 + educationScore * 0.20 + homeValueScore * 0.20);
  }
}

function accessibilityProfileScore(counts: AmenityCounts): number {
  return clampScore(
    Math.min(100, counts.transit * 20) * 0.45 +
    Math.min(100, counts.shopping * 12) * 0.35 +
    Math.min(100, counts.parks * 16) * 0.20,
  );
}

function compatibleCommercialTypes(businessType: BusinessType) {
  switch (businessType) {
    case 'coffee_shop':
    case 'restaurant':
    case 'bar':
      return new Set(['Storefront', 'Mixed Use', 'Community Retail', 'Restaurant']);
    case 'clinic':
      return new Set(['Medical', 'Office', 'Mixed Use']);
    case 'gym':
      return new Set(['Flex', 'Mixed Use', 'Storefront']);
    case 'grocery':
      return new Set(['Storefront', 'Community Retail', 'Mixed Use', 'Flex']);
    case 'pharmacy':
      return new Set(['Storefront', 'Medical', 'Community Retail', 'Mixed Use']);
    case 'retail':
    case 'salon':
      return new Set(['Storefront', 'Mixed Use', 'Community Retail', 'Office']);
    default:
      return new Set(['Storefront', 'Mixed Use', 'Community Retail']);
  }
}

async function fetchCommercialSuitability(
  lat: number,
  lng: number,
  businessType: BusinessType,
): Promise<{ score: number; fromPrecisely: boolean }> {
  try {
    const listings = await loadCommercialListings();
    const withinRadius = listings.filter((listing) => calculateDistanceKm(lat, lng, listing.lat, listing.lng) <= 2.5);
    const compatibleTypes = compatibleCommercialTypes(businessType);
    const compatible = withinRadius.filter((listing) => compatibleTypes.has(listing.propertyType));

    const coverageScore = Math.min(100, withinRadius.length * 10);
    const compatibilityScore = Math.min(100, compatible.length * 16);
    const ratioScore = withinRadius.length > 0 ? (compatible.length / withinRadius.length) * 100 : 35;

    return {
      score: clampScore(coverageScore * 0.30 + compatibilityScore * 0.45 + ratioScore * 0.25),
      fromPrecisely: false,
    };
  } catch {
    return {
      score: clampScore(geoScore(lat, lng, 7) * 0.5 + geoScore(lat, lng, 8) * 0.5),
      fromPrecisely: false,
    };
  }
}

export async function scoreSite(
  lat: number,
  lng: number,
  addressConfidence: number,
  businessType: BusinessType,
  priorities: Priority[],
  address?: string,
): Promise<SiteScore> {
  const weights = applyPriorities(BASE_WEIGHTS[businessType] ?? BASE_WEIGHTS.coffee_shop, priorities);

  const [poiResult, amenityResult, demographics, commercialResult] = await Promise.all([
    fetchPreciselyPOIs(lat, lng, businessType),
    fetchAmenityCounts(lat, lng),
    address ? fetchDemographics(address).catch(() => null) : Promise.resolve(null),
    fetchCommercialSuitability(lat, lng, businessType),
  ]);

  const competitorCount = poiResult.count;
  const competitionScore = Math.min(100, Math.max(0, 100 - competitorCount * 9));
  const demographicScore = demographics
    ? demographicProfileScore(businessType, demographics)
    : Math.round(geoScore(lat, lng, 2) * 0.6 + geoScore(lat, lng, 3) * 0.4);
  const accessibilityScore = accessibilityProfileScore(amenityResult.counts);
  const commercialScore = commercialResult.score;

  const breakdown: ScoreBreakdown = {
    addressQuality: {
      score: addressConfidence,
      label: addressConfidence >= 85 ? 'High Confidence' : addressConfidence >= 65 ? 'Medium Confidence' : 'Low Confidence',
      weight: weights.address,
      preciselySource: 'Precisely Address Validation',
      fromPrecisely: true,
    },
    demographicFit: {
      score: demographicScore,
      label: factorLabel(demographicScore, 'generic'),
      weight: weights.demographic,
      preciselySource: 'Precisely Demographics',
      fromPrecisely: demographics !== null,
    },
    competitionDensity: {
      score: competitionScore,
      label: factorLabel(competitionScore, 'competition'),
      weight: weights.competition,
      preciselySource: 'Precisely POI Intelligence',
      fromPrecisely: poiResult.fromPrecisely,
    },
    accessibility: {
      score: accessibilityScore,
      label: factorLabel(accessibilityScore, 'generic'),
      weight: weights.accessibility,
      preciselySource: 'Precisely Nearby Amenities',
      fromPrecisely: amenityResult.fromPrecisely,
    },
    commercialSuitability: {
      score: commercialScore,
      label: factorLabel(commercialScore, 'generic'),
      weight: weights.commercial,
      preciselySource: 'Commercial Listing Compatibility',
      fromPrecisely: commercialResult.fromPrecisely,
    },
  };

  const score = Math.round(
    breakdown.addressQuality.score    * weights.address +
    breakdown.demographicFit.score    * weights.demographic +
    breakdown.competitionDensity.score* weights.competition +
    breakdown.accessibility.score     * weights.accessibility +
    breakdown.commercialSuitability.score * weights.commercial,
  );

  const factorScores = Object.values(breakdown).map((f) => f.score);
  const variance = factorScores.reduce((acc, s) => acc + Math.abs(s - score), 0) / factorScores.length;
  const confNum = Math.max(40, Math.min(98, score - variance * 0.25 + addressConfidence * 0.08));

  return {
    score: Math.min(100, Math.max(0, score)),
    confidenceLevel: confNum >= 72 ? 'High' : confNum >= 55 ? 'Medium' : 'Low',
    breakdown,
    nearbyCompetitorCount: competitorCount,
  };
}
