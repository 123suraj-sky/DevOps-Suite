# Deployment Architecture — DevOps Suite

## 1. Overview

DevOps Suite is deployed on a single **Azure Virtual Machine** running **Ubuntu**, with the entire application stack managed by **Docker Compose**. Traffic enters through a **Public IP** protected by an **Azure Network Security Group (NSG)**, hits **Nginx** (which terminates HTTP and proxies to the backend), and all services communicate over an internal Docker bridge network. Deployments are fully automated via **GitHub Actions** — a push to `main` triggers CI, then SSHs into the VM to pull and rebuild.

---

## 2. Infrastructure Topology

```
Internet
    │
    ▼
Azure Public IP  (static, bound to NIC)
    │
    ▼
Azure NSG
  ├── Inbound: TCP 22   (SSH — restricted to known IPs)
  ├── Inbound: TCP 80   (HTTP  → Nginx)
  └── Inbound: TCP 443  (HTTPS → Nginx, if TLS is configured)
    │
    ▼
Azure VM  (Ubuntu LTS)
  └── Docker Engine
        └── Docker Compose stack (single bridge network)
              ├── frontend   (Nginx, port 80)
              ├── backend    (Spring Boot, port 8081)
              ├── postgres   (PostgreSQL 16, port 5432)
              ├── redis      (Redis 7, port 6379)
              ├── elasticsearch  (port 9200)
              ├── kibana         (port 5601)
              ├── logstash       (port 5044)
              ├── prometheus     (port 9090)
              └── grafana        (port 3000)
```

---

## 3. Azure VM

| Property | Value |
|---|---|
| Cloud provider | Microsoft Azure |
| OS | Ubuntu LTS (22.04 or 24.04) |
| Runtime | Docker Engine + Docker Compose v2 |
| App directory | `/home/sky/DevOps-Suite` |
| Access | SSH key authentication only |

The VM hosts the entire stack. No managed database services (e.g., Azure Database for PostgreSQL) are used — PostgreSQL runs as a Docker container with a named volume for persistence.

---

## 4. Network Security Group (NSG)

The NSG is the perimeter firewall. Only the minimum required ports are open to the internet.

| Priority | Direction | Protocol | Port | Source | Purpose |
|---|---|---|---|---|---|
| 100 | Inbound | TCP | 22 | Trusted IPs only | SSH administration |
| 200 | Inbound | TCP | 80 | Any | HTTP (Nginx) |
| 300 | Inbound | TCP | 443 | Any | HTTPS (Nginx + TLS) |
| 65000 | Inbound | Any | Any | VirtualNetwork | Azure internal — default allow |
| 65500 | Inbound | Any | Any | Any | Deny all (default) |

> All internal service ports (8081, 5432, 6379, 9200, 5601, 9090, 3000) are **not** exposed to the internet. They are only accessible within the Docker bridge network or via SSH tunnel.

---

## 5. Docker Compose Stack

All services run inside a single Docker Compose project sharing an internal bridge network (`devopssuite_default`). Inter-service communication uses Docker DNS (container names as hostnames).

### Service Map

| Container | Image / Build | Internal Port | External Port | Notes |
|---|---|---|---|---|
| `devopssuite-frontend` | Build: `./frontend` | 80 | 80 | Nginx; serves React SPA + reverse proxies `/api` and `/ws` |
| `devopssuite-backend` | Build: `./backend` | 8081 | 8081 | Spring Boot monolith |
| `devopssuite-postgres` | `postgres:16-alpine` | 5432 | 5432 | Primary datastore; named volume `postgres_data` |
| `devopssuite-redis` | `redis:7-alpine` | 6379 | 6379 | Cache + rate limiting + JWT blacklist |
| `devopssuite-elasticsearch` | `elasticsearch:8.12.0` | 9200 | 9200 | Log storage; single-node, security disabled |
| `devopssuite-logstash` | `logstash:8.12.0` | 5044 | 5044 | Log ingestion pipeline |
| `devopssuite-kibana` | `kibana:8.12.0` | 5601 | 5601 | Log explorer UI |
| `devopssuite-prometheus` | `prom/prometheus:2.51.0` | 9090 | 9090 | Metrics scraping |
| `devopssuite-grafana` | `grafana/grafana:10.4.0` | 3000 | 3000 | Metrics dashboards |

### Startup Order & Health Checks

```
postgres  (healthcheck: pg_isready)  ─┐
redis     (healthcheck: redis-cli ping) ─┤──► backend ──► frontend
```

`depends_on` with `condition: service_healthy` ensures the backend only starts after both `postgres` and `redis` pass their health checks.

---

## 6. Nginx — Reverse Proxy & Static Serving

Nginx runs inside the `frontend` container and handles two responsibilities:

1. **Static asset serving** — serves the compiled React SPA from `/usr/share/nginx/html`
2. **Reverse proxying** — forwards API and WebSocket traffic to the backend container

```
Browser Request
      │
      ├── /*          → serve React SPA (index.html + assets)
      ├── /api/*      → proxy_pass http://backend:8081
      └── /ws/*       → proxy_pass http://backend:8081 (WebSocket upgrade)
```

This single-origin setup eliminates CORS complexity — the browser sees only one host.

---

## 7. PostgreSQL

- **Image:** `postgres:16-alpine`
- **Database:** `devopssuite` (single DB, multiple schemas per module)
- **Credentials:** sourced from `.env` via `${DB_PASSWORD}`
- **Persistence:** named Docker volume `postgres_data` — data survives container restarts and rebuilds
- **Migrations:** managed by **Flyway** at backend startup; all schema changes are version-controlled SQL scripts
- **Internal hostname:** `postgres` (used by the backend's JDBC URL: `jdbc:postgresql://postgres:5432/devopssuite`)

---

## 8. Docker — Build Strategy

Both the backend and frontend use **multi-stage Docker builds** to produce lean production images.

### Backend (`./backend/Dockerfile`)

```
Stage 1 — Builder (maven:3.9-eclipse-temurin-21)
  ├── COPY pom.xml → RUN mvn dependency:go-offline   [cached layer]
  ├── COPY src/    → RUN mvn package -DskipTests
  └── Output: target/backend-1.0.0-SNAPSHOT.jar

Stage 2 — Runtime (eclipse-temurin:21-jre-alpine)
  ├── Non-root user (appuser / appgroup)
  ├── COPY --from=builder app.jar
  └── ENTRYPOINT java -jar app.jar
```

The dependency download step is a separate layer. It is only re-run when `pom.xml` changes, making incremental source-only rebuilds fast.

### Frontend (`./frontend/Dockerfile`)

```
Stage 1 — Builder (node:24-alpine)
  ├── COPY package.json / package-lock.json → npm ci   [cached layer]
  ├── COPY src/ → npm run build
  └── Output: /app/dist

Stage 2 — Runtime (nginx:alpine)
  ├── COPY --from=builder /app/dist → /usr/share/nginx/html
  ├── COPY nginx.conf → /etc/nginx/conf.d/default.conf
  └── CMD nginx -g 'daemon off;'
```

---

## 9. GitHub Actions — CI/CD Pipeline

The pipeline is defined in `.github/workflows/ci.yml` (and mirrored in `deploy.yml`). It runs on every push or pull request to `main`.

### Pipeline Stages

```
Push to main / PR
      │
      ├── Job 1: build-backend (ubuntu-latest)
      │     ├── Checkout
      │     ├── Setup JDK 21 (Temurin, Maven cache)
      │     └── mvn clean test
      │
      ├── Job 2: build-frontend (ubuntu-latest, parallel with Job 1)
      │     ├── Checkout
      │     ├── Setup Node.js 24 (npm cache)
      │     ├── npm ci
      │     └── npm run build
      │
      └── Job 3: deploy  (runs only on push to main, needs Jobs 1 & 2)
            └── SSH into Azure VM (appleboy/ssh-action)
                  ├── cd /home/sky/DevOps-Suite
                  ├── git pull origin main
                  ├── docker compose build frontend backend
                  ├── docker compose up -d --remove-orphans
                  └── docker image prune -f
```

### Deployment Trigger Conditions

| Event | Build runs | Deploy runs |
|---|---|---|
| Push to `main` | ✅ | ✅ (after build passes) |
| Pull request to `main` | ✅ | ❌ |
| `workflow_dispatch` (manual) | ✅ | ✅ |

### Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `AZURE_VM_IP` | Public IP of the Azure VM |
| `AZURE_VM_USER` | SSH username (e.g., `sky`) |
| `AZURE_VM_SSH_KEY` | Private SSH key for VM access |

The `.env` file (with all runtime secrets) is **not** managed by GitHub Actions — it must be present on the VM at `/home/sky/DevOps-Suite/.env` before the first deploy.

---

## 10. Deployment Process (Step by Step)

### First-Time VM Setup

```bash
# 1. Install Docker Engine and Docker Compose v2
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER && newgrp docker

# 2. Clone the repository
git clone https://github.com/<org>/DevOps-Suite.git ~/DevOps-Suite
cd ~/DevOps-Suite

# 3. Create the .env file from the template
cp .env.example .env
# Edit .env — set DB_PASSWORD, JWT_SECRET, GOOGLE_CLIENT_* etc.
nano .env

# 4. First start — build all images and bring the stack up
docker compose up -d --build

# 5. Verify all containers are healthy
docker compose ps
```

### Routine Deployment (Automated via GitHub Actions)

Every push to `main` triggers the pipeline automatically:

1. GitHub Actions runner builds and tests both services
2. On success, the runner SSHs into the Azure VM
3. `git pull` fetches the latest code
4. `docker compose build frontend backend` rebuilds only the changed images
5. `docker compose up -d --remove-orphans` rolls the updated containers forward
6. `docker image prune -f` removes dangling images to free disk space

### Manual Re-deploy (from VM)

```bash
cd ~/DevOps-Suite
git pull origin main
docker compose build frontend backend
docker compose up -d --remove-orphans
docker image prune -f
```

### Rolling Back

```bash
# Identify the previous commit
git log --oneline -5

# Reset to previous commit
git checkout <commit-hash>
docker compose build frontend backend
docker compose up -d --remove-orphans
```

---

## 11. Data Persistence

| Volume | Container | What's stored |
|---|---|---|
| `postgres_data` | postgres | All application data (users, projects, tasks, executions) |
| `redis_data` | redis | Cache entries, rate limit counters, JWT blacklist |
| `prometheus_data` | prometheus | Scraped metrics time series |
| `grafana_data` | grafana | Dashboard configs, user settings |
| `elasticsearch_data` | elasticsearch | Indexed application logs |

> `docker compose down` stops containers but **preserves volumes**.
> `docker compose down -v` destroys volumes — use only for a clean-slate reset.

---

## 12. Observability Stack

| Tool | URL (internal) | Purpose |
|---|---|---|
| Prometheus | `http://localhost:9090` | Scrapes `/actuator/prometheus` every 15s |
| Grafana | `http://localhost:3000` | Dashboards over Prometheus data |
| Elasticsearch | `http://localhost:9200` | Stores structured application logs |
| Logstash | `http://localhost:5044` | Ingests and transforms log events |
| Kibana | `http://localhost:5601` | Log search and visualization |

Prometheus is configured via `config/prometheus/prometheus.yml` and uses `host.docker.internal` to scrape the backend when needed.

---

## 13. Security Considerations

| Area | Approach |
|---|---|
| Network perimeter | Azure NSG restricts inbound to ports 22, 80, 443 only |
| SSH access | Key-based authentication; no password login |
| Internal services | Not exposed to internet (Grafana, Kibana, Postgres etc. are LAN-only) |
| Secrets management | All secrets in `.env` on the VM; never committed to git |
| Backend container | Runs as non-root (`appuser`) inside the container |
| Code execution sandbox | Docker containers with `--no-network`, read-only FS, 256MB RAM cap, 1 CPU, 30s timeout |
| JWT tokens | Access tokens expire in 1h; revoked tokens stored in Redis blacklist |
| Passwords | BCrypt-hashed (cost 12); never logged or stored in plaintext |
