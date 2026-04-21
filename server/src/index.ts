import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import evaluateRouter from './routes/evaluate.js';
import addressSuggestionsRouter from './routes/addressSuggestions.js';
import realEstateRouter from './routes/realEstate.js';
import { fetchBestGeocodeCandidates, getPreciselyToken } from './services/geocode.js';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const app = express();
const port = process.env.PORT || 4000;
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(serverDir, '..', '..', 'client', 'dist');
const hasClientBuild = existsSync(path.join(clientDistPath, 'index.html'));

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
    res.status(502).send({
      status: 'degraded',
      preciselyAuth: 'error',
      message: error instanceof Error ? error.message : 'Unable to authenticate with Precisely.',
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
    res.status(500).send({
      message: error instanceof Error ? error.message : 'Unable to debug geocode candidates.',
    });
  }
});

if (hasClientBuild) {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }

    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.send({ status: 'server running', clientBuild: false });
  });
}

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
