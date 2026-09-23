# ──────────────────────────────────────────────
# TradeMind Web — Production Dockerfile
# ──────────────────────────────────────────────

FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root workspace configs
COPY package.json package-lock.json turbo.json ./

# Copy packages
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build web application
RUN npx turbo run build --filter=@trademind/web...

# Runner image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=base /app/apps/web/public ./apps/web/public
COPY --from=base /app/apps/web/.next ./apps/web/.next
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

USER nextjs

EXPOSE 3000

CMD ["npx", "next", "start", "apps/web"]
