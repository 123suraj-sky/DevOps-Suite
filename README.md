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
Edit `.env` and set your values (defaults work out-of-the-box).

### Step 2 — Start Infrastructure
Start the middleware (PostgreSQL, Redis):
```bash
docker-compose up -d postgres redis
```
*(Or run `docker-compose up -d` to include Grafana, Elasticsearch, Kibana, Prometheus)*

### Step 3 — Run Backend
```bash
cd backend
mvn clean compile
mvn spring-boot:run
```
The backend starts on `http://localhost:8081`.

### Step 4 — Run Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend starts on `http://localhost:5173`.

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
# 1. Start database and cache
docker-compose up -d postgres redis

# 2. Run backend
cd backend && mvn spring-boot:run

# 3. Run frontend
cd frontend && npm run dev
```

---

## 🛑 Stopping Everything
```bash
docker-compose down
```
To wipe database volumes for a fresh start:
```bash
docker-compose down -v
```
