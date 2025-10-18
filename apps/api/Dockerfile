FROM node:20-alpine AS base
RUN corepack enable pnpm
ENV CI=true

FROM base AS builder
WORKDIR /app
COPY . .
# Install all dependencies including devDeps for building
# Prisma client is generated via prepare script during install
RUN pnpm install --frozen-lockfile
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
