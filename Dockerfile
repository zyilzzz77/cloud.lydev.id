# syntax=docker/dockerfile:1.7

# Next.js 16 standalone image for lydev-cloud.
# The runtime stage mirrors deploy/lydev-cloud.service: node server.js bound to
# 127.0.0.1:3000, with Caddy in front.

ARG NODE_VERSION=22
ARG PNPM_VERSION=10

FROM node:${NODE_VERSION}-bookworm-slim AS base
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    npm_config_store_dir=/pnpm/store \
    NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@${PNPM_VERSION} && npm cache clean --force

# ---------------------------------------------------------------- dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------- build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined at build time, so they must be build args.
# DATABASE_URL and JWT_SECRET are only here because src/lib/env.ts validates the
# environment while Next collects page data; they are not baked into the image.
ARG APP_URL
ARG NEXT_PUBLIC_CDN_URL
ARG NEXT_PUBLIC_SHORT_URL
ARG NEXT_PUBLIC_DL_URL
ARG DATABASE_URL
ARG JWT_SECRET

ENV APP_URL=${APP_URL} \
    NEXT_PUBLIC_CDN_URL=${NEXT_PUBLIC_CDN_URL} \
    NEXT_PUBLIC_SHORT_URL=${NEXT_PUBLIC_SHORT_URL} \
    NEXT_PUBLIC_DL_URL=${NEXT_PUBLIC_DL_URL} \
    DATABASE_URL=${DATABASE_URL} \
    JWT_SECRET=${JWT_SECRET}

RUN pnpm build

# ---------------------------------------------------------------------- tools
# Migration and maintenance image: full source plus devDependencies, so
# `pnpm db:migrate` and `pnpm worker:cleanup` can run against production.
FROM base AS tools
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["pnpm", "db:migrate"]

# -------------------------------------------------------------------- runtime
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=127.0.0.1

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --home-dir /app nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Local storage driver fallback (src/services/storage/storage.service.ts).
RUN mkdir -p /app/.uploads && chown nextjs:nodejs /app/.uploads

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
