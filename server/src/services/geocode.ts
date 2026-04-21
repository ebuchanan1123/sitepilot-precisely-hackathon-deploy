export interface GeocodeResult {
  raw: string;
  normalized: string;
  lat: number;
  lng: number;
  confidence: number;
  confidenceLabel: 'High' | 'Medium' | 'Low';
  city: string;
  state: string;
  fromPrecisely: boolean;
}

interface GeocodeOptions {
  requirePrecise?: boolean;
}

const CITY_COORDS: Record<string, [number, number, string]> = {
  'new york': [40.7128, -74.006, 'NY'],
  'nyc': [40.7128, -74.006, 'NY'],
  'manhattan': [40.7831, -73.9712, 'NY'],
  'brooklyn': [40.6782, -73.9442, 'NY'],
  'los angeles': [34.0522, -118.2437, 'CA'],
  'chicago': [41.8781, -87.6298, 'IL'],
  'houston': [29.7604, -95.3698, 'TX'],
  'phoenix': [33.4484, -112.074, 'AZ'],
  'philadelphia': [39.9526, -75.1652, 'PA'],
  'san antonio': [29.4241, -98.4936, 'TX'],
  'san diego': [32.7157, -117.1611, 'CA'],
  'dallas': [32.7767, -96.797, 'TX'],
  'san jose': [37.3382, -121.8863, 'CA'],
  'austin': [30.2672, -97.7431, 'TX'],
  'fort worth': [32.7555, -97.3308, 'TX'],
  'columbus': [39.9612, -82.9988, 'OH'],
  'charlotte': [35.2271, -80.8431, 'NC'],
  'seattle': [47.6062, -122.3321, 'WA'],
  'denver': [39.7392, -104.9903, 'CO'],
  'nashville': [36.1627, -86.7816, 'TN'],
  'miami': [25.7617, -80.1918, 'FL'],
  'boston': [42.3601, -71.0589, 'MA'],
  'atlanta': [33.749, -84.388, 'GA'],
  'portland': [45.5051, -122.675, 'OR'],
  'las vegas': [36.1699, -115.1398, 'NV'],
  'minneapolis': [44.9778, -93.265, 'MN'],
  'new orleans': [29.9511, -90.0715, 'LA'],
  'toronto': [43.6532, -79.3832, 'ON'],
  'hamilton': [43.2557, -79.8711, 'ON'],
  'vancouver': [49.2827, -123.1207, 'BC'],
  'montreal': [45.5017, -73.5673, 'QC'],
  'ottawa': [45.4215, -75.6972, 'ON'],
  'calgary': [51.0447, -114.0719, 'AB'],
  'edmonton': [53.5461, -113.4938, 'AB'],
  'winnipeg': [49.8951, -97.1384, 'MB'],
  'halifax': [44.6488, -63.5752, 'NS'],
  'quebec city': [46.8139, -71.208, 'QC'],
  'victoria': [48.4284, -123.3656, 'BC'],
  'san francisco': [37.7749, -122.4194, 'CA'],
  'washington': [38.9072, -77.0369, 'DC'],
  'baltimore': [39.2904, -76.6122, 'MD'],
  'milwaukee': [43.0389, -87.9065, 'WI'],
  'tucson': [32.2226, -110.9747, 'AZ'],
  'fresno': [36.7378, -119.7871, 'CA'],
  'sacramento': [38.5816, -121.4944, 'CA'],
  'kansas city': [39.0997, -94.5786, 'MO'],
  'omaha': [41.2565, -95.9345, 'NE'],
  'raleigh': [35.7796, -78.6382, 'NC'],
  'cleveland': [41.4993, -81.6944, 'OH'],
  'tulsa': [36.154, -95.9928, 'OK'],
  'pittsburgh': [40.4406, -79.9959, 'PA'],
  'st. louis': [38.627, -90.1994, 'MO'],
  'st louis': [38.627, -90.1994, 'MO'],
  'tampa': [27.9506, -82.4572, 'FL'],
  'orlando': [28.5383, -81.3792, 'FL'],
  'cincinnati': [39.1031, -84.512, 'OH'],
  'indianapolis': [39.7684, -86.1581, 'IN'],
  'memphis': [35.1495, -90.0489, 'TN'],
  'louisville': [38.2527, -85.7585, 'KY'],
  'detroit': [42.3314, -83.0458, 'MI'],
  'salt lake city': [40.7608, -111.891, 'UT'],
};

const CANADIAN_REGION_PATTERNS: Array<[RegExp, string]> = [
  [/\bontario\b|\bon\b/, 'ON'],
  [/\bquebec\b|\bqc\b/, 'QC'],
  [/\bbritish columbia\b|\bbc\b/, 'BC'],
  [/\balberta\b|\bab\b/, 'AB'],
  [/\bmanitoba\b|\bmb\b/, 'MB'],
  [/\bsaskatchewan\b|\bsk\b/, 'SK'],
  [/\bnew brunswick\b|\bnb\b/, 'NB'],
  [/\bnova scotia\b|\bns\b/, 'NS'],
  [/\bnewfoundland and labrador\b|\bnl\b/, 'NL'],
  [/\bprince edward island\b|\bpe\b/, 'PE'],
];

const US_REGION_PATTERNS: Array<[RegExp, string]> = [
  [/\bnew york\b|\bny\b/, 'US'],
  [/\bcalifornia\b|\bca\b/, 'US'],
  [/\btexas\b|\btx\b/, 'US'],
  [/\billinois\b|\bil\b/, 'US'],
  [/\bflorida\b|\bfl\b/, 'US'],
  [/\bwashington\b|\bwa\b/, 'US'],
];

const PROVINCE_ALIASES: Record<string, string> = {
  ontario: 'ON',
  on: 'ON',
  quebec: 'QC',
  qc: 'QC',
  'british columbia': 'BC',
  bc: 'BC',
  alberta: 'AB',
  ab: 'AB',
  manitoba: 'MB',
  mb: 'MB',
  saskatchewan: 'SK',
  sk: 'SK',
  'nova scotia': 'NS',
  ns: 'NS',
  'new brunswick': 'NB',
  nb: 'NB',
  'newfoundland and labrador': 'NL',
  nl: 'NL',
  'prince edward island': 'PE',
  pe: 'PE',
};

const STATE_ALIASES: Record<string, string> = {
  california: 'CA',
  texas: 'TX',
  florida: 'FL',
  illinois: 'IL',
  washington: 'WA',
  'new york': 'NY',
  pennsylvania: 'PA',
  ohio: 'OH',
};

interface ParsedAddress {
  streetLine: string;
  city?: string;
  region?: string;
  postalCode?: string;
  addressNumber?: string;
  streetName?: string;
}

interface GeocodeCandidate {
  formattedStreetAddress?: string;
  formattedLocationAddress?: string;
  precisionLevel?: number;
  precisionCode?: string;
  geometry?: { coordinates?: [number, number] };
  confidence?: string;
  matching?: {
    matchOnAddressNumber?: boolean;
    matchOnStreetName?: boolean;
    matchOnPostCode1?: boolean;
    matchOnAreaName3?: boolean;
    matchOnAreaName1?: boolean;
  };
  address?: {
    addressNumber?: string;
    streetName?: string;
    areaName1?: string;
    areaName3?: string;
    postCode1?: string;
  };
  ranges?: Array<{ placeName?: string }>;
}

let _cachedToken: { token: string; expires: number } | null = null;

async function getPreciselyToken(): Promise<string> {
  if (_cachedToken && Date.now() < _cachedToken.expires) return _cachedToken.token;
  const key = process.env.PRECISELY_API_KEY;
  const secret = process.env.PRECISELY_API_SECRET;
  if (!key || !secret) throw new Error('No Precisely credentials');
  const creds = Buffer.from(`${key}:${secret}`).toString('base64');
  const resp = await fetch('https://api.precisely.com/oauth/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!resp.ok) throw new Error(`Precisely auth failed: ${resp.status}`);
  const data = (await resp.json()) as { access_token: string; expires_in: number };
  _cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 120) * 1000 };
  return _cachedToken.token;
}

function stringHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function inferCountry(address: string): 'CAN' | 'USA' {
  const lower = address.toLowerCase();

  if (/\bcanada\b/.test(lower)) return 'CAN';
  if (/\busa\b|\bunited states\b|\bu\.s\.a\.\b|\bu\.s\.\b/.test(lower)) return 'USA';
  if (CANADIAN_REGION_PATTERNS.some(([pattern]) => pattern.test(lower))) return 'CAN';
  if (US_REGION_PATTERNS.some(([pattern]) => pattern.test(lower))) return 'USA';

  return 'USA';
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function normalizeRegion(value: string, country: 'CAN' | 'USA'): string {
  const cleaned = value.toLowerCase().replace(/\./g, '').trim();
  const lookup = country === 'CAN' ? PROVINCE_ALIASES : STATE_ALIASES;
  return lookup[cleaned] ?? value.trim().toUpperCase();
}

function parseAddress(address: string, country: 'CAN' | 'USA'): ParsedAddress {
  const cleaned = address.replace(/\s+/g, ' ').trim();
  const postalRegex = country === 'CAN'
    ? /\b([A-Z]\d[A-Z][ -]?\d[A-Z]\d)\b/i
    : /\b(\d{5}(?:-\d{4})?)\b/;
  const postalMatch = cleaned.match(postalRegex);
  const postalCode = postalMatch?.[1]?.toUpperCase().replace(/\s+/g, '');

  const withoutCountry = cleaned.replace(/\b(?:canada|united states|usa|u\.s\.a\.?)\b/gi, '').trim();
  const withoutPostal = postalCode ? withoutCountry.replace(postalRegex, '').trim() : withoutCountry;
  const parts = withoutPostal
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { streetLine: cleaned, postalCode };
  }

  const streetLine = parts[0];
  const streetMatch = streetLine.match(/^(\d+[A-Za-z\-]*)\s+(.+)$/);
  let city: string | undefined;
  let region: string | undefined;

  if (parts.length >= 3) {
    city = toTitleCase(parts[1]);
    region = normalizeRegion(parts[2], country);
  } else if (parts.length === 2) {
    const regionLike = parts[1].match(/^(.+?)\s+([A-Za-z]{2})$/);
    if (regionLike) {
      city = toTitleCase(regionLike[1]);
      region = normalizeRegion(regionLike[2], country);
    } else {
      city = toTitleCase(parts[1]);
    }
  }

  if (!city) {
    for (const cityName of Object.keys(CITY_COORDS)) {
      if (withoutPostal.toLowerCase().includes(cityName)) {
        city = toTitleCase(cityName);
        break;
      }
    }
  }

  if (!region) {
    const aliases = country === 'CAN' ? PROVINCE_ALIASES : STATE_ALIASES;
    for (const alias of Object.keys(aliases)) {
      const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (pattern.test(withoutPostal)) {
        region = aliases[alias];
        break;
      }
    }
  }

  return {
    streetLine,
    city,
    region,
    postalCode,
    addressNumber: streetMatch?.[1],
    streetName: streetMatch?.[2]?.trim(),
  };
}

function normalizePostal(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function normalizeStreet(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(road|rd\.?)\b/g, 'rd')
    .replace(/\b(avenue|ave\.?)\b/g, 'ave')
    .replace(/\b(street|st\.?)\b/g, 'st')
    .replace(/\b(boulevard|blvd\.?)\b/g, 'blvd')
    .replace(/\s+/g, ' ')
    .trim();
}

function candidateScore(candidate: {
  formattedStreetAddress?: string;
  formattedLocationAddress?: string;
  precisionLevel?: number;
  precisionCode?: string;
  address?: {
    addressNumber?: string;
    streetName?: string;
    areaName1?: string;
    areaName3?: string;
    postCode1?: string;
  };
  matching?: {
    matchOnAddressNumber?: boolean;
    matchOnStreetName?: boolean;
    matchOnPostCode1?: boolean;
    matchOnAreaName3?: boolean;
    matchOnAreaName1?: boolean;
  };
}, parsed: ParsedAddress): number {
  const streetText = `${candidate.formattedStreetAddress ?? ''} ${candidate.address?.streetName ?? ''}`.toLowerCase();
  const locationText = `${candidate.formattedLocationAddress ?? ''} ${candidate.address?.areaName3 ?? ''} ${candidate.address?.areaName1 ?? ''}`.toLowerCase();
  let score = 0;

  const precisionLevel = candidate.precisionLevel ?? 0;
  score += precisionLevel * 10;

  if (candidate.precisionCode?.startsWith('S8')) score += 60;
  else if (candidate.precisionCode?.startsWith('S7')) score += 45;
  else if (candidate.precisionCode?.startsWith('S5')) score += 35;
  else if (candidate.precisionCode?.startsWith('S4')) score += 15;

  if (candidate.matching?.matchOnAddressNumber) score += 30;
  if (candidate.matching?.matchOnStreetName) score += 25;
  if (candidate.matching?.matchOnPostCode1) score += 20;
  if (candidate.matching?.matchOnAreaName3) score += 10;
  if (candidate.matching?.matchOnAreaName1) score += 6;

  if (parsed.addressNumber && candidate.address?.addressNumber === parsed.addressNumber) score += 35;
  if (parsed.streetName && normalizeStreet(streetText).includes(normalizeStreet(parsed.streetName))) score += 25;
  if (parsed.city && locationText.includes(parsed.city.toLowerCase())) score += 12;
  if (parsed.region && locationText.includes(parsed.region.toLowerCase())) score += 8;
  if (parsed.postalCode && normalizePostal(candidate.address?.postCode1 ?? '').includes(normalizePostal(parsed.postalCode))) score += 25;

  return score;
}

function isCandidatePreciseEnough(candidate: GeocodeCandidate, parsed: ParsedAddress): boolean {
  const precisionCode = candidate.precisionCode ?? '';
  const acceptablePrecision = ['S8', 'S7', 'S5', 'SX', 'SC'];
  const hasAcceptablePrecision = acceptablePrecision.some((code) => precisionCode.startsWith(code));

  if (!hasAcceptablePrecision) {
    return false;
  }

  if (parsed.addressNumber) {
    const exactNumberMatch = candidate.matching?.matchOnAddressNumber || candidate.address?.addressNumber === parsed.addressNumber;
    if (!exactNumberMatch) {
      return false;
    }
  }

  if (parsed.streetName) {
    const exactStreetMatch = candidate.matching?.matchOnStreetName
      || normalizeStreet(candidate.address?.streetName ?? '').includes(normalizeStreet(parsed.streetName))
      || normalizeStreet(candidate.formattedStreetAddress ?? '').includes(normalizeStreet(parsed.streetName));
    if (!exactStreetMatch) {
      return false;
    }
  }

  if (parsed.postalCode) {
    const postalMatch = candidate.matching?.matchOnPostCode1
      || normalizePostal(candidate.address?.postCode1 ?? '') === normalizePostal(parsed.postalCode);
    if (!postalMatch) {
      return false;
    }
  }

  if (parsed.city) {
    const cityMatch = candidate.matching?.matchOnAreaName3
      || candidate.address?.areaName3?.toLowerCase() === parsed.city.toLowerCase();
    if (!cityMatch) {
      return false;
    }
  }

  if (parsed.region) {
    const regionMatch = candidate.matching?.matchOnAreaName1
      || candidate.address?.areaName1?.toLowerCase() === parsed.region.toLowerCase();
    if (!regionMatch) {
      return false;
    }
  }

  return true;
}

function deterministicGeocode(address: string, country: 'CAN' | 'USA'): GeocodeResult {
  const lower = address.toLowerCase();
  let baseLat = country === 'CAN' ? 56.1304 : 39.5;
  let baseLng = country === 'CAN' ? -106.3468 : -98.35;
  let city = '';
  let state = country === 'CAN' ? 'Canada' : '';

  for (const [name, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(name)) {
      baseLat = coords[0];
      baseLng = coords[1];
      city = name.replace(/\b\w/g, (c) => c.toUpperCase());
      state = coords[2];
      break;
    }
  }

  const seed = stringHash(address);
  const latOffset = ((seed % 10000) / 10000 - 0.5) * 0.05;
  const lngOffset = (((seed * 7919) % 10000) / 10000 - 0.5) * 0.07;

  const parts = address.split(',').map((p) => p.trim());
  const hasNumber = /^\d+/.test(parts[0] ?? '');
  const componentScore = (hasNumber ? 20 : 0) + (parts.length >= 2 ? 20 : 0) + (city ? 30 : 0) + (state ? 15 : 0);
  const confidence = Math.min(97, 30 + componentScore);

  return {
    raw: address,
    normalized: address.trim(),
    lat: parseFloat((baseLat + latOffset).toFixed(6)),
    lng: parseFloat((baseLng + lngOffset).toFixed(6)),
    confidence,
    confidenceLabel: confidence >= 85 ? 'High' : confidence >= 65 ? 'Medium' : 'Low',
    city,
    state,
    fromPrecisely: false,
  };
}

async function fetchGeocodeCandidates(
  address: string,
  maxCandidates = 5,
  countryOverride?: 'CAN' | 'USA',
): Promise<{
  parsed: ParsedAddress;
  candidates: GeocodeCandidate[];
}> {
  const country = countryOverride ?? 'CAN';
  const parsed = parseAddress(address, country);
  const token = await getPreciselyToken();
  const body = {
    type: 'ADDRESS',
    preferences: {
      maxReturnedCandidates: maxCandidates,
      returnAllCandidateInfo: true,
      fallbackToGeographic: false,
      fallbackToPostal: false,
      clientLocale: 'en_CA',
      clientCoordSysName: 'EPSG:4326',
      matchMode: 'Custom',
      mustMatchFields: {
        matchOnAddressNumber: !!parsed.addressNumber,
        matchOnPostCode1: !!parsed.postalCode,
        matchOnPostCode2: false,
        matchOnAreaName1: !!parsed.region,
        matchOnAreaName2: false,
        matchOnAreaName3: !!parsed.city,
        matchOnAreaName4: false,
        matchOnAllStreetFields: false,
        matchOnStreetName: !!parsed.streetName,
        matchOnStreetType: false,
        matchOnStreetDirectional: false,
        matchOnPlaceName: false,
        matchOnInputFields: false,
      },
      returnFieldsDescriptor: {
        returnAllCustomFields: true,
        returnMatchDescriptor: true,
        returnStreetAddressFields: true,
        returnUnitInformation: true,
        returnedCustomFieldKeys: [],
      },
      customPreferences: {
        FALLBACK_TO_WORLD: 'false',
      },
    },
    addresses: [
      {
        mainAddressLine: parsed.streetLine || address.trim(),
        ...(parsed.city ? { areaName3: parsed.city } : {}),
        ...(parsed.region ? { areaName1: parsed.region } : {}),
        ...(parsed.postalCode ? { postalCode: parsed.postalCode } : {}),
        country,
      },
    ],
  };

  const resp = await fetch('https://api.precisely.com/geocode/v1/premium/geocode', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    throw new Error(`Premium geocoding ${resp.status}: ${errBody}`);
  }

  const data = (await resp.json()) as {
    responses?: Array<{
      candidates?: GeocodeCandidate[];
    }>;
  };

  const candidates = [...(data.responses?.[0]?.candidates ?? [])]
    .sort((a, b) => candidateScore(b, parsed) - candidateScore(a, parsed));

  return { parsed, candidates };
}

async function fetchBestGeocodeCandidates(address: string, maxCandidates = 5): Promise<{
  parsed: ParsedAddress;
  candidates: GeocodeCandidate[];
}> {
  const inferredCountry: 'CAN' = 'CAN';
  const countriesToTry: Array<'CAN' | 'USA'> = ['CAN'];
  const deduped = new Map<string, GeocodeCandidate>();
  let parsed = parseAddress(address, inferredCountry);
  let lastError: unknown;

  for (const country of countriesToTry) {
    try {
      const result = await fetchGeocodeCandidates(address, maxCandidates, country);
      parsed = result.parsed;

      for (const candidate of result.candidates) {
        const key = [
          candidate.formattedStreetAddress ?? '',
          candidate.formattedLocationAddress ?? '',
          candidate.geometry?.coordinates?.join(',') ?? '',
        ].join('|');

        if (!deduped.has(key)) {
          deduped.set(key, candidate);
        }
      }
    } catch (error) {
      lastError = error;
    }
  }

  const mergedCandidates = [...deduped.values()]
    .sort((a, b) => candidateScore(b, parsed) - candidateScore(a, parsed))
    .slice(0, maxCandidates);

  const strictCandidates = mergedCandidates.filter((candidate) => isCandidatePreciseEnough(candidate, parsed));

  if (strictCandidates.length > 0) {
    return { parsed, candidates: strictCandidates };
  }

  if (mergedCandidates.length === 0 && lastError) {
    throw lastError;
  }

  return { parsed, candidates: mergedCandidates };
}

export async function geocodeAddress(address: string, options: GeocodeOptions = {}): Promise<GeocodeResult> {
  const country: 'CAN' = 'CAN';
  const parsed = parseAddress(address, country);

  try {
    const { candidates } = await fetchBestGeocodeCandidates(address, 5);
    const candidate = candidates[0];
    if (!candidate?.geometry?.coordinates) throw new Error('No geocoding candidate');

    const [lng, lat] = candidate.geometry.coordinates;
    const rawConf = candidate.confidence ?? 'MEDIUM';
    const confidence = rawConf === 'HIGH' ? 94 : rawConf === 'MEDIUM' ? 76 : 55;
    const lower = `${candidate.formattedStreetAddress ?? ''} ${candidate.formattedLocationAddress ?? ''}`.toLowerCase();
    let city = '', state = '';
    for (const [name, coords] of Object.entries(CITY_COORDS)) {
      if (lower.includes(name)) { city = name.replace(/\b\w/g, (c) => c.toUpperCase()); state = coords[2]; break; }
    }

    return {
      raw: address,
      normalized: `${candidate.formattedStreetAddress ?? parsed.streetLine}${candidate.formattedLocationAddress ? `, ${candidate.formattedLocationAddress}` : ''}`.trim(),
      lat,
      lng,
      confidence,
      confidenceLabel: confidence >= 85 ? 'High' : confidence >= 65 ? 'Medium' : 'Low',
      city,
      state,
      fromPrecisely: true,
    };
  } catch (error) {
    if (options.requirePrecise) {
      throw error;
    }
    return deterministicGeocode(address, country);
  }
}

export interface LocationDemographics {
  averageHouseholdIncome: number | null;
  population: number | null;
  averageHomeValue: number | null;
  educationBachelorsPct: number | null;
  fromPrecisely: boolean;
}

export async function fetchDemographics(address: string): Promise<LocationDemographics> {
  const token = await getPreciselyToken();
  const query = `
    query GetDemographics($address: String!, $country: String) {
      getByAddress(address: $address, country: $country) {
        addresses(pageNumber: 1, pageSize: 1) {
          data {
            groundView {
              data {
                censusBlockGroupPopulation
                averageHouseholdIncome
                educationBachelorsDegreePercent
                averageHomeValue
              }
            }
          }
        }
      }
    }
  `;
  const resp = await fetch('https://api.precisely.com/data-graph/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { address, country: 'CAN' } }),
  });
  if (!resp.ok) throw new Error(`Demographics API ${resp.status}`);
  const json = (await resp.json()) as {
    data?: {
      getByAddress?: {
        addresses?: {
          data?: Array<{
            groundView?: {
              data?: Array<{
                censusBlockGroupPopulation?: number;
                averageHouseholdIncome?: number;
                educationBachelorsDegreePercent?: number;
                averageHomeValue?: number;
              }>;
            };
          }>;
        };
      };
    };
  };
  const row = json.data?.getByAddress?.addresses?.data?.[0]?.groundView?.data?.[0];
  return {
    averageHouseholdIncome: row?.averageHouseholdIncome ?? null,
    population: row?.censusBlockGroupPopulation ?? null,
    averageHomeValue: row?.averageHomeValue ?? null,
    educationBachelorsPct: row?.educationBachelorsDegreePercent ?? null,
    fromPrecisely: true,
  };
}

export {
  getPreciselyToken,
  inferCountry as inferCountryCode,
  parseAddress,
  fetchGeocodeCandidates,
  fetchBestGeocodeCandidates,
};
