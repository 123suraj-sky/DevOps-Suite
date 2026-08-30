```yml
# docker-compose.override.yml
# ─────────────────────────────────────────────────────────────────────────────
# This file is automatically merged by Docker Compose on your LOCAL machine.
# It is git-ignored so it never affects CI or the production VM.
#
# What it does:
#   - Disables the "frontend" Nginx service locally (use "npm run dev" instead)
#
# Usage: just run docker compose up -d as normal — this override applies automatically.
# ─────────────────────────────────────────────────────────────────────────────

services:
  frontend:
    profiles:
      - production   # only starts when: docker compose --profile production up -d
```