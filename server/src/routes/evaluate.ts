import { Router, type Request, type Response } from 'express';
import { geocodeAddress } from '../services/geocode.js';
import { scoreSite, type BusinessType, type Priority } from '../services/scoring.js';
import { generateAlternatives } from '../services/alternatives.js';
import { generateExplanation } from '../services/llm.js';
import { isValidString } from '../utils/helpers.js';

const router = Router();

const VALID_BUSINESS_TYPES: BusinessType[] = ['coffee_shop', 'clinic', 'gym', 'grocery', 'restaurant', 'pharmacy', 'bar', 'retail', 'salon'];
const VALID_PRIORITIES: Priority[] = ['high_foot_traffic', 'low_competition', 'family_area', 'premium_demographic', 'accessibility'];
const BUSINESS_LABELS: Record<BusinessType, string> = {
  coffee_shop: 'Coffee Shop',
  clinic: 'Medical Clinic',
  gym: 'Fitness Center',
  grocery: 'Grocery Store',
  restaurant: 'Restaurant',
  pharmacy: 'Pharmacy',
  bar: 'Bar / Pub',
  retail: 'Retail Boutique',
  salon: 'Salon / Spa',
};

async function handleEvaluate(req: Request, res: Response) {
  const { address, businessType, priorities, selectedAddress } = req.body;

  if (!isValidString(address)) {
    return res.status(400).json({ message: 'A valid address is required.' });
  }

  const bType: BusinessType = VALID_BUSINESS_TYPES.includes(businessType) ? businessType : 'coffee_shop';
  const pList: Priority[] = Array.isArray(priorities)
    ? priorities.filter((p): p is Priority => VALID_PRIORITIES.includes(p))
    : [];
  const requiresPreciseLookup = /\b[A-Z]\d[A-Z][ -]?\d[A-Z]\d\b/i.test(address) || /^\s*\d+/.test(address);

  try {
    let geocode;

    if (selectedAddress && typeof selectedAddress.formattedAddress === 'string') {
      geocode = await geocodeAddress(selectedAddress.formattedAddress, { requirePrecise: true });
    } else {
      geocode = await geocodeAddress(address, { requirePrecise: requiresPreciseLookup });
    }

    const siteScore = await scoreSite(geocode.lat, geocode.lng, geocode.confidence, bType, pList);
    const alternatives = await generateAlternatives(
      geocode.lat, geocode.lng, siteScore.score, bType, pList, geocode.confidence,
    );
    const explanation = await generateExplanation(
      geocode.normalized, bType, pList, siteScore.score, siteScore.breakdown, alternatives, siteScore.nearbyCompetitorCount,
    );

    const alternativesWithReasons = alternatives.map((alt, i) => ({
      ...alt,
      reasons: explanation.alternativeReasons[i] ?? [],
    }));

    return res.json({
      address: {
        raw: geocode.raw,
        normalized: geocode.normalized,
        lat: geocode.lat,
        lng: geocode.lng,
        confidence: geocode.confidence,
        confidenceLabel: geocode.confidenceLabel,
        fromPrecisely: geocode.fromPrecisely,
      },
      businessType: bType,
      businessLabel: BUSINESS_LABELS[bType],
      score: siteScore.score,
      confidenceLevel: siteScore.confidenceLevel,
      nearbyCompetitorCount: siteScore.nearbyCompetitorCount,
      decision: explanation.decision,
      breakdown: siteScore.breakdown,
      strengths: explanation.strengths,
      concerns: explanation.concerns,
      summary: explanation.summary,
      alternatives: alternativesWithReasons,
    });
  } catch (error) {
    console.error('Evaluate error:', error);
    return res.status(500).json({
      message: 'Failed to resolve this address precisely. Please choose a more specific Canadian address or select a different suggestion.',
    });
  }
}

// Keep old routes for backward compat
router.post('/evaluate', handleEvaluate);
router.post('/analyze', handleEvaluate);

export default router;
