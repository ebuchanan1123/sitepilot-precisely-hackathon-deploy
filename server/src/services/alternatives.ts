import { scoreSite, geoScore, type BusinessType, type Priority } from './scoring.js';
import { calculateDistanceKm } from '../utils/helpers.js';

export interface AlternativeLocation {
  address: string;
  lat: number;
  lng: number;
  score: number;
  delta: number;
  distanceKm: number;
  direction: string;
  reasons: string[];
}

const CANDIDATE_OFFSETS: Array<[number, number, string]> = [
  [0.004,  0.006, 'NE'],
  [-0.006, 0.004, 'NW'],
  [0.007, -0.003, 'E'],
  [-0.004,-0.007, 'SW'],
  [0.000,  0.009, 'N'],
  [0.009,  0.000, 'E'],
  [-0.009, 0.000, 'W'],
  [0.003, -0.008, 'S'],
  [0.012,  0.008, 'NE'],
  [-0.010, 0.010, 'NW'],
  [0.014, -0.004, 'E'],
  [-0.005,-0.013, 'SW'],
  [0.001,  0.015, 'N'],
  [-0.013, 0.002, 'W'],
];

const STREET_NAMES = ['Main St', 'Commerce Blvd', 'Market Ave', 'Broadway', 'Oak St', 'Park Ave', 'Elm St',
  'Madison Ave', 'Washington Blvd', 'Lincoln Way', 'Highland Ave', 'Central Ave', 'Prospect St', 'Union St'];

function syntheticAddress(lat: number, lng: number, direction: string): string {
  const seed = Math.abs(Math.sin(lat * 99.1 + lng * 77.3) * 9999) | 0;
  const num = 100 + (seed % 800);
  const street = STREET_NAMES[seed % STREET_NAMES.length];
  return `${num} ${street} (${direction} area)`;
}

export async function generateAlternatives(
  baseLat: number,
  baseLng: number,
  baseScore: number,
  businessType: BusinessType,
  priorities: Priority[],
  addressConfidence: number,
): Promise<AlternativeLocation[]> {
  const candidates = await Promise.all(
    CANDIDATE_OFFSETS.map(async ([dlat, dlng, dir]) => {
      const lat = parseFloat((baseLat + dlat).toFixed(6));
      const lng = parseFloat((baseLng + dlng).toFixed(6));

      // Use deterministic scoring for alternatives (skip POI API to avoid rate limits)
      const compScore = Math.min(100, Math.max(0, 100 - geoScore(lat, lng, 4) * 0.12));
      const demoScore = Math.round(geoScore(lat, lng, 2) * 0.6 + geoScore(lat, lng, 3) * 0.4);
      const accScore  = Math.round(geoScore(lat, lng, 5) * 0.5 + geoScore(lat, lng, 6) * 0.5);
      const commScore = Math.round(geoScore(lat, lng, 7) * 0.5 + geoScore(lat, lng, 8) * 0.5);

      const weights: Record<BusinessType, number[]> = {
        coffee_shop: [0.10, 0.25, 0.30, 0.25, 0.10],
        clinic:      [0.15, 0.20, 0.20, 0.25, 0.20],
        gym:         [0.10, 0.25, 0.25, 0.25, 0.15],
        grocery:     [0.10, 0.30, 0.25, 0.20, 0.15],
        restaurant:  [0.10, 0.22, 0.32, 0.21, 0.15],
        pharmacy:    [0.15, 0.22, 0.18, 0.20, 0.25],
        bar:         [0.10, 0.18, 0.34, 0.23, 0.15],
        retail:      [0.10, 0.24, 0.26, 0.22, 0.18],
        salon:       [0.12, 0.23, 0.24, 0.23, 0.18],
      };
      const [wa, wd, wc, wacc, wcomm] = weights[businessType] ?? weights.coffee_shop;
      const score = Math.round(
        addressConfidence * wa + demoScore * wd + compScore * wc + accScore * wacc + commScore * wcomm,
      );

      return {
        lat, lng, dir,
        score: Math.min(100, Math.max(0, score)),
        address: syntheticAddress(lat, lng, dir),
        distanceKm: calculateDistanceKm(baseLat, baseLng, lat, lng),
        demoScore, compScore, accScore, commScore,
      };
    }),
  );

  const betterCandidates = candidates
    .filter((c) => c.score > baseScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return betterCandidates.map((c) => ({
    address: c.address,
    lat: c.lat,
    lng: c.lng,
    score: c.score,
    delta: c.score - baseScore,
    distanceKm: parseFloat(c.distanceKm.toFixed(2)),
    direction: c.dir,
    reasons: [],
  }));
}
