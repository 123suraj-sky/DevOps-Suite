# MEMORY.md — Persistent Agent Memory

> **Updated by agents after each significant task.**
> This file captures key decisions, gotchas, and context that shouldn't need to be re-discovered.
> Always read this before starting work. Always update this after discovering something important.

---

## 🏛️ Architecture Decisions (Finalized — Do Not Revisit)

| Decision | Context | Date |
|---|---|---|
| **Monolith over microservices** | Started as microservices, converted to a single Spring Boot app. All services are packages under `com.devopssuite.monolith`. Do NOT re-introduce microservice separation. | — |
| **No Kafka** | Replaced with Spring's internal `ApplicationEventPublisher` for async events. Removed Kafka and Zookeeper from docker-compose. Do NOT add them back. | — |
| **No API Gateway** | Removed Spring Cloud Gateway. The monolith handles all routing internally. | — |
| **Single PostgreSQL DB** | One database `devopssuite`, managed entirely by Flyway. All domains share the same schema. | — |
| **Port 8081 for backend** | Backend is hardcoded to `8081` across frontend `.env`, `docker-compose.yml`, and README. Do not change this port without updating all references. | — |
| **Tailwind CSS on frontend** | Frontend uses Tailwind CSS for styling. Do not introduce other CSS frameworks. Maintain consistency with existing components. | — |

---

## ⚠️ Known Gotchas & Issues

- **Maven build must be run from `/backend` directory.** The root directory does not have a parent `pom.xml` for the monolith.
- **Frontend `.env` contains `VITE_API_URL=http://localhost:8081` and `VITE_WS_URL=ws://localhost:8081/ws`.** Do not change these without updating the frontend `.env.example` too.
- **Code execution sandbox requires Docker Desktop to be running** on the local machine — it creates ephemeral containers at runtime.
- **Google OAuth2 requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`** — see `oauth_setup.md` in root for the setup guide.
- **`progress.md` in root references old microservice paths** (e.g., `c:/Users/DELL/Desktop/...`) — these are stale links from an earlier project state; ignore them.
- **Flyway migration files are in** `backend/src/main/resources/db/migration/`. Always name new migrations `V{next}__description.sql` following existing numbering.

---

## ✅ Verified Working (as of last check)

- `mvn clean compile` — backend compiles successfully
- Database schemas unified into a single Flyway migration
- Auth module (registration, login, JWT filter) — fully implemented
- Project module (projects, boards, columns, tasks CRUD) — fully implemented
- Frontend API paths pointing to `http://localhost:8081/api` — confirmed

---

## 🔧 Partially Implemented

- **Code Execution Sandbox** — Core classes and model mappings exist; sandboxing logic via Docker runner needs completion
- **Logging pipeline to Elasticsearch** — Structured log emission in place; Elasticsearch write pipeline needs wiring
- **WebSocket real-time features** — Config exists; end-to-end testing with live backend not yet completed

---

## 📋 Key Environment Variables

| Variable | Used By | Description |
|---|---|---|
| `JWT_SECRET` | Backend | HMAC secret for signing JWTs |
| `JWT_EXPIRATION_MS` | Backend | Access token TTL (default: 3600000 = 1h) |
| `REFRESH_TOKEN_EXPIRATION_MS` | Backend | Refresh token TTL (default: 604800000 = 7d) |
| `DB_URL` | Backend | PostgreSQL JDBC URL |
| `DB_USERNAME` / `DB_PASSWORD` | Backend | Database credentials |
| `REDIS_HOST` / `REDIS_PORT` | Backend | Redis connection |
| `GOOGLE_CLIENT_ID` | Backend | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | Backend | Google OAuth2 client secret |
| `VITE_API_URL` | Frontend | Backend REST base URL |
| `VITE_WS_URL` | Frontend | WebSocket endpoint URL |

---

## 📝 Agent Notes Log

> _Append new entries below with a short description and context._

| Date | Agent | Note |
|---|---|---|
| 2026-08-07 | Antigravity | Initial MEMORY.md created from project codebase analysis. Auth + Project modules confirmed working. Code execution sandbox partially done. |
