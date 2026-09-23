// ──────────────────────────────────────────────
// TradeMind — API Server Entry Point
//
// Uses Hono for a fast, TypeScript-native HTTP server.
// Global middleware stack: CORS → Logger → Security headers
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { API_PREFIX } from '@trademind/shared'; 
import { env } from './env';

import { authRouter } from './routes/auth';
import { brokersRouter } from './routes/brokers';
import { tradesRouter } from './routes/trades';
import { journalRouter } from './routes/journal';
import { analyticsRouter } from './routes/analytics';
import { adminRouter } from './routes/admin';
import { webhooksRouter } from './routes/webhooks';
import { healthRouter } from './routes/health';
import { paymentRouter } from './routes/payments';
import { subscriptionsRouter } from './routes/subscriptions';
import { playbooksRouter } from './routes/playbooks';
import { notificationsRouter } from './routes/notifications';
import { disciplineRouter } from './routes/discipline';
import { aiRouter } from './routes/ai';
import { storeRouter } from './routes/store';
import { reviewsRouter } from './routes/reviews';
import { strategiesRouter } from './routes/strategies';
import { leaderboardRouter } from './routes/leaderboard';
import { uploadsRouter } from './routes/uploads';
import { partnersRouter } from './routes/partners';
import { riskRouter } from './routes/risk';
import { configRouter } from './routes/config';
import { goalsRouter } from './routes/goals';
import { initializeWorkers } from './lib/jobs';
import { rateLimitMiddleware } from './middleware/rate-limit';

const app = new Hono();

// ── Correlation ID ───────────────────────────────────────────
app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  c.header('X-Request-Id', requestId);
  await next();
});

// ── Request timeout (30s) ───────────────────────────────────
app.use('*', async (c, next) => {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out after 30s')), 30_000)
  );
  await Promise.race([next(), timeoutPromise]);
});

// ── Body size limit (1MB max, 15MB for uploads) ──────────────
app.use('*', async (c, next) => {
  const contentLength = parseInt(c.req.header('content-length') ?? '0', 10);
  const isUpload = c.req.path.includes('/uploads');
  const maxBytes = isUpload ? 15_728_640 : 1_048_576;
  if (contentLength > maxBytes) {
    return c.json(
      {
        success: false,
        error: { message: isUpload ? 'Uploaded file exceeds 15MB limit' : 'Request body too large' },
      },
      413,
    );
  }
  await next();
});

// ── Global Middleware ──────────────────────────────────────────
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(
  '*',
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      // Use nonce-based scripts in production instead of unsafe-inline
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.FRONTEND_URL ?? 'http://localhost:3000'].filter(Boolean),
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
    strictTransportSecurity: 'max-age=31536000; includeSubDomains',
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'DENY',
    referrerPolicy: 'strict-origin-when-cross-origin',
    crossOriginEmbedderPolicy: false,
  }),
);

// ── Health Check ──────────────────────────────────────────────
app.route('/', healthRouter);

// ── API Routes ────────────────────────────────────────────────
const api = app.basePath(API_PREFIX);

// Apply rate limiting to all API routes
api.use('*', rateLimitMiddleware);

api.route('/auth', authRouter);
api.route('/brokers', brokersRouter);
api.route('/trades', tradesRouter);
api.route('/journal', journalRouter);
api.route('/analytics', analyticsRouter);
api.route('/admin', adminRouter);
api.route('/webhooks', webhooksRouter);
api.route('/payments', paymentRouter);
api.route('/subscriptions', subscriptionsRouter);
api.route('/playbooks', playbooksRouter);
api.route('/notifications', notificationsRouter);
api.route('/discipline', disciplineRouter);
api.route('/ai', aiRouter);
api.route('/store', storeRouter);
api.route('/reviews', reviewsRouter);
api.route('/strategies', strategiesRouter);
api.route('/leaderboard', leaderboardRouter);
api.route('/uploads', uploadsRouter);
api.route('/partners', partnersRouter);
api.route('/risk', riskRouter);
api.route('/config', configRouter);
api.route('/goals', goalsRouter);
api.route('/health', healthRouter);

// ── 404 Handler (covers both root and API-prefixed paths) ──
app.notFound((c) => {
  // The basePath('/api/v1') creates a sub-router, so the 404 only catches
  // non-prefixed routes. Add a fallback for the API router too.
  const path = c.req.path;
  if (path.startsWith(API_PREFIX)) {
    return c.json(
      {
        success: false,
        error: {
          message: `Route not found: ${c.req.method} ${path}`,
        },
      },
      404,
    );
  }
  return c.json(
    {
      success: false,
      error: {
        message: `Route not found: ${c.req.method} ${path}`,
      },
    },
    404,
  );
});

// ── Global Error Handler ──────────────────────────────────────
app.onError((err, c) => {
  console.error('[UNHANDLED ERROR]', err);

  const statusCode = 'status' in err && typeof (err as any).status === 'number'
    ? (err as any).status
    : 500;

  return c.json(
    {
      success: false,
      error: {
        message: process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : (err.message || 'Internal server error'),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      },
    },
    statusCode,
  );
});

// ── Server Start ──────────────────────────────────────────────
const port = env.PORT;
console.log(`🚀 TradeMind API starting on port ${port}...`);
console.log(`   Environment: ${env.NODE_ENV}`);
console.log(`   API prefix: ${API_PREFIX}`);
console.log(`   Frontend origin: ${env.FRONTEND_URL}`);

// ── Initialize Background Workers ─────────────────────────────
initializeWorkers().catch((err) => {
  console.error('❌ Failed to initialize background workers:', err);
});

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`🚀 TradeMind API listening on http://localhost:${info.port}`);
});

export default app;
