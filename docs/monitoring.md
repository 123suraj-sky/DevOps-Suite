# Monitoring — DevOps Suite

## 1. Overview

DevOps Suite uses **Azure Monitor** as its cloud-level monitoring layer for the Azure VM that hosts the production stack. Azure Monitor collects platform metrics from the VM, surfaces them through **VM Insights**, triggers **Alert Rules** when thresholds are breached, and notifies the team via an **Email Action Group**.

This is separate from the application-level observability stack (Prometheus + Grafana + ELK) that runs inside Docker Compose. The two layers complement each other:

| Layer | Tool | What it watches |
|---|---|---|
| Cloud / Infrastructure | Azure Monitor + VM Insights | VM health, CPU, memory, availability |
| Application | Prometheus + Grafana | Spring Boot metrics, JVM, HTTP throughput |
| Logs | Elasticsearch + Kibana | Structured application log events |

---

## 2. Architecture

```
Azure VM
   │
   ▼
Azure Monitor
   │
   ├── Metrics ──────────────── ✅
   │    └── CPU / Memory data (platform metrics, no agent required)
   │
   ├── VM Insights ──────────── ✅
   │    ├── Availability
   │    ├── CPU utilisation
   │    └── Memory utilisation
   │
   ├── Alert Rules ──────────── ✅
   │    ├── CPU > 80%
   │    └── VM Availability
   │
   └── Action Group ─────────── ✅
        └── Email notification
```

---

## 3. Azure Monitor — Metrics

Azure Monitor automatically collects **platform metrics** from the VM without requiring any additional agent. These are available at 1-minute granularity and retained for 93 days.

Key metrics collected:

| Metric | Namespace | Description |
|---|---|---|
| `Percentage CPU` | `Microsoft.Compute/virtualMachines` | CPU utilisation across all vCPUs |
| `Available Memory Bytes` | `Microsoft.Compute/virtualMachines` | Free memory on the VM |
| `VM Availability Metric` | `Microsoft.Compute/virtualMachines` | 1 = running, 0 = unavailable |
| `Network In / Out` | `Microsoft.Compute/virtualMachines` | Inbound / outbound bytes |
| `Disk Read / Write Bytes` | `Microsoft.Compute/virtualMachines` | I/O throughput |

---

## 4. VM Insights

**VM Insights** is enabled on the Azure VM and provides a pre-built monitoring view directly in the Azure Portal under **Monitor → Virtual Machines**. It surfaces three key dashboards without any manual dashboard configuration:

| Dashboard | What it shows |
|---|---|
| **Availability** | Whether the VM is running and reachable |
| **CPU** | CPU utilisation over time, peak and average |
| **Memory** | Memory utilisation and available bytes over time |

VM Insights uses the Azure Monitor Agent (AMA) to collect OS-level metrics and map them to the pre-built views.

---

## 5. Alert Rules

Two alert rules are configured to detect the most critical infrastructure conditions.

### 5.1 CPU Alert — Percentage CPU > 80%

| Property | Value |
|---|---|
| Signal | `Percentage CPU` |
| Aggregation | Average |
| Threshold | Greater than **80%** |
| Evaluation window | 5 minutes |
| Evaluation frequency | 1 minute |
| Severity | Sev 2 — Warning |
| Action | Email Action Group |

This rule fires when the VM's average CPU utilisation exceeds 80% over a 5-minute window. Sustained high CPU typically indicates the backend is under heavy load from code execution jobs or a traffic spike, and may require scaling investigation.

### 5.2 VM Availability Alert

| Property | Value |
|---|---|
| Signal | `VM Availability Metric` |
| Aggregation | Average |
| Threshold | Less than **1** (i.e., VM is not fully available) |
| Evaluation window | 5 minutes |
| Evaluation frequency | 1 minute |
| Severity | Sev 1 — Critical |
| Action | Email Action Group |

This rule fires when the VM transitions out of the running state (deallocated, stopped, or unresponsive). It is the primary uptime alert — any value below 1 means the entire production stack is down.

---

## 6. Action Group — Email Notification

An **Action Group** is attached to both alert rules. When either rule fires (or resolves), Azure Monitor invokes the action group, which sends an email to the configured recipient(s).

| Property | Value |
|---|---|
| Type | Email / SMS / Push / Voice |
| Channel used | Email |
| Trigger | Alert fired **and** alert resolved |

Both the fired and resolved notifications are sent so the team knows when an incident starts and when it clears without needing to manually check the portal.

---

## 7. Alert Flow

```
VM metric exceeds threshold
         │
         ▼
   Azure Monitor evaluates
   alert rule condition
         │
    ┌────┴────┐
    │  Fired  │
    └────┬────┘
         │
         ▼
   Action Group triggered
         │
         ▼
   Email sent to team
         │
         ▼
   (condition clears)
         │
    ┌────┴──────┐
    │  Resolved │
    └────┬──────┘
         │
         ▼
   Resolution email sent
```

---

## 8. Monitoring Coverage Summary

| Concern | Tool | Alert configured |
|---|---|---|
| VM running / reachable | Azure Monitor — VM Availability | ✅ Sev 1 |
| High CPU | Azure Monitor — Percentage CPU | ✅ Sev 2 (> 80%) |
| Memory pressure | Azure VM Insights | ❌ Dashboard only (no alert yet) |
| HTTP error rate | Prometheus + Grafana | ❌ Dashboard only |
| Application logs | Elasticsearch + Kibana | ❌ Manual search |
| Container health | `docker compose ps` | ❌ Manual check |

> Gaps marked ❌ are candidates for future alert rules (e.g., memory alert, HTTP 5xx rate alert via Prometheus Alertmanager).

---

## 9. Accessing the Dashboards

| Dashboard | How to access |
|---|---|
| Azure Monitor Metrics | Azure Portal → Monitor → Metrics → select VM |
| VM Insights | Azure Portal → Monitor → Virtual Machines → select VM |
| Alert history | Azure Portal → Monitor → Alerts |
| Action Groups | Azure Portal → Monitor → Action Groups |
| Grafana (app metrics) | `http://<VM-IP>:3000` (admin / `${GRAFANA_PASSWORD}`) |
| Kibana (logs) | `http://<VM-IP>:5601` |
| Prometheus (raw) | `http://<VM-IP>:9090` |

> Grafana, Kibana, and Prometheus ports are **not** open in the NSG. Access them via an SSH tunnel:
> ```bash
> ssh -L 3000:localhost:3000 -L 5601:localhost:5601 -L 9090:localhost:9090 <user>@<VM-IP>
> ```
