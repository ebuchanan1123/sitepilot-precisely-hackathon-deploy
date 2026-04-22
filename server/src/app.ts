import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import evaluateRouter from './routes/evaluate.js';
import addressSuggestionsRouter from './routes/addressSuggestions.js';
import realEstateRouter from './routes/realEstate.js';
import { fetchBestGeocodeCandidates, getPreciselyToken } from './services/geocode.js';

dotenv.config();

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith('/api/')) {
    next();
    return;
  }

  const startedAt = Date.now();
  res.on('finish', () => {
    console.info(`[api] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`);
  });

  next();
});
app.use('/api', evaluateRouter);
app.use('/api', addressSuggestionsRouter);
app.use('/api', realEstateRouter);

app.get('/api/health', (_req, res) => {
  res.send({ status: 'server running' });
});

app.get('/api/health/precisely', async (_req, res) => {
  try {
    await getPreciselyToken();
    res.send({ status: 'ok', preciselyAuth: 'ok' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to authenticate with Precisely.';
    const isMissingCredentials = message === 'No Precisely credentials';

    res.status(isMissingCredentials ? 200 : 502).send({
      status: isMissingCredentials ? 'degraded' : 'error',
      preciselyAuth: isMissingCredentials ? 'not_configured' : 'error',
      message,
    });
  }
});

app.get('/api/debug/geocode', async (req, res) => {
  const address = typeof req.query.address === 'string' ? req.query.address.trim() : '';

  if (!address) {
    res.status(400).send({ message: 'address query parameter is required' });
    return;
  }

  try {
    const result = await fetchBestGeocodeCandidates(address, 5);
    res.send({
      address,
      status: 'ok',
      parsed: result.parsed,
      candidates: result.candidates.map((candidate) => ({
        formattedStreetAddress: candidate.formattedStreetAddress,
        formattedLocationAddress: candidate.formattedLocationAddress,
        precisionCode: candidate.precisionCode,
        precisionLevel: candidate.precisionLevel,
        confidence: candidate.confidence,
        geometry: candidate.geometry,
        matching: candidate.matching,
        addressInfo: candidate.address,
      })),
    });
  } catch (error) {
    res.status(200).send({
      address,
      status: 'degraded',
      message: error instanceof Error ? error.message : 'Unable to debug geocode candidates.',
      candidates: [],
    });
  }
});

const clientDist = path.join(process.cwd(), 'client', 'dist');
if (existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith('/api/')) {
    next(error);
    return;
  }

  const status =
    typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
      ? error.status
      : typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
      ? error.statusCode
      : 500;

  const message = error instanceof Error ? error.message : 'Internal Server Error';

  console.error('Unhandled API error', {
    method: req.method,
    url: req.originalUrl,
    status,
    message,
    stack: error instanceof Error ? error.stack : undefined,
  });

  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(status).json({
    message,
    status,
    route: req.originalUrl,
  });
});

export default app;
