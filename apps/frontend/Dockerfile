# Stage 1: Build the static files
FROM node:22-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY . .
# Install exactly what pnpm-lock.yaml pins; fail the build if it's out of date
RUN pnpm install --frozen-lockfile
RUN pnpm --filter frontend build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine AS runner

COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf.template /etc/nginx/nginx.conf.template
COPY apps/frontend/docker-entrypoint.sh /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
