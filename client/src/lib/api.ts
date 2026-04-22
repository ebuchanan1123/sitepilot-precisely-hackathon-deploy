import type {
  AddressSuggestion,
  CommercialSpaceRecommendation,
  EvaluateRequest,
  EvaluateResponse,
  RealEstateMatchRequest,
} from './types';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';

async function buildHttpError(response: Response, fallbackMessage: string): Promise<Error> {
  const contentType = response.headers.get('content-type') ?? '';
  const rawBody = await response.text().catch(() => '');
  let message = fallbackMessage;

  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(rawBody) as { message?: string };
      if (parsed.message) {
        message = parsed.message;
      }
    } catch {
      // Keep the fallback below if JSON parsing fails.
    }
  }

  if (message === fallbackMessage) {
    const bodySnippet = rawBody.replace(/\s+/g, ' ').trim().slice(0, 180);
    message = `${fallbackMessage} [${response.status} ${response.statusText}]${bodySnippet ? ` ${bodySnippet}` : ''}`;
  }

  return new Error(message);
}

export async function evaluateSite(payload: EvaluateRequest): Promise<EvaluateResponse> {
  const response = await fetch(`${apiBaseUrl}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await buildHttpError(response, 'Unable to evaluate location. Please try again.');
  }

  return response.json();
}

export async function fetchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${apiBaseUrl}/api/address-suggestions?${params}`);

  if (!response.ok) {
    throw await buildHttpError(response, 'Unable to fetch address suggestions.');
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
    throw await buildHttpError(response, 'Unable to fetch commercial space recommendations.');
  }

  return response.json() as Promise<CommercialSpaceRecommendation[]>;
}
