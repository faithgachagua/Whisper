import 'dotenv/config';
import path from 'path';

const isProd = process.env.NODE_ENV === 'production';

function required(name: string, devDefault: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProd) throw new Error(`Missing required environment variable: ${name}`);
  return devDefault;
}

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required('JWT_SECRET', 'dev-only-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',').map((s) => s.trim()),
  dataFile: process.env.DATA_FILE ?? path.resolve(process.cwd(), 'data', 'db.json'),
  seedDemo: (process.env.SEED_DEMO ?? (isProd ? 'false' : 'true')) === 'true',
  seedPassword: process.env.SEED_PASSWORD ?? 'Whisper#2026',
  uploadDir: process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), 'data', 'uploads'),
  smallGroupThreshold: Number(process.env.SMALL_GROUP_THRESHOLD ?? 5),
};
