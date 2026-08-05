# Monitoring and Observability - DevOps Suite

## 1. Overview
Observability is consolidated around the monolithic Spring Boot backend. The stack consists of Prometheus for scraping metrics, Grafana for dashboard visualizations, and Elasticsearch/Kibana for logs ingestion and indexing.

---

## 2. Monitoring Architecture
- **Logs:** Monolith writes structured JSON logs to standard file paths, which are processed and forwarded to Elasticsearch.
- **Metrics:** Monolith exposes a Prometheus-compatible metrics format on `/actuator/prometheus`, which is scraped periodically by Prometheus.

---

## 3. Tracing
OpenTelemetry is used to trace request processing paths within the monolith. This monitors execution times for:
- Database JPA transactions.
- Redis cache lookups.
- Ephemeral Docker execution sandbox creation and runs.

---

## 4. Health Page & Actuators
The monolith exposes a centralized `/actuator/health` endpoint containing individual health status evaluations:
- **PostgreSQL:** Connection pool usage and query latencies.
- **Redis:** Redis cache cluster connectivity status.
- **Docker:** Docker engine daemon availability (used for code sandbox executions).

---

## 5. Alerting & Dashboards
- **Dashboards:** A consolidated Grafana dashboard tracks overall system throughput (RPM), latency (p50/p95/p99), database pool utilization, and rate-limiting blocks.
- **Alert Rules:** High priority notifications are raised if the monolith is unresponsive, PostgreSQL connection pool is saturated, or error counts exceed a critical threshold.
