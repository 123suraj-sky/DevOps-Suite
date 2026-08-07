# DevOps Suite

A full-stack developer productivity platform built with a monolithic Spring Boot backend (running on port `8081`), a React frontend, and an observability stack.

---

## 🧰 Prerequisites

Make sure the following are installed:

| Tool | Purpose |
|---|---|
| **Docker Desktop** | Runs PostgreSQL, Redis, Elasticsearch, Prometheus, etc. |
| **Java 21 (JDK)** | Compiles and runs the Spring Boot application |
| **Maven 3.9+** | Builds the backend |
| **Node.js 20+** | Runs the React frontend |

---

## 🚀 Running the Project

### Step 1 — Configure Environment
```bash
cp .env.example .env
```
Edit `.env` and set your values (defaults work out-of-the-box for local dev).

### Step 2 — Start Infrastructure + Backend (Docker)
The backend compiles and runs **inside Docker**. Start everything with:
```bash
docker-compose up -d postgres redis backend
```
This will:
1. Start PostgreSQL and Redis, wait for their health checks
2. Compile the Spring Boot app inside a Maven container
3. Run the resulting jar in a slim JRE container on port `8081`

> **First build takes ~2-3 min** (Maven downloads dependencies). Subsequent builds are fast due to layer caching.

**After code changes**, rebuild the backend:
```bash
docker-compose up -d --build backend
```

**Full observability stack** (Grafana, Kibana, Prometheus, Elasticsearch — optional):
```bash
docker-compose up -d
```

### Step 3 — Run Frontend (local)
The frontend still runs locally on your machine:
```bash
cd frontend
npm install
npm run dev
```
The frontend starts on `http://localhost:5173` and talks to the backend at `http://localhost:8081`.

---

## 🌐 Service URLs

| Service | URL |
|---|---|
| **Frontend** | http://localhost:5173 |
| **Monolith Backend API** | http://localhost:8081 |
| **Grafana** | http://localhost:3000 |
| **Kibana** | http://localhost:5601 |
| **Prometheus** | http://localhost:9090 |

---

## 🔄 Daily Workflow
```bash
# 1. Start infra + backend (compiles inside Docker)
docker-compose up -d postgres redis backend

# 2. After backend code changes — rebuild
docker-compose up -d --build backend

# 3. Run frontend locally
cd frontend && npm run dev
```

---

## 🛑 Stopping Everything
```bash
docker-compose down          # Stop all containers
docker-compose down -v       # Stop + wipe volumes (fresh start)
```
