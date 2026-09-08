#!/bin/sh
set -e

# Generate runtime config for the React app
cat > /usr/share/nginx/html/config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  AUTH0_DOMAIN: "${AUTH0_DOMAIN}",
  AUTH0_CLIENT_ID: "${AUTH0_CLIENT_ID}",
  AUTH0_AUDIENCE: "${AUTH0_AUDIENCE}"
};
EOF

# Render nginx config template (only substitute our vars, not nginx's own $host etc.)
envsubst '${API_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
