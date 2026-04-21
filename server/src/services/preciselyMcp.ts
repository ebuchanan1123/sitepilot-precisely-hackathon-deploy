interface McpTextContent {
  type?: string;
  text?: string;
}

interface AddressSuggestion {
  formattedAddress: string;
  mainAddressLine: string;
  addressLastLine: string;
  lat?: number;
  lng?: number;
  country: string;
  city?: string;
  region?: string;
  postalCode?: string;
}

interface McpJsonRpcResponse {
  result?: {
    content?: McpTextContent[];
    isError?: boolean;
  };
  error?: {
    code?: number;
    message?: string;
  };
}

function getMcpUrl(): string {
  return process.env.PRECISELY_MCP_URL?.trim() || 'http://127.0.0.1:8000/mcp';
}

async function postJsonRpc(body: object): Promise<McpJsonRpcResponse> {
  const response = await fetch(getMcpUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`MCP HTTP ${response.status}`);
  }

  return response.json() as Promise<McpJsonRpcResponse>;
}

async function initializeMcpClient(): Promise<void> {
  const response = await postJsonRpc({
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: {
        name: 'sitepilot-server',
        version: '0.0.1',
      },
    },
    id: 1,
  });

  if (response.error) {
    throw new Error(response.error.message || 'MCP initialize failed');
  }
}

function parseAutocompletePayload(payload: unknown): AddressSuggestion[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const results = (payload as { results?: Array<{
    formattedAddress?: string;
    mainAddressLine?: string;
    addressLastLine?: string;
    country?: string;
    areaName3?: string;
    areaName1?: string;
    postalCode?: string;
    geometry?: { coordinates?: [number, number] };
  }> }).results;

  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .filter((item) => item.formattedAddress)
    .map((item) => ({
      formattedAddress: item.formattedAddress ?? '',
      mainAddressLine: item.mainAddressLine ?? item.formattedAddress?.split(',')[0]?.trim() ?? '',
      addressLastLine: item.addressLastLine ?? item.formattedAddress?.split(',').slice(1).join(',').trim() ?? '',
      lat: item.geometry?.coordinates?.[1],
      lng: item.geometry?.coordinates?.[0],
      country: item.country ?? 'CAN',
      city: item.areaName3 ?? '',
      region: item.areaName1 ?? '',
      postalCode: item.postalCode ?? '',
    }));
}

export async function fetchAddressSuggestionsFromMcp(query: string): Promise<AddressSuggestion[]> {
  await initializeMcpClient();

  const response = await postJsonRpc({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'autocomplete_v2',
      arguments: {
        address: {
          addressLines: [query],
          country: 'CAN',
        },
        preferences: {
          maxResults: 8,
        },
      },
    },
    id: 2,
  });

  if (response.error) {
    throw new Error(response.error.message || 'MCP autocomplete failed');
  }

  const text = response.result?.content?.find((entry) => entry.type === 'text')?.text;
  if (!text) {
    return [];
  }

  const parsed = JSON.parse(text) as unknown;
  return parseAutocompletePayload(parsed);
}
