# TradeMind — Automated Trading Journal

A production-grade, automated trading journal SaaS platform for Indian retail traders. Connects to 8 Indian brokers, auto-syncs trades, and provides behavioral analytics to help traders understand their patterns.

## Architecture

```
trademind/
├── apps/
│   ├── api/          # Hono backend server (TypeScript)
│   │   ├── routes/   # 11 route files (auth, brokers, trades, admin, etc.)
│   │   ├── middleware/ # Auth, validation, rate limiting, usage enforcement
│   │   ├── services/  # Business logic (analytics, payments, email, tax)
│   │   ├── connectors/ # 8 broker API connectors
│   │   └── workers/   # Background workers (sync, webhook, clustering, reports)
│   └── web/          # Next.js 15 App Router frontend
│       └── src/
│           ├── app/          # 22 pages (dashboard, admin, auth, etc.)
│           ├── components/   # Shared UI components
│           └── lib/          # API client, utilities
├── packages/
│   ├── shared/       # Types, constants, enums, utilities
│   ├── database/     # Drizzle ORM schema, migrations, seeds
│   └── config/       # Dynamic configuration system (DB-backed)
└── scripts/          # Backup & ops scripts
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 20+ |
| **Backend** | Hono 4.6, TypeScript |
| **Frontend** | Next.js 15, React 19, TailwindCSS 3.4 |
| **Database** | Supabase (PostgreSQL) + Drizzle ORM |
| **Auth** | Supabase Auth + JWT |
| **Queue** | PostgreSQL Job Queue (Supabase) |
| **Payments** | Razorpay |
| **Email** | Resend |
| **Encryption** | AES-256-GCM (broker tokens at rest) |

## Features

### ✅ Completed
- **8 Broker Connectors** — Zerodha, Dhan, Angel One, Upstox, Groww, Sahi, Lemonn, Delta Exchange
- **Auto Trade Sync** — Background workers with deduplication and quota enforcement
- **Journal Engine** — Emotions, mistake tags, rule compliance, notes, screenshots
- **FIFO Clustering** — Automatically groups executions into journal trades
- **Behavioral Analytics** — Emotion↔P&L correlation, streaks, session analysis, MFE/MAE
- **Discipline Engine** — Checklists, trade plans, trade ratings, compliance scoring
- **Razorpay Payments** — Order creation, signature verification, webhooks, subscriptions
- **Admin Dashboard** — Config editor, user management, subscription management, sync logs
- **Usage Limits** — Plan-based enforcement on broker connections and monthly trade imports
- **Scheduled Reports** — Daily P&L summary and weekly behavioral report emails
- **Dynamic Configuration** — DB-backed config system with 40+ settings
- **RLS Multi-tenancy** — Row-level security on all 19+ tables
- **SEO** — OpenGraph, Twitter cards, viewport, manifest, caching headers
- **Loading States** — 12 route-level loading.tsx files
- **Security** — CSP headers, rate limiting, HMAC webhook verification, AES-256-GCM encryption

### ✅ Implemented
- Journal CSV export (with emotions, mistakes, and notes)
- Admin audit log (immutable privileged-action trail)
- Admin tax-rate & plan editors
- Email notifications (Resend) & broker sync alerts
- Live broker funds/margins on the dashboard

## Quick Start

### Prerequisites
- Node.js 20+
- **Supabase project (free tier works)** — Supabase is the **primary database and auth provider**
- Razorpay account (for payments)

### Setup

```bash
# 1. Clone and install
git clone <repo> trademind
cd trademind
npm install

# 2. Copy environment config
cp .env.example .env
# Edit .env — the essential values are:
#   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
#   SUPABASE_DATABASE_URL   (Supabase SQL Editor → Connection settings → Pooler/Transaction string)
#   ENCRYPTION_KEY          (node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 3. Apply schema + RLS + seed defaults (ONE COMMAND, scripted)
npm run db:setup
#   = applies packages/database/src/migrations/0000_*.sql (23 tables, FKs, indexes)
#   + complete-setup.sql (all Row-Level-Security policies)
#   + seeds tax rates, admin configs, and subscription plans

# 4. Start development
npm run dev
```

> **Note:** TradeMind uses **Supabase as the single source of truth** — database, cache, job queues, and rate limiting all run on Supabase PostgreSQL. No external queue or cache infrastructure required.

### Environment Variables
See `.env.example` for all required variables. Key ones:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DATABASE_URL` — Supabase (primary Auth + Postgres database)
- `ENCRYPTION_KEY` — AES-256 key (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — Payments
- `FRONTEND_URL` — Your frontend domain

### Production Build

```bash
# Build all packages
npm run build

# Start API server
cd apps/api && node dist/index.js

# Build frontend
cd apps/web && npx next build

# Or — run the full stack in Docker (Supabase is the only external dependency)
docker compose --env-file .env.docker.example up --build
```

## API Routes

All routes are under `/api/v1`.

### Public
- `POST /auth/register` — Create account
- `POST /auth/login` — Sign in
- `GET /payments/plans` — List plans
- `POST /webhooks/:broker` — Broker webhooks (4 brokers)

### Authenticated
- `GET /auth/me` — Profile
- `GET /brokers` — List connections
- `GET /trades` — Trade executions
- `GET /journal` — Journal trades
- `GET /analytics/*` — Dashboard, behavioral, calendar
- `GET /discipline/*` — Checklists, plans, ratings, stats
- `GET /payments/subscription` — Current subscription
- `GET /payments/usage` — Plan usage meter

### Admin Only
- `GET /admin/users` — User management
- `GET /admin/subscriptions` — Subscription management
- `GET /admin/sync-logs` — Sync history
- `GET /admin/config` — System configuration
- `GET /admin/stats` — System statistics

## Backup

```bash
# Database backup (requires SUPABASE_DATABASE_URL in .env)
./scripts/backup.sh
```

## License

Proprietary — All rights reserved.
