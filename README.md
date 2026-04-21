# SitePilot - A Precisely MCP-powered Location Risk Engine

AI-assisted site evaluation app with a React + Vite frontend and an Express + TypeScript backend. The app scores candidate business locations, suggests nearby alternatives, and can enhance explanations with Anthropic or OpenAI when keys are configured.

## What is included

- `client/`: React UI built with Vite
- `server/`: Express API with scoring, geocoding, alternatives, and explanation services
- mocked commercial-space recommendations ranked against the evaluated business/location context
- fallback behavior when external API keys are missing
- deploy support for either:
  - a single-service deployment where Express serves the built frontend
  - a split deployment where the frontend and backend are hosted separately

## Environment setup

Server env:

```bash
cp server/.env.example server/.env
```

Client env for split deployments:

```bash
cp client/.env.example client/.env
```

Important server variables:

- `PORT`: backend port, defaults to `4000`
- `PRECISELY_API_KEY` and `PRECISELY_API_SECRET`: Precisely credentials
- `OPENAI_API_KEY`: optional OpenAI summary support
- `ANTHROPIC_API_KEY`: optional Anthropic summary support
- `CORS_ORIGIN`: comma-separated allowed frontend origins for split deployments

Important client variables:

- `VITE_API_URL`: full backend origin for split deployments, for example `https://your-api.example.com`

## Local development

Install dependencies:

```bash
npm run install:all
```

Start the backend and frontend in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

During local Vite development, the client proxies `/api` requests to `http://localhost:4000`.

## Mocked commercial space recommendations

After a successful business location evaluation, the app now fetches a second ranked layer of nearby commercial listings under **Recommended Commercial Spaces**.

- The current implementation uses a small mock Ottawa-area dataset stored in the repo for demo and hackathon use.
- Listings are ranked with a transparent deterministic fit score based on proximity, affordability, size match, and compatibility with the current business concept.
- The mock dataset is intentionally provider-agnostic so a live commercial real-estate data source can be plugged into the backend later without redesigning the frontend flow.

## Production build

Build both apps:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

The server will automatically serve `client/dist` if that build exists. If the frontend build is not present, the server still exposes the API and a simple root health response.

## Deployment options

### Option 1: Single-service deploy

Use this when one Node service should host both the UI and API.

1. Set your server env vars from `server/.env.example`.
2. Run `npm run install:all`.
3. Run `npm run build`.
4. Start with `npm start`.

In this mode:

- Express serves the built frontend from `client/dist`
- API routes stay available under `/api/*`
- the frontend can keep `VITE_API_URL` unset and use same-origin `/api`

### Option 2: Split frontend/backend deploy

Use this when the frontend is hosted on a static platform and the backend is hosted separately.

Backend:

1. Deploy the `server` app as a Node service.
2. Set `CORS_ORIGIN=https://your-frontend-domain.example`.
3. Set your API keys in the backend environment.

Frontend:

1. Set `VITE_API_URL=https://your-backend-domain.example`
2. Build the client with `npm run build --prefix client`
3. Deploy `client/dist` to your static host

## API routes

- `POST /api/evaluate`
- `POST /api/analyze`
- `POST /api/real-estate/match`
- `GET /api/health`

### `POST /api/real-estate/match`

Returns ranked mock commercial listings near the evaluated area.

Example request shape:

```json
{
  "businessType": "coffee_shop",
  "lat": 45.4215,
  "lng": -75.6972,
  "budget": 5500,
  "desiredSquareFeet": 1400,
  "preferredPropertyType": "Storefront"
}
```

The response includes normalized listing cards with rent, square footage, distance, fit score, and human-readable match reasons.

## Notes

- If Precisely credentials are missing or unavailable, the server falls back to deterministic mock geocoding.
- If both LLM keys are missing, the server falls back to deterministic explanation text.
