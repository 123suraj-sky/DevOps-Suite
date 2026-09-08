# DevOps Suite — Deployment Guide

> **Target: Oracle OCI (Oracle Cloud Infrastructure)**
> This document covers everything needed to deploy the two pre-built Docker images
> (backend + frontend) published by the GitHub Actions CI pipeline to GHCR.

---

## How the Images Are Built

The GitHub Actions workflow (`.github/workflows/deploy.yml`) does the following on every push to `master`:

1. **Builds & tests** both backend (Maven/JDK 21) and frontend (Node 24/Vite) in parallel
2. **Publishes immutable images** tagged `sha-<commit>` to GitHub Container Registry (GHCR):
   - `ghcr.io/<owner>/<repo>-backend:sha-<commit>`
   - `ghcr.io/<owner>/<repo>-frontend:sha-<commit>`
3. **Promotes** both to `latest`, `master`, and `release-<commit>` only after both publish jobs succeed (atomic promotion — frontend and backend never point at different releases)
4. **Retains** only the last 3 successful releases in GHCR (older ones are deleted automatically)

---

## What Each Image Contains

### Frontend (`ghcr.io/<owner>/<repo>-frontend:latest`)
- The compiled React 18 / Vite production bundle (built at image-build time)
- Nginx serving static assets on port **80**
- Nginx reverse-proxy rules:
  - `/api/*` → `http://backend:8081/api/`
  - `/ws/*` → `http://backend:8081/ws/` (WebSocket upgrade handled)
- Gzip compression and basic security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`)
- **Needs nothing at runtime** — just expose port 80

### Backend (`ghcr.io/<owner>/<repo>-backend:latest`)
- Spring Boot 3.x fat JAR with all dependencies bundled
- **Flyway migrations V1–V14 are embedded** — schema is created/upgraded automatically on first startup, no manual SQL needed
- Connects to external services at runtime via env vars (see below):
  - PostgreSQL
  - Redis
  - Elasticsearch
  - Docker socket (for sandboxed code execution only)

---

## Self-Contained? Yes — with one note on the sandbox

The backend image does **not** bundle the sandbox runner images (`python:3.12-slim`, `node:20-alpine`, `eclipse-temurin:21-jre-alpine`, C++ image). They are pulled from Docker Hub **at runtime** on first use per language and cached on the host. This means:
- The Docker socket must be mounted for code execution to work
- First run per language will be slow (image pull); subsequent runs use the local cache
- If you don't need code execution, skip the socket mount — everything else works fine

---

## OCI VM Setup

### 1. Provision the VM
- **Shape**: VM.Standard.E2.1.Micro (Always Free) is enough for a demo; VM.Standard3.Flex (1 OCPU / 6 GB) is recommended for real use
- **OS**: Ubuntu 22.04 or Oracle Linux 8
- **Ingress rules** to open in the OCI Security List / Network Security Group:

| Port | Protocol | Purpose |
|------|----------|---------|
| 22   | TCP      | SSH     |
| 80   | TCP      | Frontend (Nginx) |
| 8081 | TCP      | Backend API (optional — only if you need direct access) |
| 3000 | TCP      | Grafana (optional) |
| 9090 | TCP      | Prometheus (optional) |
| 5601 | TCP      | Kibana (optional) |

### 2. Install Docker on the VM
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

### 3. Create the sandbox temp directory
```bash
mkdir -p ~/devopssuite/sandbox-temp
mkdir -p ~/devopssuite/uploads/avatars
```

---

## Environment Variables

Create a `.env` file on the VM (never commit this):

```env
# PostgreSQL
DB_PASSWORD=<strong-random-password>

# JWT — must be ≥ 32 chars (256 bits). Generate with: openssl rand -hex 32
JWT_SECRET=<output-of-openssl-rand-hex-32>

# Google OAuth2 (leave blank to disable)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Grafana
GRAFANA_PASSWORD=<strong-password>

# Elasticsearch
ELASTICSEARCH_HOST=elasticsearch
ELASTICSEARCH_PORT=9200

# Docker sandbox — absolute HOST path to the sandbox-temp directory
# This must be the path as seen by the Docker daemon on the host
DOCKER_HOST_TEMP_DIR=/home/<your-user>/devopssuite/sandbox-temp

# Email (optional — needed only for password reset)
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM=noreply@devopssuite.local
```

---

## Production Docker Compose File

Create `docker-compose.deploy.yml` on the VM. This uses the pre-built GHCR images instead of building from source:

```yaml
services:
  frontend:
    image: ghcr.io/<owner>/<repo>-frontend:latest
    container_name: devopssuite-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    image: ghcr.io/<owner>/<repo>-backend:latest
    container_name: devopssuite-backend
    user: root   # required for Docker socket access (sandbox feature)
    ports:
      - "8081:8081"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/devopssuite
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: 6379
      JWT_SECRET: ${JWT_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
      ELASTICSEARCH_HOST: ${ELASTICSEARCH_HOST}
      ELASTICSEARCH_PORT: ${ELASTICSEARCH_PORT}
      DOCKER_HOST: unix:///var/run/docker.sock
      DOCKER_SANDBOX_TEMP_DIR: /tmp/devopssuite-sandbox
      DOCKER_HOST_TEMP_DIR: ${DOCKER_HOST_TEMP_DIR}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./sandbox-temp:/tmp/devopssuite-sandbox
      - avatar_uploads:/app/uploads/avatars
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    container_name: devopssuite-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: devopssuite
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: devopssuite-redis
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    container_name: devopssuite-elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:v2.51.0
    container_name: devopssuite-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:10.4.0
    container_name: devopssuite-grafana
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-admin}
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped

  kibana:
    image: docker.elastic.co/kibana/kibana:8.12.0
    container_name: devopssuite-kibana
    depends_on:
      - elasticsearch
    ports:
      - "5601:5601"
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  elasticsearch_data:
  prometheus_data:
  grafana_data:
  avatar_uploads:
```

> Replace `<owner>/<repo>` with your actual GitHub username and repository name (lowercase).

---

## Deployment Steps

### First-time deploy
```bash
# 1. SSH into your OCI VM
ssh -i <your-key.pem> ubuntu@<OCI-VM-IP>

# 2. Create working directory
mkdir -p ~/devopssuite && cd ~/devopssuite

# 3. Create sandbox and uploads dirs
mkdir -p sandbox-temp uploads/avatars

# 4. Create the .env file (fill in all values)
nano .env

# 5. Create the docker-compose.deploy.yml (paste the content from above)
nano docker-compose.deploy.yml

# 6. Create the Prometheus config directory
mkdir -p config/prometheus
# Paste the prometheus.yml content (targets backend:8081 via service name — NOT host.docker.internal)
nano config/prometheus/prometheus.yml

# 7. Log in to GHCR (use a GitHub Personal Access Token with read:packages scope)
echo <GITHUB_PAT> | docker login ghcr.io -u <github-username> --password-stdin

# 8. Pull and start everything
docker compose -f docker-compose.deploy.yml --env-file .env pull
docker compose -f docker-compose.deploy.yml --env-file .env up -d

# 9. Check all containers are healthy
docker compose -f docker-compose.deploy.yml ps
docker logs devopssuite-backend --tail 50
```

### Update to a new release
```bash
cd ~/devopssuite
docker compose -f docker-compose.deploy.yml --env-file .env pull
docker compose -f docker-compose.deploy.yml --env-file .env up -d --remove-orphans
```

Only the backend and frontend images change — postgres/redis/elasticsearch containers are untouched.

---

## Known Issues to Fix Before Production

These are not blocking for a demo but should be addressed for real production use:

| # | Issue | Fix |
|---|-------|-----|
| 1 | CORS only allows `localhost:5173` | Add your OCI VM IP or domain to `allowedOriginPatterns` in `SecurityConfig.java` and rebuild |
| 2 | `show-sql: true` in `application.yml` | Set to `false` (or use a `application-prod.yml` profile) |
| 3 | Spring Security + app debug logging on | Set log levels to `INFO` for production |
| 4 | `user: root` on backend container | Needed for Docker socket access; use `docker-socket-proxy` for a proper fix |
| 5 | Prometheus scrapes `host.docker.internal:8081` | Change target to `backend:8081` in `prometheus.yml` when both run in the same compose stack |
| 6 | Grafana password defaults to `admin` | Always set `GRAFANA_PASSWORD` in `.env` |
| 7 | No HTTPS | Put Nginx or Caddy in front as a reverse proxy with a Let's Encrypt cert |

---

## Port Summary

| Service    | URL                          |
|------------|------------------------------|
| Frontend   | http://\<OCI-VM-IP\>         |
| Backend    | http://\<OCI-VM-IP\>:8081    |
| Grafana    | http://\<OCI-VM-IP\>:3000    |
| Kibana     | http://\<OCI-VM-IP\>:5601    |
| Prometheus | http://\<OCI-VM-IP\>:9090    |
