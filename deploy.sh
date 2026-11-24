#!/usr/bin/env bash
# Build → push to Docker Hub → roll out on the homelab.
#
# Ships the image only. The deployed config (compose.yml, .env, Caddy, monitoring) lives in
# the Selfhosting repo under compose/$STACK/ and is deployed by its Ansible playbook.
#
#   :latest mode (VERSION_FROM=""):   push :latest, then pull + recreate $SERVICES on $HOST.
#   versioned mode (VERSION_FROM set): tag vX.Y.Z in git, push :X.Y.Z and :latest. No remote
#       step — Selfhosting pins the version, so roll out by bumping the tag in its compose.yml
#       (or merging Renovate's PR) and running its docker_compose playbook.
#
# Usage: ./deploy.sh [-m "release message"]   (-m needed only when creating a new version tag)
set -euo pipefail

# --- config -------------------------------------------------------------------------------
REGISTRY="potatorocket"
IMAGES=(                        # name:dockerfile[:context]  (context defaults to the repo root)
  "softeng-frontend:apps/frontend/Dockerfile"
  "softeng-backend:apps/backend/Dockerfile"
  "softeng-ml-server:apps/python/Dockerfile"
)
BUILD_FLAGS=()                  # extra `docker build` flags, e.g. (--network=host)
HOST="elitedesk-2"              # must match the host whose compose_stacks lists $STACK
STACK="softeng-demo"            # stack dir: /opt/compose/$STACK on $HOST
SERVICES=()                     # compose services to recreate; empty = the whole stack
VERSION_FROM=""                 # "" | pyproject | package.json
# ------------------------------------------------------------------------------------------

cd "$(dirname "$0")"

message=""
if [[ "${1:-}" == "-m" ]]; then
  message="${2:?-m needs a message}"
fi

version=""
case "$VERSION_FROM" in
  "") ;;
  pyproject) version=$(python3 -c "import tomllib; print(tomllib.load(open('pyproject.toml','rb'))['project']['version'])") ;;
  package.json) version=$(node -p "require('./package.json').version") ;;
  *) echo "Unknown VERSION_FROM: $VERSION_FROM" >&2; exit 1 ;;
esac

if [[ -n "$version" ]]; then
  [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Version '$version' isn't X.Y.Z" >&2; exit 1; }
  if git rev-parse -q --verify "refs/tags/v$version" >/dev/null; then
    # Re-running an existing version rebuilds and re-pushes it, but never moves the tag.
    echo "==> Tag v$version exists, skipping git tag (bump the version to cut a new release)"
  else
    [[ -n "$message" ]] || { echo "New version v$version: pass -m \"release message\"" >&2; exit 1; }
    [[ -z "$(git status --porcelain)" ]] || { echo "Working tree is dirty; commit first" >&2; exit 1; }
    echo "==> Tagging v$version"
    git tag "v$version" -m "$message"
    git push origin "v$version"
  fi
fi

echo "==> Building"
for entry in "${IMAGES[@]}"; do
  IFS=: read -r name dockerfile context <<<"$entry"
  docker build "${BUILD_FLAGS[@]}" -f "$dockerfile" -t "$REGISTRY/$name:latest" "${context:-.}"
  if [[ -n "$version" ]]; then docker tag "$REGISTRY/$name:latest" "$REGISTRY/$name:$version"; fi
done

echo "==> Pushing"
for entry in "${IMAGES[@]}"; do
  name="${entry%%:*}"
  docker push "$REGISTRY/$name:latest"
  if [[ -n "$version" ]]; then docker push "$REGISTRY/$name:$version"; fi
done

if [[ -n "$version" ]]; then
  echo "==> Released v$version. Roll out: bump the tag in Selfhosting compose/$STACK/compose.yml, then"
  echo "    ansible-playbook playbooks/docker_compose.ansible.yml --limit $HOST"
  exit 0
fi

echo "==> Recreating on $HOST:/opt/compose/$STACK ${SERVICES[*]:-(whole stack)}"
ssh "$HOST" "cd /opt/compose/$STACK && sudo docker compose pull --quiet ${SERVICES[*]} && sudo docker compose up -d --force-recreate ${SERVICES[*]}"

echo "==> Done"
