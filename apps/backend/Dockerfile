FROM node:22-slim

RUN corepack enable
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy full monorepo (needed for workspace deps and prisma schema)
COPY . .

# Install exactly what pnpm-lock.yaml pins; fail the build if it's out of date
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN cd packages/db && npx prisma generate

EXPOSE 3000
CMD ["pnpm", "--filter", "backend", "start"]
