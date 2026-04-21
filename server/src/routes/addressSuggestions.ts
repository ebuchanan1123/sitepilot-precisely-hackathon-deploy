import { Router, type Request, type Response } from 'express';
import {
  fetchBestGeocodeCandidates,
  geocodeAddress,
  getPreciselyToken,
  parseAddress,
} from '../services/geocode.js';
import { fetchAddressSuggestionsFromMcp } from '../services/preciselyMcp.js';

const router = Router();

type Suggestion = {
  formattedAddress: string;
  mainAddressLine: string;
  addressLastLine: string;
  lat?: number;
  lng?: number;
  country: string;
  city?: string;
  region?: string;
  postalCode?: string;
};

async function fetchSuggestionsForCountry(
  token: string,
  query: string,
  country: 'CAN' | 'USA',
): Promise<Suggestion[]> {
  const parsed = parseAddress(query, country);

  const params = new URLSearchParams({
    searchText: query,
    country,
    maxCandidates: '6',
    matchOnAddressNumber: 'True',
    searchOnAddressNumber: 'Y',
    searchOnUnitInfo: country === 'CAN' || country === 'USA' ? 'Y' : 'N',
    includeRangesDetails: 'N',
    returnAdminAreasOnly: 'N',
  });

  if (parsed.city) params.set('areaName3', parsed.city);
  if (parsed.region) params.set('areaName1', parsed.region);
  if (parsed.postalCode) params.set('postCode', parsed.postalCode);

  const response = await fetch(`https://api.precisely.com/typeahead/v1/locations?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Autocomplete failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    location?: Array<{
      address?: {
        formattedAddress?: string;
        mainAddressLine?: string;
        addressLastLine?: string;
        country?: string;
        areaName1?: string;
        areaName3?: string;
        postCode?: string;
      };
      geometry?: {
        coordinates?: [number, number];
      };
    }>;
  };

  return (data.location ?? [])
    .filter((item) => item.address?.formattedAddress)
    .map((item) => ({
      formattedAddress: item.address?.formattedAddress ?? '',
      mainAddressLine: item.address?.mainAddressLine ?? '',
      addressLastLine: item.address?.addressLastLine ?? '',
      lat: item.geometry?.coordinates?.[1],
      lng: item.geometry?.coordinates?.[0],
      country: item.address?.country ?? country,
      city: item.address?.areaName3 ?? '',
      region: item.address?.areaName1 ?? '',
      postalCode: item.address?.postCode ?? '',
    }));
}

router.get('/address-suggestions', async (req: Request, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (query.length < 3) {
    return res.json([]);
  }

  const inferredCountry: 'CAN' = 'CAN';
  const countriesToTry: Array<'CAN' | 'USA'> = ['CAN'];
  const deduped = new Map<string, Suggestion>();

  let hadProviderError = false;

  try {
    const mcpSuggestions = await fetchAddressSuggestionsFromMcp(query);
    for (const suggestion of mcpSuggestions) {
      deduped.set(suggestion.formattedAddress, suggestion);
    }

    if (deduped.size > 0) {
      return res.json(Array.from(deduped.values()).slice(0, 8));
    }
  } catch (mcpError) {
    hadProviderError = true;
    console.error('Address suggestion MCP error:', mcpError);
  }

  try {
    const token = await getPreciselyToken();
    for (const country of countriesToTry) {
      try {
        const suggestions = await fetchSuggestionsForCountry(token, query, country);
        for (const suggestion of suggestions) {
          deduped.set(suggestion.formattedAddress, suggestion);
        }
      } catch (countryError) {
        hadProviderError = true;
        console.error(`Address suggestion ${country} attempt failed:`, countryError);
      }
    }

    if (deduped.size > 0) {
      return res.json(Array.from(deduped.values()).slice(0, 8));
    }
  } catch (error) {
    hadProviderError = true;
    console.error('Address suggestion error:', error);
  }

  try {
    const { candidates } = await fetchBestGeocodeCandidates(query, 5);
    const fallbackSuggestions = candidates
      .map((candidate) => ({
        formattedAddress: `${candidate.formattedStreetAddress ?? ''}${candidate.formattedLocationAddress ? `, ${candidate.formattedLocationAddress}` : ''}`.trim(),
        mainAddressLine: candidate.formattedStreetAddress ?? '',
        addressLastLine: candidate.formattedLocationAddress ?? '',
        lat: candidate.geometry?.coordinates?.[1],
        lng: candidate.geometry?.coordinates?.[0],
        country: '',
        city: candidate.address?.areaName3 ?? '',
        region: candidate.address?.areaName1 ?? '',
        postalCode: candidate.address?.postCode1 ?? '',
      }))
      .filter((suggestion) => suggestion.formattedAddress);

    for (const suggestion of fallbackSuggestions) {
      deduped.set(suggestion.formattedAddress, suggestion);
    }

    if (deduped.size > 0) {
      return res.json(Array.from(deduped.values()).slice(0, 8));
    }
  } catch (fallbackError) {
    hadProviderError = true;
    console.error('Geocode suggestion fallback error:', fallbackError);
  }

  try {
    const geocode = await geocodeAddress(query);
    if (geocode.fromPrecisely || geocode.confidence >= 75) {
      const normalizedParts = geocode.normalized.split(',');
      const mainAddressLine = normalizedParts.shift()?.trim() ?? geocode.normalized;
      const addressLastLine = normalizedParts.join(',').trim();

      return res.json([{
        formattedAddress: geocode.normalized,
        mainAddressLine,
        addressLastLine,
        lat: geocode.lat,
        lng: geocode.lng,
        country: inferredCountry,
        city: geocode.city,
        region: geocode.state,
        postalCode: '',
      }]);
    }
  } catch (finalFallbackError) {
    hadProviderError = true;
    console.error('Final suggestion fallback error:', finalFallbackError);
  }

  if (hadProviderError) {
    return res.json([]);
  }

  return res.json([]);
});

export default router;
