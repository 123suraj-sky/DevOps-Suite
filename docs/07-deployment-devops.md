# Deployment & DevOps - DevOps Suite

## 1. Overview

CI/CD pipeline, container orchestration, infrastructure-as-code, and environment strategy.

---

## 2. CI/CD Pipeline

``` mermaid
flowchart LR
    A[Push to main] --> B[GitHub Actions Trigger]
    B --> C[Build each service]
    C --> D[Run unit tests]
    D --> E[Run integration tests]
    E --> F[Build Docker images]
    F --> G[Push to Registry]
    G --> H[Deploy to Staging]
    H --> I[Run e2e tests]
    I --> J{All pass?}
    J -->|Yes| K[Deploy to Production]
    J -->|No| L[Rollback & Notify]
```

---

## 3. Container Architecture

``` mermaid
flowchart TD
    subgraph Docker Compose
        GW[API Gateway :8080]
        Auth[Auth Service :8081]
        Project[Project Service :8082]
        CodeExec[Code Exec :8083]
        Logging[Logging :8084]
        Metrics[Metrics :8085]
        DB1[(Auth DB :5432)]
        DB2[(Project DB :5433)]
        DB3[(CodeExec DB :5434)]
        DB4[(Logs DB :5435)]
        DB5[(Metrics DB :5436)]
        Kafka[Kafka :9092]
        Redis[Redis :6379]
    end
    GW --> Auth
    GW --> Project
    GW --> CodeExec
    GW --> Logging
    GW --> Metrics
    Auth --> DB1
    Auth --> Redis
    Project --> DB2
    CodeExec --> DB3
    Logging --> DB4
    Logging --> Kafka
    Metrics --> DB5
```

---

## 4. Environment Strategy

| Environment | Purpose | Config |
|-------------|---------|--------|
| Development | Local dev | Docker Compose, hot-reload |
| Testing | CI | Ephemeral Compose, fresh DB |
| Staging | Pre-prod | Mirrors production |
| Production | Live | Kubernetes, auto-scaling |

---

## 5. Kubernetes Architecture

``` mermaid
flowchart TD
    subgraph K8s Cluster
        subgraph Ingress
            LB[Load Balancer] --> GW[Gateway Pod]
        end
        subgraph Services
            GW --> Auth
            GW --> Project
            GW --> CodeExec
            GW --> Logging
            GW --> Metrics
        end
        subgraph Data
            Auth --> AuthDB[(PostgreSQL)]
            Project --> ProjectDB[(PostgreSQL)]
            Logging --> Kafka[(Kafka)]
        end
        subgraph Monitoring
            Prometheus
            Grafana
        end
    end
```

---

## 6. Blue-Green Deployment

``` mermaid
flowchart TD
    A[Blue v1.0 active] --> B[Deploy Green v1.1]
    B --> C[Smoke tests on Green]
    C --> D{Pass?}
    D -->|Yes| E[Switch LB to Green]
    D -->|No| F[Keep Blue]
    E --> G[Monitor 15 min]
    G --> H{Healthy?}
    H -->|Yes| I[Destroy Blue]
    H -->|No| J[Rollback to Blue]
```

---

## 7. Database Migrations in CI/CD

1. Migration SQL files versioned in each service repo
2. CI runs migrations against fresh test DB
3. Staging applies migrations before deploy
4. Production: K8s job before main deploy
5. Each migration has rollback script

---

## 8. Monitoring Infrastructure

- Prometheus scrapes every 15s
- Grafana dashboards per service
- Alertmanager to PagerDuty/Slack
- Logs to Elasticsearch via Filebeat
- Uptime monitoring via health endpoint

---

## 9. Multi-Stage Docker Build Strategy

Each microservice uses a multi-stage Dockerfile to separate build and runtime:

### 9.1 Build Stage

- Base image: maven:3.9-eclipse-temurin-17
- Copy pom.xml first for dependency caching
- Run mvn dependency:go-offline for layer caching
- Copy source and run mvn package -DskipTests

### 9.2 Runtime Stage

- Base image: eclipse-temurin:17-jre-alpine
- Copy only the JAR from build stage
- Expose service port
- Set ENTRYPOINT to java -jar app.jar

### 9.3 Benefits

- Final image: ~150MB vs ~500MB with full Maven
- Faster pull times and lower storage costs
- Reduced attack surface (no compiler in production)
- Better layer caching for faster rebuilds

### 9.4 Dockerfile Template

Stage 1: FROM maven:3.9-eclipse-temurin-17 AS build
  WORKDIR /app
  COPY pom.xml .
  RUN mvn dependency:go-offline -B
  COPY src ./src
  RUN mvn package -DskipTests

Stage 2: FROM eclipse-temurin:17-jre-alpine
  WORKDIR /app
  COPY --from=build /app/target/*.jar app.jar
  EXPOSE 8080
  ENTRYPOINT [java, -jar, app.jar]

---

## 10. GitHub Actions CI/CD Pipeline Details

### 10.1 Pipeline Stages

1. Checkout: Pull latest code from branch
2. Setup JDK 17: Configure Java environment
3. Cache Maven dependencies: Speed up builds
4. Build and Test: mvn clean test for each service
5. Code Coverage: Check minimum threshold via JaCoCo
6. Build Docker Images: Multi-stage builds per service
7. Push to Registry: Tag with commit SHA and latest
8. Deploy to Staging: Docker Compose or Railway preview
9. Integration Tests: Run against staging environment
10. Deploy to Production: Only on main branch merges

### 10.2 Matrix Build Strategy

- Build all services in parallel using GitHub Actions matrix
- Each service: auth-service, project-service, code-execution-service, logging-service, metrics-service, notification-service, api-gateway
- Shared build steps via reusable workflows

### 10.3 Environment Secrets

- DATABASE_URL: PostgreSQL connection per service
- REDIS_URL: Redis connection
- KAFKA_BROKERS: Kafka bootstrap servers
- JWT_SECRET: Token signing secret
- DOCKER_REGISTRY_TOKEN: Registry authentication
- DEPLOY_SSH_KEY: Server access for deployment

### 10.4 Branch Strategy

- feature/*: Development branches, run tests only
- develop: Integration tests + staging deploy
- main: Full pipeline + production deploy
- Hotfix: Fast-track to production with expedited tests

---

## 11. Deployment Options Comparison

| Option | Best For | Pros | Cons |
|--------|----------|------|------|
| Docker Compose | Local dev, simple staging | Easy setup, fast iteration | Single host, no auto-scaling |
| Railway | Quick staging/prototype | Zero-config, auto-deploy, built-in Postgres | Vendor lock-in, limited control |
| Render | Small production workloads | Easy setup, auto-scaling, managed Postgres | Cold starts, limited regions |
| AWS EC2 | Full control production | Complete infrastructure control | Manual scaling, more ops overhead |
| Kubernetes | Large-scale production | Auto-scaling, rolling updates, service mesh | Complex setup, steep learning curve |

### 11.1 Recommended Progression

1. Development: Docker Compose on local machine
2. Staging: Railway or Render for quick iteration
3. Production (small): Render with managed Postgres
4. Production (scale): Kubernetes on EKS/GKE or EC2 with ECS

### 11.2 Kubernetes Production Setup

- Namespace per environment: dev, staging, production
- Helm charts for each service with configurable values
- Horizontal Pod Autoscaler based on CPU and memory
- Network Policies for service-to-service communication
- Secret Management via Kubernetes Secrets or Vault
- Ingress Controller with TLS termination

---

## 12. Infrastructure as Code

### 12.1 Docker Compose (Local)

- docker-compose.yml for all services
- Health checks for each service
- Volume mounts for development hot-reload
- Network isolation between service groups

### 12.2 Kubernetes Manifests (Production)

- Deployment manifests for each service
- Service and Ingress configurations
- ConfigMaps for non-sensitive configuration
- PersistentVolumeClaims for stateful services
- Resource limits and requests for all pods

### 12.3 Helm Charts

- Umbrella chart for full stack deployment
- Per-service charts with configurable values.yaml
- Environment overlays: dev, staging, production
- Rollback support via helm rollback


## Docker Compose Configuration

Full local development stack saved as docker-compose.yml


## Dockerfile Templates

See project root for actual Dockerfiles per service.
### Spring Boot Dockerfile

FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY gradle/ gradle/
COPY gradlew .
COPY build.gradle settings.gradle .
RUN ./gradlew dependencies --no-daemon
COPY src/ src/
RUN ./gradlew bootJar --no-daemon -x test

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
USER appuser
EXPOSE 8080
ENTRYPOINT java -jar app.jar

### Frontend Dockerfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json .
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

## Nginx Configuration

server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://api-gateway:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws/ {
        proxy_pass http://api-gateway:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_read_timeout 86400;
    }
}
