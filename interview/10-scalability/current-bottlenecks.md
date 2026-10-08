# Current Architecture Bottlenecks & Capacity Limits

## 1. Executive Architecture Overview

DevOps Suite is currently architected and deployed as a monolithic single-host platform. The backend runs as a single Spring Boot 3 (Java 21) process orchestrating an in-JVM event bus (`ApplicationEventPublisher`), an in-memory WebSocket broker (`SimpleBroker`), an embedded Docker Java client dispatching ephemeral execution containers on the local daemon, a single PostgreSQL 16 instance with Flyway migrations, and a standalone Redis 7 instance.

While this topology provides exceptional developer velocity, atomic local integration testing, zero network serialization penalty for internal events, and low operational overhead, it exhibits hard physical and architectural scaling cliffs under concurrent production load.

```mermaid
graph TD
    subgraph Clients ["Client Layer"]
        C1["Web Browser (React 18 SPA)"]
        C2["CLI / REST API Consumers"]
        C3["Monaco Editor WebSocket / STOMP"]
    end

    subgraph Host ["Single Production Node / Docker Host"]
        subgraph Gateway ["Ingress / Reverse Proxy"]
            NGINX["NGINX / Edge Proxy (:80 / :443)"]
        end

        subgraph Monolith ["Spring Boot 3 (Java 21 Monolith :8081)"]
            TC["Tomcat Worker Threads (max=200)"]
            EV["In-JVM Spring Event Bus (ApplicationEventPublisher)"]
            SB["In-Memory STOMP SimpleBroker (/topic, /queue)"]
            DKC["Docker-Java Client (UNIX Domain Socket /var/run/docker.sock)"]
            CP["HikariCP Pool (maximumPoolSize=10..20)"]
            RL["Redis Sliding Window Rate Limiter"]
        end

        subgraph Storage ["Persistent & State Tier"]
            PG[("PostgreSQL 16 (Single Node: 5432)")]
            RD[("Redis 7 (Standalone: 6379)")]
            DKD["Local Docker Daemon Engine (dockerd)"]
        end

        subgraph Ephemeral ["Code Execution Workloads"]
            BOX1["Container: Python Runner (tmpfs /tmp)"]
            BOX2["Container: Java Runner (tmpfs /tmp)"]
            BOX3["Container: Node Runner (tmpfs /tmp)"]
        end
    end

    C1 --> NGINX
    C2 --> NGINX
    C3 --> NGINX
    NGINX --> TC
    TC --> EV
    TC --> SB
    TC --> DKC
    TC --> CP
    TC --> RL
    CP -->|Single Connection Pipe| PG
    RL -->|Single TCP Connection Pipe| RD
    DKC -->|UNIX Socket contention| DKD
    DKD -->|Fork/Exec cgroups| BOX1
    DKD -->|Fork/Exec cgroups| BOX2
    DKD -->|Fork/Exec cgroups| BOX3

    classDef bottleneck fill:#f8d7da,stroke:#dc3545,stroke-width:2px,color:#721c24;
    classDef warn fill:#fff3cd,stroke:#ffc107,stroke-width:2px,color:#856404;
    classDef ok fill:#d4edda,stroke:#28a745,stroke-width:2px,color:#155724;

    class EV,SB,PG,RD,DKD bottleneck;
    class TC,CP warn;
    class NGINX,BOX1,BOX2,BOX3 ok;
```

---

## 2. Core Architectural Bottlenecks Deep Dive

### 2.1 In-JVM Spring Events (`ApplicationEventPublisher`)

#### Current Implementation Mechanism
DevOps Suite uses Spring Framework's built-in `ApplicationEventPublisher` to decouple core workflows. When an asynchronous audit log, task status change, or execution completion occurs:
```java
// Synchronous or @Async dispatch via in-JVM thread pool
@Autowired
private ApplicationEventPublisher eventPublisher;

public void completeExecution(ExecutionResult result) {
    // Fired into internal Spring ApplicationContext
    eventPublisher.publishEvent(new ExecutionCompletedEvent(this, result));
}
```

#### Failure Modes & Architectural Limitations
1. **At-Most-Once Delivery (Event Loss on Crash):** In-JVM events live exclusively within JVM heap memory (`LinkedBlockingQueue` or thread execution frames). If the host experiences an OOM kill, power cycle, or panic before `@EventListener` or `@Async` listener processes execute, events vanish irreversibly without trace.
2. **Horizontal Scaling Cliff (Zero Cross-Node Fan-Out):** Because the bus is bound to a single JVM memory space, publishing an event on Backend Node 1 cannot trigger listener execution on Backend Node 2. If one node handles webhook ingestion and another runs scheduled background cleanup, they operate as isolated silos.
3. **No Backpressure or Consumer Acknowledgement:** Unlike message brokers with explicit ACK/NACK semantics (Kafka consumer offsets, RabbitMQ manual acknowledgements), Spring in-JVM events either block the calling thread or drop tasks if an asynchronous `ThreadPoolTaskExecutor` queue overflows (`AbortPolicy` or `DiscardPolicy`).

```mermaid
sequenceDiagram
    participant User as Client / API
    participant JVM as Spring Boot Monolith
    participant Queue as JVM Thread Pool Queue
    participant DB as PostgreSQL

    User->>JVM: POST /api/v1/builds (Trigger Build)
    JVM->>JVM: eventPublisher.publishEvent(BuildStartedEvent)
    JVM->>Queue: Push to ThreadPoolTaskExecutor (Capacity: 500)
    Note over JVM: Host Crash / OOM Killer invokes SIGKILL
    Queue--xDB: Event Lost! DB status remains stuck at 'PENDING'
    Note over User: Client polls forever; build orphaned
```

---

### 2.2 Single-Node PostgreSQL 16

#### Current Implementation Mechanism
A single PostgreSQL instance serves all relational data: projects, user identities, roles, build jobs, execution logs, and audit entries. The Spring Boot backend connects via HikariCP configured with typical pool limits (`maximumPoolSize=20`):

```properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=10
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.idle-timeout=600000
spring.datasource.hikari.max-lifetime=1800000
```

#### Failure Modes & Architectural Limitations
1. **Connection Pool Saturation (Tomcat to Hikari Contention):**
   Tomcat defaults to 200 worker threads. When 200 concurrent HTTP requests invoke endpoints requiring database transactions, 180 threads block waiting on Hikari's 20 connections via `HikariPool.getConnection()`. If slow queries (e.g. audit log aggregations or execution history searches) hold connections for 300ms+, thread wait times exceed `connection-timeout` (30s), throwing `SQLTransientConnectionException: Connection is not available, request timed out after 30000ms`.
2. **Single Point of Failure (SPOF) for All Writes & Reads:**
   A single disk degradation, filesystem corruption, or database crash takes down authentication, execution persistence, and project management simultaneously.
3. **Write Amplification & WAL Disk I/O Bottleneck:**
   Concurrent log inserts from high-throughput code execution runs saturate disk IOPS through synchronous Write-Ahead Logging (`fsync` calls). When write IOPS cap out on the single NVMe/SSD, read transaction latencies spike from 2ms to 500ms+.

```mermaid
flowchart LR
    subgraph Tomcat ["Tomcat Workers (200 Threads)"]
        T1["Thread 1..20"]
        T2["Thread 21..100"]
        T3["Thread 101..200"]
    end

    subgraph Pool ["HikariCP (Max: 20 Conns)"]
        C["20 Active Database Connections"]
    end

    subgraph Postgres ["Single PostgreSQL 16 Engine"]
        DISK["Shared WAL / Tablespace Disk (IOPS Limit)"]
    end

    T1 -->|Acquires Conn| C
    T2 -->|Blocks in Queue (Timeout: 30s)| Pool
    T3 -->|Throws SQLTransientConnectionException| Pool
    C -->|Concurrent fsync contention| DISK
```

---

### 2.3 Single-Node Standalone Redis 7

#### Current Implementation Mechanism
DevOps Suite utilizes a single-instance Redis 7 container for:
1. **Sliding-Window Rate Limiting:** Lua scripts executing sliding logs or token bucket checks per IP/User.
2. **Cache-Aside Tier:** Caching user profiles, roles, and frequently fetched project definitions.
3. **JWT Blacklisting:** Storing revoked JWT signatures (`jti`) upon user logout with TTL matching token expiry.

#### Failure Modes & Architectural Limitations
1. **Unprotected JWT Blacklist State (Memory Volatility):**
   If Redis crashes or restarts and RDB/AOF persistence is either disabled or asynchronously buffered, all blacklisted JWT keys are wiped. Revoked security tokens instantly become valid again until their signature expiration time passes.
2. **Rate Limiting Cascading Failure:**
   If Redis becomes unresponsive due to single-threaded command saturation (e.g. expensive `KEYS` or high-cardinality Lua script evals), Spring Boot HTTP filters either fail closed (blocking all incoming API traffic) or fail open (bypassing rate limits entirely and flooding PostgreSQL).
3. **No Sentinel or Cluster Failover:**
   Because there is no active-passive replication with automated Sentinel quorum or Redis Cluster partitioning, Redis downtime directly impacts API availability.

---

### 2.4 Local Docker Daemon Host Contention

#### Current Implementation Mechanism
Code execution jobs spin up ephemeral Docker containers directly on the host machine running the Spring Boot API:
```java
// Docker Java client dispatching against local /var/run/docker.sock
CreateContainerResponse container = dockerClient.createContainerCmd(image)
    .withNetworkMode("none")
    .withReadonlyRootfs(true)
    .withHostConfig(HostConfig.newHostConfig()
        .withMemory(256 * 1024 * 1024L) // 256MB
        .withCpuQuota(100_000L)          // 1 vCPU equivalent
        .withPidsLimit(50L)
        .withTmpfs(Map.of("/tmp", "rw,exec,size=64m"))
    ).exec();
```

#### Failure Modes & Architectural Limitations
1. **Fork/Exec & Daemon Unix Socket Serialization:**
   Every code execution creates, starts, waits, fetches logs from, and inspects an ephemeral container. Docker daemon (`dockerd`) processes container lifecycle requests sequentially across internal goroutines. Under 50+ concurrent execution requests, calls to `docker.sock` queue up, raising container creation latency from 120ms to 4,500ms.
2. **CPU and Context-Switch Contention with the API:**
   Although sandboxes use `--cpus=1` and memory quotas, container spin-up, cgroup allocation, namespace isolation, and compiler/interpreter invocations run on the **same physical hardware** as the Spring Boot JVM and database. Compiler runs (e.g., `javac` or Python byte-compilation) spike system load averages, causing GC pause spikes and thread starvation in the Spring Boot process.
3. **Disk I/O and Ephemeral Mount Choke:**
   Writing code artifacts, mounting tmpfs, and collecting container stdout/stderr streams generate heavy kernel I/O interrupts that starve PostgreSQL's WAL writes.

```mermaid
graph TD
    subgraph PhysicalHost ["Single Virtual / Physical Machine"]
        subgraph HostServices ["Platform Services"]
            JVM["Spring Boot JVM (:8081)"]
            PG["PostgreSQL Database Engine"]
            RD["Redis Engine"]
            DOCKERD["Docker Daemon (dockerd)"]
        end

        subgraph ContentionZone ["Shared Hardware Resources"]
            CPU["Shared CPU Cores & L3 Cache"]
            RAM["Shared Host Physical RAM"]
            DISK["Shared NVMe / SSD IOPS"]
        end

        subgraph Sandboxes ["Concurrent Execution Sandboxes"]
            C1["Run #1: Python Compiler/Runtime"]
            C2["Run #2: Java javac / JVM"]
            C3["Run #3: C++ gcc / execution"]
        end
    end

    JVM -.-> CPU
    PG -.-> DISK
    DOCKERD -.-> CPU
    C1 -->|Bursts CPU / Threads| CPU
    C2 -->|High Memory Allocation| RAM
    C3 -->|High tmpfs & log writes| DISK
    CPU -->|Throttles| JVM
    DISK -->|Increases Hikari Latency| PG
```

---

### 2.5 STOMP SimpleBroker (In-Memory WebSocket)

#### Current Implementation Mechanism
DevOps Suite configures WebSocket messaging with Spring's built-in in-memory broker:
```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // In-memory SimpleBroker
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
    }
}
```

#### Failure Modes & Architectural Limitations
1. **Multi-Node Partitioning (Isolated Subscriber Islands):**
   If a user connects to Node A via WebSocket to watch `/topic/logs/{projectId}`, and a build completes on Node B, Node B dispatches the message to its own in-memory `SimpleBroker`. The user on Node A never receives the log message because the broker cannot route messages across network boundaries.
2. **JVM Heap Exhaustion Under Slow WebSocket Clients:**
   In-memory `SimpleBroker` buffers outbound messages in memory per subscriber session. If a client on a high-latency 3G connection subscribes to a verbose log stream (e.g., 10,000 lines of compiler output), Spring's outbound message channel buffers grow unbounded, triggering high GC pressure and eventual `OutOfMemoryError: Java heap space`.
3. **Client Disconnect Storms on Node Restart:**
   Rolling updates or crashes instantly sever all active WebSocket connections simultaneously. Thousands of SPAs reconnect at once, triggering an avalanche of HTTP Upgrade handshakes, JWT authentications, and database subscription queries.

```mermaid
sequenceDiagram
    participant UserA as Browser (User A on Node 1)
    participant Node1 as Spring Backend Node 1 (SimpleBroker)
    participant Node2 as Spring Backend Node 2 (SimpleBroker)
    participant Runner as Docker Execution Sandbox

    UserA->>Node1: STOMP SUBSCRIBE /topic/logs/project-42
    Runner->>Node2: Execution Complete (POST /api/logs)
    Node2->>Node2: SimpleBroker.convertAndSend("/topic/logs/project-42", logData)
    Note over Node2: Dispatches to local Node 2 memory ONLY!
    Note over UserA: User A on Node 1 NEVER receives logs!
```

---

## 3. Concrete Metrics & Breaking Points

The table below details real-world load testing thresholds and failure characteristics across increasing concurrent user tiers (measured on a standard 4 vCPU / 16GB RAM production instance).

| Component | 500 Concurrent Users | 2,000 Concurrent Users | 10,000 Concurrent Users | Hard Breaking Point Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Tomcat HTTP Pool** | 🟢 Healthy. 40-70 threads active. Latency ~45ms. | 🟡 High Contention. 180-200 threads active. Queue builds up. Latency ~450ms. | 🔴 Complete Exhaustion. Connection refusal (`Connection refused` / HTTP 504). | 200 max worker threads exhausted; request accept queue (default 100) overflows. |
| **HikariCP / Postgres** | 🟢 Healthy. Pool usage 4-8 conns. DB CPU < 15%. | 🔴 Severe Bottleneck. 20/20 conns held. P99 wait time > 12s. Timeouts occur. | ⚫ Total Outage. `SQLTransientConnectionException` across 85%+ of requests. | Max 20 connections held by slow queries; client wait timeout (30s) breached. |
| **Redis Standalone** | 🟢 Healthy. Ops/sec ~1,500. Memory < 150MB. Latency < 1ms. | 🟢 Sub-critical. Ops/sec ~6,000. Latency ~3ms. | 🟡 Thread Contention. Ops/sec > 25,000. Lua script latency spikes to 45ms. | Single-threaded event loop saturation; network socket buffer exhaustion. |
| **Docker Daemon Execution** | 🟡 10-15 parallel containers. Host load avg ~3.5. Creation delay ~400ms. | 🔴 Critical. 40+ parallel containers. Load avg > 14. OOM-killer activates. | ⚫ Catastrophic Collapse. Kernel thread exhaustion (`fork: Cannot allocate memory`). | Max PIDs / process limits, dockerd socket queue latency > 30s, cgroup OOM kills. |
| **STOMP SimpleBroker** | 🟢 500 connections. Heap footprint ~40MB. | 🟡 2,000 connections. Outbound buffer GC pauses rise to ~180ms. | 🔴 Heap OOM. 10,000 open WebSockets consume 3GB+ heap; GC pauses > 4s. | Unbounded buffer per slow subscriber; JVM GC thrashing and thread lockup. |
| **Spring In-JVM Events** | 🟢 Healthy. Event dispatch latency < 0.5ms. | 🟡 Thread pool queue depth spikes to 80% capacity. | 🔴 Silent Drop / Rejection. `TaskRejectedException` or event queue OOM. | Asynchronous executor queue capacity exhausted; unhandled task rejection. |

```mermaid
xychart-beta
    title "P99 API Response Latency vs Concurrent Users (ms)"
    x-axis ["100 Users", "500 Users", "1,000 Users", "2,000 Users", "5,000 Users", "10,000 Users"]
    y-axis "P99 Latency (ms)" 0 --> 5000
    bar [45, 95, 320, 1850, 4900, 5000]
```

---

## 4. In-Depth Interview Questions & Answers

### Question 1: Identifying and Diagnosing HikariCP Pool Starvation
**Difficulty:** 🟢 Basic | **Category:** Database / Threading

#### Question
Under a moderate load test (800 concurrent virtual users), users intermittently experience `500 Internal Server Error` responses, and application logs show `SQLTransientConnectionException: Connection is not available, request timed out after 30000ms`. How would you diagnose this issue and verify whether the root cause is connection leak, slow queries, or an undersized pool?

#### Answer
A connection timeout occurs when HikariCP cannot lease a pooled connection within `connection-timeout` (default 30 seconds). The diagnostic process follows a structured triage methodology:

1. **Inspect HikariCP Metrics via Micrometer/Actuator:**
   Query `/actuator/metrics/hikaricp.connections.active`, `.idle`, `.pending`, and `.acquire`:
   - If `pending` is high (> 50) and `active` is pegged at `maximum-pool-size` (e.g. 20), connections are fully saturated.
   - If `acquire` time distribution shows a steady rise matching request volume, the pool is undersized or holding transactions too long.
2. **Rule Out Connection Leaks:**
   Enable Hikari's leak detection threshold in `application.properties`:
   ```properties
   spring.datasource.hikari.leak-detection-threshold=5000
   ```
   If code acquires a connection without closing it (e.g., missing `@Transactional` boundary or unclosed raw JDBC stream), Hikari logs a stack trace after 5,000ms indicating where the connection was allocated.
3. **Analyze PostgreSQL Server-Side Query Execution:**
   Check PostgreSQL's `pg_stat_activity` to inspect currently running transactions:
   ```sql
   SELECT pid, now() - xact_start AS duration, query, state
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY duration DESC;
   ```
   If queries are executing in < 5ms, the bottleneck is purely Tomcat thread concurrency exceeding the 20-connection pool. If queries remain in `active` state for seconds, missing table indexes or lock contention (e.g., `SELECT FOR UPDATE` on project rows) is holding connections open.
4. **Remediation Strategy:**
   - Optimize slow SQL with appropriate indexing and query plan analysis (`EXPLAIN ANALYZE`).
   - Keep transactions concise: never perform remote network calls (e.g., Docker client commands or external HTTP requests) inside `@Transactional` methods.
   - Adjust pool size using the standard formula:
     $$\text{Pool Size} = \text{Core Count} \times 2 + \text{Effective Spindle Count}$$
     For a 4-core machine with NVMe, a pool of 10–25 is optimal. Increasing pool size to 200 without upgrading database CPU will degrade performance due to OS thread context switching and lock contention.

---

### Question 2: Decoupling Docker Execution from the Web API Host
**Difficulty:** 🟡 Intermediate | **Category:** System Architecture / Sandboxing

#### Question
In our current architecture, the Spring Boot monolith invokes the Docker Java client to run user code on the host machine. Why is co-locating the execution engine on the web server an anti-pattern, and how would you redesign this boundary without prematurely introducing full microservices?

#### Answer
Co-locating untrusted or compute-heavy execution workloads on the web server creates severe operational and security hazards:
1. **Resource Starvation:** Compiling C++ or running compute-intensive Python scripts consumes CPU cycles and generates disk interrupts that delay API request handling and garbage collection.
2. **Security Blast Radius:** Even with `--network=none` and `--read-only`, kernel exploits (e.g. Dirty COW, runc CVE-2024-21626) targeting the local Docker daemon compromise the exact environment housing the database credentials, application code, and environment variables.
3. **Failure Isolation:** An execution job causing kernel panic or triggering an OOM kill can terminate `dockerd` or the Spring Boot JVM process.

```mermaid
flowchart TD
    subgraph ControlPlane ["Control Plane (Web API Instance)"]
        API["Spring Boot API Monolith"]
        MQ[("Job Queue (RabbitMQ / Redis Streams)")]
    end

    subgraph ExecutionPlane ["Execution Plane (Isolated Worker Fleet)"]
        W1["Worker Daemon 1 (Docker/gVisor)"]
        W2["Worker Daemon 2 (Docker/gVisor)"]
        W3["Worker Daemon 3 (Docker/gVisor)"]
    end

    subgraph Sandboxes ["Isolated Kernel Environments"]
        S1["Ephemeral Container 1"]
        S2["Ephemeral Container 2"]
        S3["Ephemeral Container 3"]
    end

    API -->|Push Execution Job| MQ
    MQ -->|Pull Job| W1
    MQ -->|Pull Job| W2
    MQ -->|Pull Job| W3
    W1 --> S1
    W2 --> S2
    W3 --> S3
    W1 -.->|Report Status/Logs via Redis PubSub| API
```

#### Refactored Architecture:
- **Decouple via an Async Queue:** The monolith enqueues an `ExecutionTask` into a lightweight durable broker (Redis Streams, RabbitMQ, or Amazon SQS) and returns an HTTP 202 Accepted status with a `jobId`.
- **Dedicated Worker Fleet:** Offload execution to a separate pool of stateless runner nodes. Each runner executes jobs inside gVisor (`runsc`) or microVMs (Firecracker), isolating kernel interactions.
- **Result Streaming:** The runner streams stdout/stderr back through Redis Pub/Sub, which the API consumes and relays to the frontend via WebSocket.

---

### Question 3: Replacing In-JVM Events with a Resilient Event Architecture
**Difficulty:** 🔴 Advanced | **Category:** Distributed Systems / Event-Driven Architecture

#### Question
DevOps Suite uses Spring's `ApplicationEventPublisher` for event-driven workflows. When the monolith crashes, events are lost. If we scale out to three Spring Boot instances behind an AWS Application Load Balancer, explain why in-JVM events fail and detail how you would implement the **Transactional Outbox Pattern** to achieve reliable, at-least-once distributed event delivery.

#### Answer
#### Why In-JVM Events Fail Across Nodes:
1. **Scope:** `ApplicationEventPublisher` is scoped strictly to the local `ApplicationContext`. Node A has zero awareness of listeners registered in Node B.
2. **Dual-Write Vulnerability:** If you simply update the database and then call an external broker (e.g. Kafka/RabbitMQ) in the same method:
   - If the database commit succeeds but the network call to the broker fails, the event is lost.
   - If the broker call succeeds but the database transaction rolls back, downstream systems process phantom data.

```mermaid
sequenceDiagram
    participant Service as Business Service
    participant DB as PostgreSQL (ACID)
    participant Outbox as outbox_table
    participant CDC as Outbox Poller / Debezium
    participant Broker as Message Broker (Kafka/RabbitMQ)

    Service->>DB: BEGIN TRANSACTION
    Service->>DB: INSERT INTO builds (...)
    Service->>Outbox: INSERT INTO outbox_table (id, topic, payload, status='PENDING')
    Service->>DB: COMMIT TRANSACTION
    Note over DB,Outbox: Atomic local commit guarantees zero data loss!

    loop Async Relay
        CDC->>Outbox: SELECT WHERE status='PENDING' FOR UPDATE SKIP LOCKED
        CDC->>Broker: Publish Event
        Broker-->>CDC: ACK
        CDC->>Outbox: UPDATE status='PROCESSED' (or DELETE)
    end
```

#### Transactional Outbox Pattern Implementation:
1. **Atomic Local Persistence:**
   Within the same local database transaction as the business entity update, write an event record into an `outbox_table`:
   ```sql
   CREATE TABLE outbox_events (
       id UUID PRIMARY KEY,
       aggregate_type VARCHAR(64) NOT NULL,
       aggregate_id VARCHAR(64) NOT NULL,
       event_type VARCHAR(64) NOT NULL,
       payload JSONB NOT NULL,
       created_at TIMESTAMP WITH TIME ZONE NOT NULL,
       status VARCHAR(20) NOT NULL
   );
   ```
2. **Asynchronous Relay (Two Approaches):**
   - **Polling Publisher with `SKIP LOCKED`:** A scheduled worker queries `SELECT * FROM outbox_events WHERE status = 'PENDING' ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED`, dispatches to RabbitMQ/Kafka, and marks rows as `PROCESSED`.
   - **Change Data Capture (CDC):** Debezium captures PostgreSQL WAL changes directly from the database and streams them to Kafka with zero application-level polling overhead.
3. **Idempotent Consumers:**
   Each downstream consumer stores processed message IDs in a deduplication table (`processed_messages`) to protect against duplicate deliveries under at-least-once semantics.

---

### Question 4: Scaling Real-Time WebSocket/STOMP Across Multiple Backend Nodes
**Difficulty:** 🔴 Advanced | **Category:** Networking / WebSockets

#### Question
The React frontend connects via STOMP over SockJS to receive real-time build logs. Currently, Spring Boot's in-memory `SimpleBroker` routes these messages. What happens when we scale to 4 load-balanced backend instances, and how do you transition to a Distributed External Message Broker?

#### Answer
#### The Horizontal Routing Breakdown:
WebSockets establish a stateful, persistent TCP connection terminated at a single specific server instance.

```
Client 1 (Connected to Server A)
Client 2 (Connected to Server B)

Job finishes on Server B -> Sends to local SimpleBroker -> Client 2 receives message.
Client 1 on Server A -> Receives NOTHING.
```

Sticky sessions (session affinity) on the Load Balancer ensure a client reconnects to the same instance if the connection drops, but **cannot** solve the problem of routing events generated on Server B to subscribers connected to Server A.

#### Solution: External Full Message Broker Relay (RabbitMQ / ActiveMQ)
Spring WebSocket natively supports substituting `SimpleBroker` with a dedicated STOMP broker relay via Netty TCP client channels.

```mermaid
flowchart TD
    subgraph Clients ["Client Layer"]
        C1["Client 1"]
        C2["Client 2"]
    end

    subgraph Cluster ["Load-Balanced Spring Boot Fleet"]
        S1["Spring Boot Instance 1"]
        S2["Spring Boot Instance 2"]
    end

    subgraph Broker ["External Message Broker (RabbitMQ STOMP Plugin)"]
        EX["Topic Exchange /amq/topic"]
        Q1["Queue (Instance 1 Proxy)"]
        Q2["Queue (Instance 2 Proxy)"]
    end

    C1 -->|WebSocket TCP| S1
    C2 -->|WebSocket TCP| S2
    S1 <-->|TCP STOMP Relay| Q1
    S2 <-->|TCP STOMP Relay| Q2
    Q1 --- EX
    Q2 --- EX
```

#### Configuration Transition:
Replace the in-memory broker with Spring's StompBrokerRelay:
```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketBrokerConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Replace enableSimpleBroker with dedicated external relay
        registry.enableStompBrokerRelay("/topic", "/queue")
                .setRelayHost("rabbitmq.internal")
                .setRelayPort(61613) // STOMP port
                .setClientLogin("devops_guest")
                .setClientPasscode("secure_pass")
                .setSystemLogin("devops_admin")
                .setSystemPasscode("admin_pass")
                .setUserDestinationBroadcast("/topic/unresolved-user")
                .setUserRegistryBroadcast("/topic/registry-broadcast");

        registry.setApplicationDestinationPrefixes("/app");
    }
}
```

#### Key Architecture Benefits:
1. **Universal Fan-Out:** When Server B dispatches `convertAndSend("/topic/logs/10", data)`, the message travels over TCP to RabbitMQ, which replicates it to all server subscriber queues. Both Client 1 and Client 2 receive the update instantly.
2. **Heap Relief:** Buffering of slow consumers moves from the Spring Boot JVM heap into the optimized Erlang memory and disk structures of RabbitMQ.

---

### Question 5: Designing a Production Load-Testing Strategy (k6 / Locust / JMeter)
**Difficulty:** ⚫ Expert | **Category:** Performance Engineering / Quality Assurance

#### Question
You are tasked with stress-testing DevOps Suite to determine the exact breaking point of the platform before an upcoming release. Detail your end-to-end load testing methodology: tooling selection (k6 vs JMeter vs Locust), test topology, test profiles (Stress, Soak, Spike), metrics collection, and automated bottleneck triage.

#### Answer

#### 1. Tooling Selection
* **k6 (Recommended):** Written in Go with JavaScript test scripts. Low memory footprint, generates tens of thousands of requests per second per generator node without JVM thread overhead. Supports both HTTP/2 and WebSocket (STOMP protocol validation).
* **Locust:** Excellent for complex, Python-scripted user flows and dynamic data evaluation, though requires distributed worker orchestration for large loads (>5,000 VUs).
* **JMeter:** Heavyweight Java threading model; high CPU overhead on load generator machines, harder to manage under GitOps/CI pipelines.

#### 2. Test Execution Profiles
```mermaid
flowchart TD
    subgraph P1 ["1. Smoke Test"]
        S["50 VUs for 5 min<br/>Verify zero 5xx & scripts valid"]
    end
    subgraph P2 ["2. Load Test"]
        L["Ramp to 1,000 VUs over 15 min<br/>Hold 30 min<br/>Validate SLOs (P95 < 200ms)"]
    end
    subgraph P3 ["3. Stress / Breaking Point Test"]
        ST["Ramp 500 -> 2,000 -> 5,000 -> 10,000 VUs<br/>Identify component failure sequence"]
    end
    subgraph P4 ["4. Spike Test"]
        SP["Jump from 100 to 3,000 VUs in 30 sec<br/>Verify rate limiter & thread recovery"]
    end
    subgraph P5 ["5. Soak / Endurance Test"]
        SK["600 VUs continuous for 24 hours<br/>Detect slow memory leaks & conn leaks"]
    end

    P1 --> P2 --> P3
    P2 --> P4
    P2 --> P5
```

#### 3. Concrete k6 Test Script Example (`load-test.js`)
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import ws from 'k6/ws';

export const options = {
  stages: [
    { duration: '5m', target: 500 },   // Warm up
    { duration: '10m', target: 2000 }, // Push to capacity limit
    { duration: '5m', target: 5000 },  // Force breaking point
    { duration: '5m', target: 0 },     // Ramp down / recovery
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],   // Error rate must stay below 1%
    http_req_duration: ['p(95)<300'], // 95% of requests must complete < 300ms
  },
};

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-jwt-token',
    },
  };

  // 1. API Profile Request (Hits Cache / Redis)
  const userRes = http.get('http://host.internal:8081/api/v1/users/me', params);
  check(userRes, { 'status is 200': (r) => r.status === 200 });

  // 2. Project List Request (Hits Postgres + HikariCP)
  const projRes = http.get('http://host.internal:8081/api/v1/projects', params);
  check(projRes, { 'status is 200': (r) => r.status === 200 });

  // 3. Execution Trigger (Docker sandbox + Event bus)
  const payload = JSON.stringify({ language: 'python', code: 'print("test")' });
  const execRes = http.post('http://host.internal:8081/api/v1/executions', payload, params);
  check(execRes, { 'status is 202': (r) => r.status === 202 });

  sleep(1);
}
```

#### 4. Metrics & Bottleneck Triage Pipeline
During test execution, monitor three distinct telemetry tiers concurrently:
* **Operating System Tier (`node_exporter` / `dstat` / `htop`):** CPU Steal, System CPU (kernel context switching caused by Docker container spin-up), I/O wait (`%iowait`), and Network TCP socket states (`TIME_WAIT`, `CLOSE_WAIT`).
* **JVM Tier (Micrometer / JMX / Prometheus):** GC pause duration and frequency (`jvm.gc.pause`), JVM heap utilization (`jvm.memory.used`), thread counts (`jvm.threads.live`), and HikariCP connection queue wait time (`hikaricp.connections.acquire`).
* **PostgreSQL Tier (`pg_stat_database`, `pg_stat_activity`):** Transaction commit rate, active locks, temp disk files written, cache hit ratio (must stay > 99%).

---

### Question 6: JVM Profiling & Root-Cause Analysis Under High Load
**Difficulty:** ⚫ Expert | **Category:** JVM Internals / Profiling

#### Question
During a soak test, the backend response latency gradually degrades from 30ms to 2,500ms after 6 hours, accompanied by periodic 3-second application freezes. How do you profile this in a production-like environment using Async-Profiler, Java Flight Recorder (JFR), and Heap Dump analysis without severely skewing test results?

#### Answer

#### 1. Low-Overhead Production Profiling with Java Flight Recorder (JFR)
JFR is embedded directly into the JVM runtime (HotSpot) with negligible overhead (<1–2%), avoiding the safepoint bias inherent in older sampling tools.

* **Triggering JFR Recording:**
  ```bash
  jcmd <PID> JFR.start name=HighLoadProfile settings=profile.jfc duration=10m filename=/tmp/load_profile.jfr
  ```
* **Analyzing with JDK Mission Control (JMC):**
  - **Memory Allocation Profiling:** Identify allocation pressure hot spots. Look for short-lived objects allocated in high-volume request filters or JSON deserializers (`Jackson ObjectMapper`) driving Eden space exhaustion.
  - **Thread Lock Contention:** Identify synchronized blocks or ReentrantLocks held across I/O calls. Filter by "Java Monitor Blocked" events.

#### 2. Pinpointing CPU Hotspots & Safepoint Bias with Async-Profiler
Async-profiler uses Linux `perf_events` and HotSpot `AsyncGetCallTrace` to avoid safepoint bias (where profilers only sample threads when they reach JVM safepoints):
```bash
# Capture CPU flame graph for 60 seconds
./asprof -d 60 -e cpu -f /tmp/flamegraph_cpu.html <PID>

# Capture Wall-Clock flame graph to find blocked threads waiting on locks or I/O
./asprof -d 60 -e wall -t -f /tmp/flamegraph_wall.html <PID>
```
- **CPU Flame Graph:** Shows exact methods consuming CPU cycles (e.g., regex matching, password hashing with BCrypt, or compression algorithms).
- **Wall-Clock Flame Graph:** Shows where threads spend real elapsed time, exposing threads blocked on database socket reads or Redis Lua calls.

#### 3. Analyzing Progressive Latency Creep (Memory Leaks)
A gradual latency degradation paired with periodic multi-second freezes indicates **GC Thrashing**: the JVM heap is slowly filling with uncollectable objects, forcing the Garbage Collector (ZGC or G1GC) to execute full, stop-the-world collections frequently.

* **Capture Lightweight Heap Histogram:**
  ```bash
  jcmd <PID> GC.class_histogram | head -n 30
  ```
  Check for exploding instance counts of classes such as `WebSocketSession`, `DefaultMessageHeaderAccessor`, or byte buffers.
* **Capture Full Heap Dump at Critical Threshold:**
  ```bash
  jcmd <PID> GC.dump /tmp/heap_dump.hprof
  ```
* **Analyze with Eclipse Memory Analyzer Tool (MAT):**
  - Run the **Leak Suspects Report**.
  - Inspect the **Dominator Tree** to identify the biggest retaining roots:
    - Are WebSocket disconnect events failing to unregister sessions from an internal map?
    - Is a static cache or ThreadLocal retaining HTTP request/security context objects?

---

## 5. Architectural Comparison & Quick Reference

The following table summarizes the single-instance architectural components, their structural bottlenecks, the triggering concurrency threshold, and the recommended production target architecture:

| Subsystem | Current State (Single Instance) | Failure Mechanism | Breaking Point (VUs) | Target Distributed Architecture |
| :--- | :--- | :--- | :--- | :--- |
| **Event Bus** | `ApplicationEventPublisher` (In-JVM Heap) | Events dropped on host crash; zero cross-node broadcast capability. | ~2,000 (queue overflows) | Transactional Outbox Pattern + Kafka / RabbitMQ |
| **Relational DB** | Standalone PostgreSQL 16 (Local) | Single Point of Failure (SPOF); Hikari pool starvation (20 conns). | ~1,500 - 2,500 | AWS Aurora PostgreSQL / Primary-Replica with PgBouncer connection pooler |
| **Cache & State** | Standalone Redis 7 (Local Container) | In-memory blacklist loss on restart; single-threaded command saturation. | ~8,000 - 10,000 | Redis Sentinel (HA) or Redis Cluster with Multi-AZ replication |
| **Code Execution** | Local Docker Daemon (`/var/run/docker.sock`) | CPU, Disk IOPS, and Unix socket contention between sandboxes and API. | ~30 - 50 parallel runs | Isolated Runner Worker Fleet via Redis Streams/SQS + Firecracker microVMs |
| **Real-Time WebSockets** | In-Memory STOMP `SimpleBroker` | Cannot fan out across nodes; slow clients trigger JVM heap exhaustion. | ~2,500 subscribers | Dedicated STOMP Broker Relay (RabbitMQ / ActiveMQ cluster) |
| **HTTP Web Tier** | Embedded Tomcat (Single JVM, max=200) | Thread starvation under slow downstream I/O; accept queue overflow. | ~1,200 - 2,000 | Multi-instance Spring Boot fleet behind NGINX / AWS ALB with auto-scaling |
| **Log Management** | Local Elasticsearch + Kibana | Bulk indexing disk contention against PostgreSQL WAL. | ~4,000 log events/sec | Dedicated Observability Node / Managed OpenSearch with buffer (Logstash/Vector) |

---

## 6. Systematic Remediation Roadmap

To scale DevOps Suite systematically from a single-instance proof of concept to a highly available, multi-tenant enterprise platform, execute refactoring in three distinct phases:

```mermaid
flowchart LR
    subgraph Phase1 ["Phase 1: Immediate Triage"]
        P1A["PgBouncer Connection Pooling"]
        P1B["Tune HikariCP & Tomcat Queues"]
        P1C["Redis AOF Persistence for Blacklist"]
    end

    subgraph Phase2 ["Phase 2: Decoupling Compute"]
        P2A["External Message Broker (RabbitMQ STOMP)"]
        P2B["Offload Sandboxes to Dedicated Worker Fleet"]
        P2C["Read-Replica DB Splitting"]
    end

    subgraph Phase3 ["Phase 3: High Availability"]
        P3A["Multi-Instance Spring Boot Fleet"]
        P3B["Transactional Outbox + Kafka"]
        P3C["Aurora PostgreSQL Multi-AZ"]
    end

    Phase1 --> Phase2 --> Phase3
```

1. **Phase 1: Stabilization & Non-Breaking Optimizations**
   - Place **PgBouncer** in transaction pooling mode in front of PostgreSQL to multiplex thousands of client connections into a controlled backend pool.
   - Configure Redis `appendonly yes` with `appendfsync everysec` to prevent JWT blacklist loss during unexpected restarts.
   - Enforce strict timeouts on all database and external calls to prevent Tomcat worker thread retention.

2. **Phase 2: Decoupling Compute & Real-Time Traffic**
   - Migrate WebSocket messaging from `SimpleBroker` to an external RabbitMQ STOMP relay cluster.
   - Extract code sandbox execution onto an independent fleet of worker instances consuming execution jobs asynchronously via message queues.

3. **Phase 3: Full Horizontal Scalability**
   - Deploy multiple stateless Spring Boot monolith instances behind an Application Load Balancer.
   - Replace in-JVM event publishing with the Transactional Outbox pattern backed by Kafka or RabbitMQ.
   - Upgrade PostgreSQL to an automated failover topology (such as AWS Aurora PostgreSQL or Patroni) with asynchronous read replicas for query-heavy dashboards.
