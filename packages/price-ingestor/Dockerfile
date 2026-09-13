# Build context is the repo root: npm needs the whole workspace to resolve the lockfile.
FROM node:22-slim
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/price-ingestor/package.json packages/price-ingestor/
COPY packages/api-server/package.json packages/api-server/
COPY packages/frontend/package.json packages/frontend/

RUN npm ci --include-workspace-root \
  --workspace @blockwatch/shared-types \
  --workspace @blockwatch/price-ingestor

COPY packages/shared-types packages/shared-types
COPY packages/price-ingestor packages/price-ingestor

CMD ["npm", "run", "start", "--workspace", "@blockwatch/price-ingestor"]
