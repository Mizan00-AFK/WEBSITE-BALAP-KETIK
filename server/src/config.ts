import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** server/src (dev) or server/dist (production) -> project root. */
export const PROJECT_ROOT = path.resolve(here, '..', '..');

// Load .env files if they exist (root first, then server/.env). No dotenv dependency needed.
for (const file of [path.join(PROJECT_ROOT, '.env'), path.join(PROJECT_ROOT, 'server', '.env')]) {
  if (existsSync(file)) {
    try {
      process.loadEnvFile(file);
    } catch {
      // ignore malformed env files - defaults below still work
    }
  }
}

const clientUrls = (process.env.CLIENT_URL ?? 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

export const SERVER_CONFIG = {
  port: Number(process.env.PORT) || 3001,
  clientUrls,
  clientDist: process.env.CLIENT_DIST || path.join(PROJECT_ROOT, 'client', 'dist'),
  isProduction: process.env.NODE_ENV === 'production',
};
