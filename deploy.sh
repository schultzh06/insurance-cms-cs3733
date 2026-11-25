#!/usr/bin/env bash
# Build → push to Docker Hub → roll out on the homelab through Komodo.
#
# The stack itself (compose.yml, routing, non-secret config) is declared in the Selfhosting repo
# and deployed by Komodo's resource sync. Its secrets are not: the backend reads them from
# $REMOTE_ENV on $HOST, which this script writes from the local $ENV_FILE (interim, until the
# secrets move into Komodo). Komodo can't see that file change, so this script asks it to redeploy.
#
#   :latest mode (VERSION_FROM=""):   push :latest, copy $ENV_FILE to $HOST:$REMOTE_ENV, then
#       ask Komodo to DeployStack $STACK (pulls the new images and recreates) and wait for it.
#   versioned mode (VERSION_FROM set): tag vX.Y.Z in git, push :X.Y.Z and :latest. No remote
#       step — roll out by bumping the tag in Selfhosting's compose.yml and letting Komodo sync.
#
# :latest mode also needs the bws CLI and an unlocked keyring (the BWS access token is read with
# secret-tool, as ~/.bashrc's with_bws_token does), plus ssh + sudo on $HOST.
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
HOST="elitedesk-2"              # host Komodo deploys $STACK to
STACK="softeng-demo"            # Komodo stack name
VERSION_FROM=""                 # "" | pyproject | package.json
ENV_FILE="apps/backend/.env"    # gitignored + dockerignored; the same file local dev uses
REMOTE_ENV="/etc/softeng-demo/.env"  # the backend's env_file in Selfhosting's compose.yml
DEPLOY_TIMEOUT=600              # seconds to wait for Komodo's deploy to finish
KOMODO_URL="https://komodo.lan.stomberg.us"
KOMODO_KEY_UUID="98e1a17d-007b-415a-9f47-b50d012d3114"  # BWS secret: Komodo API key for deploys (needs execute on $STACK)
KOMODO_SECRET_UUID="96e48e24-22c0-40ca-812a-b50d012d146a"  # BWS secret: that key's API secret
# ------------------------------------------------------------------------------------------

cd "$(dirname "$0")"

# Fail before the slow build rather than after it.
if [[ -z "$VERSION_FROM" ]]; then
  [[ -s "$ENV_FILE" ]] || { echo "Missing or empty $ENV_FILE" >&2; exit 1; }

  # Reads one secret's value from BWS by UUID. The access token comes from the environment or the
  # keyring and rides only the bws call's environment, never this script's.
  bws_get() {
    BWS_ACCESS_TOKEN="${BWS_ACCESS_TOKEN:-$(secret-tool lookup service bws 2>/dev/null)}" \
      command bws secret get "$1" --output json | jq -r '.value // empty'
  }
  KOMODO_API_KEY=$(bws_get "$KOMODO_KEY_UUID") || true
  KOMODO_API_SECRET=$(bws_get "$KOMODO_SECRET_UUID") || true
  if [[ -z "$KOMODO_API_KEY" || -z "$KOMODO_API_SECRET" ]]; then
    echo "Couldn't read the Komodo API key from BWS (keyring locked, or KOMODO_*_UUID unset?)" >&2
    exit 1
  fi
fi

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
  # Matches X.Y.Z: three dot-separated runs of digits, anchored at both ends.
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
  echo "==> Released v$version. Roll out: bump the tag in Selfhosting stacks/$STACK/compose.yml and"
  echo "    commit; Komodo's resource sync deploys it."
  exit 0
fi

echo "==> Copying $ENV_FILE to $HOST:$REMOTE_ENV"
# Streamed over ssh so no copy of the secrets lands in a temp file; umask 077 makes it mode 600
# (root-owned, which Periphery can read since it runs compose as root).
# shellcheck disable=SC2029  # $REMOTE_ENV is meant to expand locally
ssh "$HOST" "sudo sh -c 'umask 077 && mkdir -p $(dirname "$REMOTE_ENV") && cat > $REMOTE_ENV'" < "$ENV_FILE"

# POSTs one Komodo API request ($1 = execute|read, $2 = request type, $3 = params JSON).
komodo() {
  curl -fsS "${KOMODO_URL%/}/$1" \
    -H "x-api-key: $KOMODO_API_KEY" -H "x-api-secret: $KOMODO_API_SECRET" \
    -H "content-type: application/json" \
    -d "$(jq -n --arg type "$2" --argjson params "$3" '{type: $type, params: $params}')"
}

echo "==> Asking Komodo to deploy $STACK"
update_id=$(komodo execute DeployStack "$(jq -n --arg s "$STACK" '{stack: $s}')" | jq -r '._id["$oid"] // ._id // .id')

# DeployStack returns as soon as it's queued; poll its Update until Komodo marks it complete.
deadline=$((SECONDS + DEPLOY_TIMEOUT))
while :; do
  update=$(komodo read GetUpdate "$(jq -n --arg id "$update_id" '{id: $id}')")
  if [[ "$(jq -r .status <<<"$update")" == "Complete" ]]; then
    if [[ "$(jq -r .success <<<"$update")" == "true" ]]; then
      echo "==> Done"
      exit 0
    fi
    echo "Komodo deploy failed. Its log:" >&2
    jq -r '.logs[] | "--- \(.stage)\n\(.stdout)\(.stderr)"' <<<"$update" >&2
    exit 1
  fi
  (( SECONDS < deadline )) || { echo "Timed out waiting for Komodo (update $update_id)" >&2; exit 1; }
  sleep 5
done
