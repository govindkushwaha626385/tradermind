# ──────────────────────────────────────────────
# TradeMind API — Production Dockerfile
# ──────────────────────────────────────────────

FROM node:20-alpine AS base

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy root workspace configs
COPY package.json package-lock.json turbo.json ./

# Copy packages
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Build shared packages and API
RUN npx turbo run build --filter=@trademind/api...

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Create unprivileged app user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 trademind

# Copy built artifacts and production dependencies
COPY --from=base /app/package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/package.json ./apps/api/

USER trademind

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "apps/api/dist/index.js"]
