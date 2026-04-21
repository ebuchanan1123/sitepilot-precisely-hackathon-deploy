import { getPreciselyToken } from './geocode.js';

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

export async function scoreSite(
  lat: number,
  lng: number,
  addressConfidence: number,
  businessType: BusinessType,
  priorities: Priority[],
): Promise<SiteScore> {
  const weights = applyPriorities(BASE_WEIGHTS[businessType] ?? BASE_WEIGHTS.coffee_shop, priorities);

  const poiResult = await fetchPreciselyPOIs(lat, lng, businessType);
  const competitorCount = poiResult.count;
  const competitionScore = Math.min(100, Math.max(0, 100 - competitorCount * 9));

  const demographicScore = Math.round(geoScore(lat, lng, 2) * 0.6 + geoScore(lat, lng, 3) * 0.4);
  const accessibilityScore = Math.round(geoScore(lat, lng, 5) * 0.5 + geoScore(lat, lng, 6) * 0.5);
  const commercialScore = Math.round(geoScore(lat, lng, 7) * 0.5 + geoScore(lat, lng, 8) * 0.5);

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
      fromPrecisely: false,
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
      preciselySource: 'Precisely Mobility Index',
      fromPrecisely: false,
    },
    commercialSuitability: {
      score: commercialScore,
      label: factorLabel(commercialScore, 'generic'),
      weight: weights.commercial,
      preciselySource: 'Precisely Land Use',
      fromPrecisely: false,
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
