# Build context is the repo root: npm needs the whole workspace to resolve the lockfile.
FROM node:22-slim
WORKDIR /app

# Prisma's query engine needs OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/price-ingestor/package.json packages/price-ingestor/
COPY packages/api-server/package.json packages/api-server/
COPY packages/frontend/package.json packages/frontend/

RUN npm ci --include-workspace-root \
  --workspace @blockwatch/shared-types \
  --workspace @blockwatch/api-server

COPY packages/shared-types packages/shared-types
COPY packages/api-server packages/api-server

RUN npx prisma generate --schema packages/api-server/prisma/schema.prisma

EXPOSE 4000

# Migrations run on boot so a fresh volume comes up with a usable schema.
CMD ["sh", "-c", "npx prisma migrate deploy --schema packages/api-server/prisma/schema.prisma && npm run start --workspace @blockwatch/api-server"]
