import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import app from './app.js';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const port = process.env.PORT || 4000;
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(serverDir, '..', '..', 'client', 'dist');
const hasClientBuild = existsSync(path.join(clientDistPath, 'index.html'));

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
