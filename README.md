# SitePilot - Geospatial Site Intelligence

SitePilot is an AI-assisted location intelligence app for evaluating business addresses, scoring trade-area potential, and surfacing nearby commercial lease opportunities. It combines a React + Vite frontend with an Express + TypeScript backend, uses Precisely geospatial services for address validation and market signals, and presents both an overall site score and ranked nearby listing recommendations.

This project was built as a portfolio-ready demo focused on:

- evaluating candidate business locations by business type
- explaining score composition with transparent factor breakdowns
- surfacing nearby commercial listings in the Ottawa-Gatineau region
- mapping proposed sites and real listing coordinates interactively
- generating concise business-facing summaries from the scored results

## What is included

- `client/`: React UI built with Vite
- `server/`: Express API with scoring, geocoding, alternatives, and explanation services
- live and cached commercial-space recommendations ranked against the evaluated business/location context
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
- `DATABASE_URL`: optional Postgres connection string for shared live listing storage and cron-based refreshes

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

## Commercial listing recommendations

After a successful business location evaluation, the app fetches a second ranked layer of nearby commercial listings under **Available Commercial Spaces Nearby**.

- Listings are ranked with a deterministic fit model based on proximity, affordability, size match, and business-type compatibility.
- The UI supports numbered map pins, radius filtering, source links, and listing-level demographic enrichment when available.
- The current live coverage is focused on the Ottawa-Gatineau region.

## Live Ottawa-Gatineau listing refresh

The repo now supports a lightweight live-listing ingestion flow for Ottawa/Gatineau commercial lease inventory.

- Run `npm run ingest:listings --prefix server` to refresh the `server/data/liveCommercialListings.json` cache.
- If `DATABASE_URL` is configured, the same ingest job will also upsert listings into Postgres.
- The runtime API will prefer Postgres listings first, then the JSON cache, then the built-in mock dataset.

For Render automation:

1. Create a Render Postgres database and copy its internal/external connection string into `DATABASE_URL` on the backend web service.
2. Create a Render cron job pointing at the `server` root directory.
3. Use:
   - Build command: `npm install && npm run build`
   - Start command: `npm run ingest:listings`
4. Add the same `DATABASE_URL`, `PRECISELY_API_KEY`, and `PRECISELY_API_SECRET` env vars to the cron job.

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

Returns ranked commercial listings near the evaluated area.

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
