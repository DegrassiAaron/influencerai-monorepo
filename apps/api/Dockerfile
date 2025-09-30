FROM node:20-alpine AS base
RUN corepack enable pnpm
ENV CI=true

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/core-schemas/package.json ./packages/core-schemas/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure local node_modules symlinks for workspace packages that need devDeps (tsc)
RUN pnpm -C packages/core-schemas install --frozen-lockfile --prod=false
RUN pnpm --filter @influencerai/api prisma generate
RUN pnpm --filter @influencerai/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=deps /app/node_modules ./node_modules

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
