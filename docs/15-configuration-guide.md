# Configuration Guide

> All configuration for DevOps Suite lives in two places:
> - **.env** - secrets and environment-specific values (never commit this)
> - **backend/src/main/resources/application.yml** - Spring Boot config (reads from .env)
>
> Use .env.example as the template. Copy it to .env and fill in your values.

---

## Quick Start

```bash
# 1. Copy the example
cp .env.example .env

# 2. Fill in your values (see sections below)
# At minimum, DB_PASSWORD and JWT_SECRET are required.

# 3. Start everything
docker-compose up -d postgres redis backend
```

---

## .env - All Variables

### Database (PostgreSQL)

| Variable | Required | Description |
|---|---|---|
| `DB_PASSWORD` | Yes | Password for the `postgres` user. Used by both the `postgres` container and the backend. |

> **Connection URL** is hardcoded in `docker-compose.yml` as `jdbc:postgresql://postgres:5432/devopssuite`. The host `postgres` is the Docker Compose service name.

---

### JWT Authentication

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | HMAC-SHA256 signing key. Must be at least 32 characters (256 bits). Generate with: `openssl rand -hex 32` |

> Access tokens expire in **24 hours**, refresh tokens in **7 days**.

---

### Google OAuth2 (Optional)

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | No | OAuth2 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | No | OAuth2 client secret |

Authorized redirect URI to register in Google Cloud Console:
- Docker: `http://localhost:8082/login/oauth2/code/google`
- Local dev: `http://localhost:8081/login/oauth2/code/google`

---

### GitHub OAuth2 (Optional)

| Variable | Required | Description |
|---|---|---|
| `GITHUB_CLIENT_ID` | No | Client ID from GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | No | Client secret from GitHub OAuth App |

Set **Authorization callback URL** in GitHub OAuth App to `http://localhost:8082` (Docker).

---

### Admin Proxy Authentication (nginx Basic Auth)

| Variable | Required | Description |
|---|---|---|
| `ADMIN_USER` | Yes | HTTP Basic Auth username for the nginx admin proxy |
| `ADMIN_PASSWORD` | Yes | HTTP Basic Auth password - protects **Grafana** at `:8080` and **Kibana** at `:8083` |

> Grafana and Kibana are **not** directly exposed on ports 3000 / 5601. They are proxied through nginx at ports 8080 and 8083 with this HTTP Basic Auth. **Change before deploying.**

---

### Admin Seed User (DataSeeder)

| Variable | Required | Description |
|---|---|---|
| `ADMIN_SEED_EMAIL` | No | Email for the default admin user seeded on first startup |
| `ADMIN_SEED_PASSWORD` | No | Password for the seeded admin user |
| `ADMIN_SEED_NAME` | No | Display name for the seeded admin user |

> The `DataSeeder` creates this user with `ROLE_ADMIN` on first start if no admin exists. Used for initial login.

---

### Rate Limiting (Redis Sliding Window)

| Variable | Required | Default | Description |
|---|---|---|---|
| `RATE_LIMIT_AUTH_MAX` | No | `20` | Max auth requests (login/register) per user per 60s |
| `RATE_LIMIT_EXECUTION_MAX` | No | `30` | Max code executions per user per 60s |
| `RATE_LIMIT_API_MAX` | No | `200` | Max general API requests per user per 60s |

---

### Frontend URL (Password Reset Emails)

| Variable | Required | Description |
|---|---|---|
| `FRONTEND_URL` | No | Base URL injected into password reset email links. Use `http://localhost:80` for Docker nginx or `http://localhost:5173` for local dev. |

---

### SMTP - Email (Optional)

> Required only for the **Forgot Password** flow. Leave `MAIL_HOST` blank to disable email.

| Variable | Required | Description |
|---|---|---|
| `MAIL_HOST` | No | SMTP server hostname. Leave blank to disable. |
| `MAIL_PORT` | No | Default `587` (STARTTLS). Use `465` for SSL, `2525` for Mailtrap. |
| `MAIL_USERNAME` | No | SMTP login username |
| `MAIL_PASSWORD` | No | SMTP login password |
| `MAIL_FROM` | No | The `From:` address shown in sent emails |

For local testing use Mailtrap (free tier). For production use Gmail App Password or SendGrid.

---

### Grafana

| Variable | Required | Description |
|---|---|---|
| `GRAFANA_PASSWORD` | No | Internal Grafana admin password. Default: `admin`. |

> Grafana is accessed via `http://localhost:8080` (nginx admin proxy with HTTP Basic Auth). It is **not** exposed directly on port 3000.

---

### Frontend Environment Variables (Vite / frontend/.env)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend base URL used by Axios. `http://localhost:8082` for Docker, `http://localhost:8081` for local native dev. |
| `VITE_WS_URL` | Yes | WebSocket base URL. `ws://localhost:8082/ws` for Docker, `ws://localhost:8081/ws` for local. |
| `VITE_GOOGLE_CLIENT_ID` | No | Google OAuth2 Client ID for the Google Sign-In button on the frontend |
| `VITE_GITHUB_CLIENT_ID` | No | GitHub OAuth App Client ID for the GitHub login button on the frontend |

---

### Docker Sandbox

| Variable | Required | Description |
|---|---|---|
| `DOCKER_HOST_TEMP_DIR` | No | Host temp directory for sandbox containers. Leave blank on Linux/macOS. Override on Windows WSL2 if needed. |

> Docker Desktop must be running. The backend mounts `/var/run/docker.sock` to create ephemeral code-execution containers.

---

### Elasticsearch

| Variable | Required | Description |
|---|---|---|
| `ELASTICSEARCH_HOST` | No | Hostname of Elasticsearch. Default `elasticsearch` (Docker Compose service name). |
| `ELASTICSEARCH_PORT` | No | Default `9200`. |

---

## application.yml Reference

All sensitive values use `\` syntax. Edit `.env`, not this file directly.

| Section | Key | Env Override | Default |
|---|---|---|---|
| Datasource password | `spring.datasource.password` | `DB_PASSWORD` | `password` |
| JWT secret | `jwt.secret` | `JWT_SECRET` | (weak placeholder) |
| JWT access expiry | `jwt.expiration` | - | `86400000` (24 h) |
| JWT refresh expiry | `jwt.refresh-expiration` | - | `604800000` (7 d) |
| Mail host | `spring.mail.host` | `MAIL_HOST` | (blank - disabled) |
| Mail port | `spring.mail.port` | `MAIL_PORT` | `587` |
| Google OAuth client ID | `spring.security.oauth2...client-id` | `GOOGLE_CLIENT_ID` | `dummy-id` |
| Elasticsearch host | `elasticsearch.host` | `ELASTICSEARCH_HOST` | `localhost` |
| Actuator endpoints | `management.endpoints.web.exposure.include` | - | `health,info,metrics,prometheus` |

---

## After Changing .env

```bash
# .env change only - restart is enough (no rebuild)
docker-compose restart backend

# Java source or application.yml changed - full rebuild needed
docker-compose up -d --build backend
```

---

## All Variables at a Glance

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DB_PASSWORD` | Yes | `password` | PostgreSQL password |
| `JWT_SECRET` | Yes | (weak placeholder) | JWT signing key |
| `GOOGLE_CLIENT_ID` | No | - | Google OAuth2 backend |
| `GOOGLE_CLIENT_SECRET` | No | - | Google OAuth2 backend |
| `GITHUB_CLIENT_ID` | No | - | GitHub OAuth2 backend |
| `GITHUB_CLIENT_SECRET` | No | - | GitHub OAuth2 backend |
| `ADMIN_USER` | Yes | `admin` | nginx Basic Auth username (Grafana/Kibana proxy) |
| `ADMIN_PASSWORD` | Yes | `changeme` | nginx Basic Auth password (Grafana/Kibana proxy) |
| `ADMIN_SEED_EMAIL` | No | `admin@devopssuite.local` | Seeded admin account email |
| `ADMIN_SEED_PASSWORD` | No | `Admin1234!` | Seeded admin account password |
| `ADMIN_SEED_NAME` | No | `Admin` | Seeded admin account display name |
| `RATE_LIMIT_AUTH_MAX` | No | `20` | Auth rate limit (req/min) |
| `RATE_LIMIT_EXECUTION_MAX` | No | `30` | Execution rate limit (req/min) |
| `RATE_LIMIT_API_MAX` | No | `200` | General API rate limit (req/min) |
| `FRONTEND_URL` | No | `http://localhost:5173` | Password reset link base URL |
| `MAIL_HOST` | No | (blank) | SMTP server |
| `MAIL_PORT` | No | `587` | SMTP port |
| `MAIL_USERNAME` | No | - | SMTP username |
| `MAIL_PASSWORD` | No | - | SMTP password |
| `MAIL_FROM` | No | `noreply@devopssuite.local` | Email sender address |
| `GRAFANA_PASSWORD` | No | `admin` | Grafana internal admin password |
| `DOCKER_HOST_TEMP_DIR` | No | (blank) | Docker sandbox temp dir |
| `ELASTICSEARCH_HOST` | No | `elasticsearch` | Elasticsearch hostname |
| `ELASTICSEARCH_PORT` | No | `9200` | Elasticsearch port |
| `VITE_API_URL` | Yes (frontend) | `http://localhost:8082` | Frontend -> backend API base URL |
| `VITE_WS_URL` | Yes (frontend) | `ws://localhost:8082/ws` | Frontend -> backend WebSocket URL |
| `VITE_GOOGLE_CLIENT_ID` | No | - | Google OAuth frontend client ID |
| `VITE_GITHUB_CLIENT_ID` | No | - | GitHub OAuth frontend client ID |