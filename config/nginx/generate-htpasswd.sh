#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Generates /etc/nginx/conf.d/.htpasswd for the admin nginx proxy.
#
# Called as an init container in docker-compose. Reads credentials from
# environment variables:
#   ADMIN_USER     — username  (default: admin)
#   ADMIN_PASSWORD — password  (REQUIRED — no default for security)
#
# The resulting .htpasswd is written to a shared volume mounted by nginx.
# ─────────────────────────────────────────────────────────────────────────────

set -e

ADMIN_USER="${ADMIN_USER:-admin}"

if [ -z "$ADMIN_PASSWORD" ]; then
  echo "[htpasswd-init] ERROR: ADMIN_PASSWORD environment variable is not set."
  exit 1
fi

# Use openssl to create a bcrypt-compatible htpasswd entry
HASH=$(openssl passwd -apr1 "$ADMIN_PASSWORD")
echo "${ADMIN_USER}:${HASH}" > /etc/nginx/conf.d/.htpasswd

echo "[htpasswd-init] .htpasswd written for user '${ADMIN_USER}'"
