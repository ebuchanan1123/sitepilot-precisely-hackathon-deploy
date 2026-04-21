import { Router, type Request, type Response } from 'express';
import type { CommercialPropertyType } from '../data/commercialListings.js';
import { geocodeAddress } from '../services/geocode.js';
import { matchCommercialListings, type RealEstateMatchRequest } from '../services/realEstate.js';
import type { BusinessType } from '../services/scoring.js';
import { isValidString } from '../utils/helpers.js';

const router = Router();

const VALID_BUSINESS_TYPES: BusinessType[] = ['coffee_shop', 'clinic', 'gym', 'grocery', 'restaurant', 'pharmacy', 'bar', 'retail', 'salon'];

router.post('/real-estate/match', async (req: Request, res: Response) => {
  const {
    businessType,
    lat,
    lng,
    targetAddress,
    budget,
    desiredSquareFeet,
    preferredPropertyType,
  } = req.body as {
    businessType?: BusinessType;
    lat?: number;
    lng?: number;
    targetAddress?: string;
    budget?: number;
    desiredSquareFeet?: number;
    preferredPropertyType?: CommercialPropertyType | 'Any';
  };

  if (!businessType || !VALID_BUSINESS_TYPES.includes(businessType)) {
    return res.status(400).json({ message: 'A valid business type is required.' });
  }

  let resolvedLat = typeof lat === 'number' ? lat : undefined;
  let resolvedLng = typeof lng === 'number' ? lng : undefined;

  if (resolvedLat === undefined || resolvedLng === undefined) {
    if (!isValidString(targetAddress)) {
      return res.status(400).json({ message: 'Coordinates or a valid target address are required.' });
    }

    try {
      const geocode = await geocodeAddress(targetAddress);
      resolvedLat = geocode.lat;
      resolvedLng = geocode.lng;
    } catch {
      return res.status(500).json({ message: 'Unable to resolve the requested target address.' });
    }
  }

  const matches = await matchCommercialListings({
    businessType,
    lat: resolvedLat,
    lng: resolvedLng,
    budget: typeof budget === 'number' ? budget : undefined,
    desiredSquareFeet: typeof desiredSquareFeet === 'number' ? desiredSquareFeet : undefined,
    preferredPropertyType: preferredPropertyType ?? 'Any',
  } satisfies RealEstateMatchRequest);

  return res.json(matches);
});

export default router;
