# Configuration Guide

> All configuration for DevOps Suite lives in two places:
> - **`.env`** — secrets and environment-specific values (never commit this)
> - **`backend/src/main/resources/application.yml`** — Spring Boot config (reads from `.env`)
>
> Use `.env.example` as the template. Copy it to `.env` and fill in your values.

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

## `.env` — All Variables

### Database (PostgreSQL)

```env
DB_PASSWORD=password
```

| Variable | Required | Description |
|---|---|---|
| `DB_PASSWORD` | Yes | Password for the `postgres` user. Used by both the `postgres` container and the backend. |

> **Connection URL** is hardcoded in `docker-compose.yml` as `jdbc:postgresql://postgres:5432/devopssuite`. The host `postgres` is the Docker Compose service name.

---

### JWT Authentication

```env
JWT_SECRET=devops-suite-jwt-secret-key-minimum-256-bits-for-hs256-algorithm
```

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | HMAC-SHA256 signing key. Must be **at least 32 characters** (256 bits). |

**Generate a strong secret:**
```bash
openssl rand -hex 32
```

> Access tokens expire in **24 hours**, refresh tokens in **7 days**. Configurable in `application.yml` via `jwt.expiration` / `jwt.refresh-expiration`.

---

### Google OAuth2 (Optional)

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | No | OAuth2 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | No | OAuth2 client secret |

**Setup steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/) > APIs & Services > Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add authorized redirect URI: `http://localhost:8081/login/oauth2/code/google`
4. Copy the Client ID and Secret into `.env`

> Leave both blank to disable Google login entirely.

---

### SMTP — Email (Optional)

> Required only for the **Forgot Password** flow. Leave `MAIL_HOST` blank to disable email.
> All other features work without SMTP.

```env
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM=noreply@devopssuite.local
```

| Variable | Required | Description |
|---|---|---|
| `MAIL_HOST` | No | SMTP server hostname. Leave blank to disable. |
| `MAIL_PORT` | No | Default `587` (STARTTLS). Use `465` for SSL, `2525` for Mailtrap. |
| `MAIL_USERNAME` | No | SMTP login username |
| `MAIL_PASSWORD` | No | SMTP login password |
| `MAIL_FROM` | No | The `From:` address shown in sent emails |

#### Dev — Mailtrap (recommended for local testing)
1. Sign up at [mailtrap.io](https://mailtrap.io) — free tier available
2. Go to **Email Testing > Inboxes > SMTP Settings**
3. Fill in `.env`:
```env
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=<your-mailtrap-username>
MAIL_PASSWORD=<your-mailtrap-password>
MAIL_FROM=noreply@devopssuite.local
```

#### Production — Gmail App Password
1. Enable 2FA on your Google account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords) and generate one
3. Fill in `.env`:
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=you@gmail.com
MAIL_PASSWORD=<16-char-app-password>
MAIL_FROM=you@gmail.com
```

#### Production — SendGrid
```env
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=<your-sendgrid-api-key>
MAIL_FROM=noreply@yourdomain.com
```

---

### Grafana

```env
GRAFANA_PASSWORD=admin
```

| Variable | Required | Description |
|---|---|---|
| `GRAFANA_PASSWORD` | No | Admin password for Grafana at `http://localhost:3000`. Default: `admin`. |

> Username is always `admin`.

---

### Docker Sandbox

```env
DOCKER_HOST_TEMP_DIR=
```

| Variable | Required | Description |
|---|---|---|
| `DOCKER_HOST_TEMP_DIR` | No | Host temp directory for sandbox containers. Leave blank on Linux/macOS. Override on Windows WSL2 if needed. |

> Docker Desktop must be running. The backend mounts `/var/run/docker.sock` to create ephemeral code-execution containers.

---

### Elasticsearch

```env
ELASTICSEARCH_HOST=elasticsearch
ELASTICSEARCH_PORT=9200
```

| Variable | Required | Description |
|---|---|---|
| `ELASTICSEARCH_HOST` | No | Hostname of Elasticsearch. Default `elasticsearch` (Docker Compose service name). |
| `ELASTICSEARCH_PORT` | No | Default `9200`. |

---

## `application.yml` Reference

[`backend/src/main/resources/application.yml`](../backend/src/main/resources/application.yml)

All sensitive values use `${ENV_VAR:default}` syntax — edit `.env`, not this file directly.

| Section | Key | Env Override | Default |
|---|---|---|---|
| Datasource password | `spring.datasource.password` | `DB_PASSWORD` | `password` |
| JWT secret | `jwt.secret` | `JWT_SECRET` | *(weak placeholder)* |
| JWT access expiry | `jwt.expiration` | — | `86400000` (24 h) |
| JWT refresh expiry | `jwt.refresh-expiration` | — | `604800000` (7 d) |
| Mail host | `spring.mail.host` | `MAIL_HOST` | *(blank — disabled)* |
| Mail port | `spring.mail.port` | `MAIL_PORT` | `587` |
| Google OAuth client ID | `spring.security.oauth2...client-id` | `GOOGLE_CLIENT_ID` | `dummy-id` |
| Elasticsearch host | `elasticsearch.host` | `ELASTICSEARCH_HOST` | `localhost` |
| Actuator endpoints | `management.endpoints.web.exposure.include` | — | `health,info,metrics,prometheus` |

---

## After Changing `.env`

```bash
# .env change only — restart is enough (no rebuild)
docker-compose restart backend

# Java source or application.yml changed — full rebuild needed
docker-compose up -d --build backend
```

---

## All Variables at a Glance

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DB_PASSWORD` | Yes | `password` | PostgreSQL password |
| `JWT_SECRET` | Yes | *(weak placeholder)* | JWT signing key |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth2 login |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth2 login |
| `MAIL_HOST` | No | *(blank — disabled)* | SMTP server |
| `MAIL_PORT` | No | `587` | SMTP port |
| `MAIL_USERNAME` | No | — | SMTP username |
| `MAIL_PASSWORD` | No | — | SMTP password |
| `MAIL_FROM` | No | `noreply@devopssuite.local` | Email sender address |
| `GRAFANA_PASSWORD` | No | `admin` | Grafana admin password |
| `DOCKER_HOST_TEMP_DIR` | No | *(blank)* | Docker sandbox temp dir |
| `ELASTICSEARCH_HOST` | No | `elasticsearch` | Elasticsearch hostname |
| `ELASTICSEARCH_PORT` | No | `9200` | Elasticsearch port |
