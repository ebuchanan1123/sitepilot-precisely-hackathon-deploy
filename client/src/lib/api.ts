import type {
  AddressSuggestion,
  CommercialSpaceRecommendation,
  EvaluateRequest,
  EvaluateResponse,
  RealEstateMatchRequest,
} from './types';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';

export async function evaluateSite(payload: EvaluateRequest): Promise<EvaluateResponse> {
  const response = await fetch(`${apiBaseUrl}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message ?? 'Unable to evaluate location. Please try again.');
  }

  return response.json();
}

export async function fetchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${apiBaseUrl}/api/address-suggestions?${params}`);

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message ?? 'Unable to fetch address suggestions.');
  }

  return response.json() as Promise<AddressSuggestion[]>;
}

export async function fetchRealEstateMatches(
  payload: RealEstateMatchRequest,
): Promise<CommercialSpaceRecommendation[]> {
  const response = await fetch(`${apiBaseUrl}/api/real-estate/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message ?? 'Unable to fetch commercial space recommendations.');
  }

  return response.json() as Promise<CommercialSpaceRecommendation[]>;
}
