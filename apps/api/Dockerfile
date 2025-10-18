FROM node:20-alpine AS base
RUN corepack enable pnpm
ENV CI=true

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/core-schemas/package.json ./packages/core-schemas/
# Copy Prisma schema before install to allow prepare script to run
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
# Use deps' node_modules as the base for building
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure local node_modules symlinks for workspace packages that need devDeps (tsc)
RUN pnpm -C packages/core-schemas install --frozen-lockfile --prod=false
# Explicitly generate Prisma client inside the API package using local binary
RUN cd apps/api && ../../node_modules/.bin/prisma generate
RUN pnpm --filter @influencerai/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/
# Copy root node_modules from the builder stage so the generated Prisma client (.prisma) is included
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/src/main.js"]
