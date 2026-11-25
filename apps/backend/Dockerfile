# Backend image: only the backend and the db package, production dependencies only, run as non-root.
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app
# Lockfile, workspace config (allowBuilds) and root manifest (pnpm overrides) shape every install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# --- Stage 1: generate the Prisma client (needs the prisma CLI, a devDependency of db) ---------
FROM base AS prisma
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile --filter @softeng-app/db
COPY packages/db packages/db
RUN pnpm --filter @softeng-app/db exec prisma generate

# --- Stage 2: runtime --------------------------------------------------------------------------
FROM base AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl tini && rm -rf /var/lib/apt/lists/*

# Manifests first so the dependency layer is cached until a package.json or the lockfile changes.
# `backend...` = backend plus the workspace packages it depends on (db); --prod skips devDependencies.
COPY apps/backend/package.json apps/backend/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile --prod --filter backend...

COPY packages/db packages/db
COPY --from=prisma /app/packages/db/generated packages/db/generated
COPY apps/backend apps/backend

# Files stay root-owned: the app only reads them (uploads are in memory, and tesseract finds its
# cached eng.traineddata in the working directory instead of downloading it).
USER node
WORKDIR /app/apps/backend
EXPOSE 3000
# Run node directly rather than via `pnpm start`: corepack would otherwise fetch pnpm into the
# non-root user's home at startup, and the pnpm wrapper doesn't pass on stop signals.
# tini as PID 1 forwards SIGTERM to node (which, as PID 1, would ignore it) and reaps zombies.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "--import", "tsx", "src/app.ts"]
