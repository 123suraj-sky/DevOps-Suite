# DevOps Suite

A full-stack developer productivity platform built with 7 Spring Boot microservices, a React frontend, and a complete observability stack.

---

## 🧰 Prerequisites

Before running the project, make sure the following are installed on your machine:

| Tool | Purpose | Download |
|------|---------|---------|
| **Docker Desktop** | Runs all infrastructure (PostgreSQL, Redis, Kafka, etc.) | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Java 21 (JDK)** | Compiles and runs Spring Boot microservices | [adoptium.net](https://adoptium.net/) |
| **Maven 3.9+** | Builds the backend modules | [maven.apache.org](https://maven.apache.org/) |
| **Node.js 20+** | Runs the React frontend | [nodejs.org](https://nodejs.org/) |

---

## 🐳 Understanding `docker-compose up -d`

> **Short answer:** You do NOT need to use `-d` every time. It is a preference, not a requirement.

### What `-d` does
The `-d` flag stands for **detached mode**. It starts containers in the background so your terminal is freed up.

```bash
# With -d  → runs in background, terminal is free to use
docker-compose up -d

# Without -d → runs in foreground, terminal is blocked, logs stream live
docker-compose up
```

### When you need each mode

| Situation | Command | Reason |
|-----------|---------|--------|
| **First time / daily startup** | `docker-compose up -d` | Starts everything in background so you can use your terminal |
| **Debugging a container** | `docker-compose up` (no -d) | See live logs directly in the terminal |
| **Watching a specific service** | `docker-compose logs -f kafka` | Follow logs of one service after starting with -d |
| **Stopping all containers** | `docker-compose down` | Stops and removes containers (data is preserved in volumes) |

### Does Docker download images every time?
**No.** Docker downloads images **only once** (the first time). After that, it reuses the local cached images. Subsequent starts are instant.

---

## 🚀 Running the Project

### Step 1 — Clone & Configure Environment

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and set your values (defaults work for local dev):
```env
DB_PASSWORD=password
JWT_SECRET=your-super-secret-key-that-is-at-least-256-bits-long
GOOGLE_CLIENT_ID=        # Optional - only needed for Google OAuth
GOOGLE_CLIENT_SECRET=    # Optional - only needed for Google OAuth
```

---

### Step 2 — Start Infrastructure (First Time & Every Time)

Start only the required middleware (PostgreSQL, Redis, Kafka):
```bash
docker-compose up -d postgres redis zookeeper kafka
```

Or start **everything** (includes Grafana, Elasticsearch, Kibana, Prometheus):
```bash
docker-compose up -d
```

**Check that containers are healthy:**
```bash
docker-compose ps
```

---

### Step 3 — Build the Backend

```bash
cd backend
mvn clean compile
```

---

### Step 4 — Run Backend Services

Open **separate terminals** for each service (or use an IDE like IntelliJ to run them):

```bash
# Terminal 1 - Auth Service (port 8081)
cd backend/auth-service
mvn spring-boot:run

# Terminal 2 - API Gateway (port 8080)
cd backend/api-gateway
mvn spring-boot:run
```

---

### Step 5 — Run the Frontend

```bash
cd frontend
npm install       # Only needed the first time
npm run dev       # Starts on http://localhost:5173
```

---

## 🌐 Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | — |
| **API Gateway** | http://localhost:8080 | — |
| **Auth Service** | http://localhost:8081 | — |
| **Grafana** | http://localhost:3000 | admin / admin |
| **Kibana** | http://localhost:5601 | — |
| **Prometheus** | http://localhost:9090 | — |
| **Elasticsearch** | http://localhost:9200 | — |

---

## 🔄 Daily Workflow (After First Setup)

```bash
# 1. Start infrastructure
docker-compose up -d postgres redis zookeeper kafka

# 2. Start backend services (in separate terminals)
cd backend/auth-service && mvn spring-boot:run
cd backend/api-gateway  && mvn spring-boot:run

# 3. Start frontend
cd frontend && npm run dev
```

---

## 🛑 Stopping Everything

```bash
# Stop containers (keeps your data)
docker-compose down

# Stop containers AND delete all data (fresh start)
docker-compose down -v
```

---

## 📚 Documentation

All project documentation is in the [`docs/`](docs/README.md) folder:

- [Requirements](docs/01-requirements.md)
- [Architecture (HLD)](docs/02-architecture-hld.md)
- [Database Design](docs/03-database-design.md)
- [API Design](docs/04-api-design.md)
- [Security Design](docs/06-security-design.md)
- [Project Roadmap](docs/10-project-roadmap.md)
