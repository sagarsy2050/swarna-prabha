import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import api from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // API only serves JSON + uploaded images; relax COEP so image URLs embed.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  app.use(
    cors({
      origin(origin, cb) {
        // Allow non-browser tools (no Origin) and configured client origins.
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  if (!config.isTest) {
    app.use(morgan(config.isProd ? 'combined' : 'dev', { stream: { write: (m) => logger.info(m.trim()) } }));
  }

  // Global, generous rate limit (auth/AI routes add tighter ones).
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Serve locally-stored uploads when STORAGE_DRIVER=local.
  if (config.storage.driver === 'local') {
    const dir = path.resolve(config.storage.uploadDir);
    fs.mkdirSync(dir, { recursive: true });
    app.use(
      '/uploads',
      express.static(dir, {
        index: false,
        maxAge: '7d',
        setHeaders: (res) => res.set('Cross-Origin-Resource-Policy', 'cross-origin'),
      }),
    );
  }

  // Approved jewellery classification images. This is the ONLY source of product
  // imagery — a product's image must live in its category's folder here.
  const jewelleryImagesDir = path.resolve(process.cwd(), '..', 'jewellery-images');
  if (fs.existsSync(jewelleryImagesDir)) {
    app.use(
      '/jewellery-images',
      express.static(jewelleryImagesDir, {
        index: false,
        maxAge: '30d',
        setHeaders: (res) => res.set('Cross-Origin-Resource-Policy', 'cross-origin'),
      }),
    );
  }

  app.get('/', (_req, res) =>
    res.json({ name: 'Swarna Prabha API', status: 'ok', docs: '/api/health' }),
  );
  app.use('/api', api);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
