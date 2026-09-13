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
  --workspace @blockwatch/frontend

COPY packages/shared-types packages/shared-types
COPY packages/frontend packages/frontend

# NEXT_PUBLIC_* values are inlined at build time, and these are the URLs the
# browser uses, so they point at the host's published ports rather than compose
# service names.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

RUN npm run build --workspace @blockwatch/frontend

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace", "@blockwatch/frontend"]
