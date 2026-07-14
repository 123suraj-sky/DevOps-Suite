# Low-Level Design (LLD) - DevOps Suite

## 1. Overview

Detailed class diagrams, service internals, data flow, and state machines for each microservice. All diagrams use Mermaid syntax.

---

## 2. Auth Service - Detailed Design

### 2.1 Class Diagram

```mermaid
classDiagram
    class AuthController {
        +register(RegisterRequest) ResponseEntity
        +login(LoginRequest) ResponseEntity
        +refreshToken(RefreshRequest) ResponseEntity
        +getCurrentUser() UserResponse
    }

    class AuthService {
        -userRepository UserRepository
        -passwordEncoder PasswordEncoder
        -jwtProvider JwtProvider
        -refreshTokenRepository RefreshTokenRepository
        +register(RegisterRequest) User
        +login(LoginRequest) TokenPair
        +refreshToken(String) TokenPair
        +validateToken(String) Claims
    }

    class JwtProvider {
        -secretKey String
        -expirationMs long
        -refreshExpirationMs long
        +generateAccessToken(User) String
        +generateRefreshToken(User) String
        +validateToken(String) boolean
        +getClaims(String) Claims
    }

    class UserRepository {
        +findByEmail(String) Optional~User~
        +existsByEmail(String) boolean
    }

    class RefreshTokenRepository {
        +findByTokenHash(String) Optional~RefreshToken~
        +revokeAllByUser(UUID) void
    }

    AuthController --> AuthService
    AuthService --> UserRepository
    AuthService --> JwtProvider
    AuthService --> RefreshTokenRepository
    AuthService --> PasswordEncoder
```

### 2.2 Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant AC as AuthController
    participant AS as AuthService
    participant JP as JwtProvider
    participant DB as Database

    C->>AC: POST /auth/login
    AC->>AS: login(request)
    AS->>DB: findByEmail(email)
    DB-->>AS: User (or null)
    alt User not found
        AS-->>AC: throw UnauthorizedException
        AC-->>C: 401 Unauthorized
    else User found
        AS->>AS: passwordEncoder.matches(password, hash)
        alt Password invalid
            AS-->>AC: throw UnauthorizedException
            AC-->>C: 401 Unauthorized
        else Password valid
            AS->>JP: generateAccessToken(user)
            JP-->>AS: access_token
            AS->>JP: generateRefreshToken(user)
            JP-->>AS: refresh_token
            AS->>DB: save refresh token hash
            AS-->>AC: TokenPair
            AC-->>C: 200 with tokens
        end
    end
```

### 2.3 Token Validation Flow

```mermaid
flowchart TD
    A[Request arrives] --> B{Has Authorization header?}
    B -->|No| C[Return 401]
    B -->|Yes| D{Starts with Bearer?}
    D -->|No| C
    D -->|Yes| E[Extract token]
    E --> F[JwtProvider.validateToken]
    F --> G{Token valid?}
    G -->|No| C
    G -->|Yes| H[Extract user claims]
    H --> I[Set SecurityContext]
    I --> J[Forward to controller]
```

---

## 3. Project Management Service - Detailed Design

### 3.1 Class Diagram

```mermaid
classDiagram
    class ProjectController {
        +createProject(CreateProjectRequest) ResponseEntity
        +listProjects(int, int) Page
        +getProject(UUID) ProjectResponse
        +updateProject(UUID, UpdateProjectRequest) ResponseEntity
        +deleteProject(UUID) ResponseEntity
    }

    class BoardController {
        +createBoard(UUID, CreateBoardRequest) ResponseEntity
        +listBoards(UUID) List
        +updateBoard(UUID, UUID, UpdateBoardRequest) ResponseEntity
        +deleteBoard(UUID, UUID) ResponseEntity
    }

    class TaskController {
        +createTask(UUID, CreateTaskRequest) ResponseEntity
        +moveTask(UUID, UUID, UUID) ResponseEntity
        +updateTask(UUID, UUID, UpdateTaskRequest) ResponseEntity
    }

    class ProjectService {
        -projectRepository ProjectRepository
        -projectMemberRepository ProjectMemberRepository
        +createProject(User, CreateProjectRequest) Project
        +addMember(UUID, UUID, String) ProjectMember
        +checkPermission(UUID, UUID, String) boolean
    }

    class BoardService {
        -boardRepository BoardRepository
        -columnRepository ColumnRepository
        +createBoard(UUID, CreateBoardRequest) Board
        +createDefaultColumns(Board) List
    }

    class TaskService {
        -taskRepository TaskRepository
        +createTask(UUID, CreateTaskRequest) Task
        +moveTask(UUID, UUID, int) Task
        +reorderTasks(UUID, List) void
    }

    ProjectController --> ProjectService
    BoardController --> BoardService
    TaskController --> TaskService
    ProjectService --> ProjectRepository
    ProjectService --> ProjectMemberRepository
    BoardService --> BoardRepository
    BoardService --> ColumnRepository
    TaskService --> TaskRepository
```

### 3.2 Task State Machine

```mermaid
stateDiagram-v2
    [*] --> TODO : Created
    TODO --> IN_PROGRESS : Start work
    IN_PROGRESS --> DONE : Complete
    IN_PROGRESS --> TODO : Reopen
    DONE --> IN_PROGRESS : Revert
    DONE --> [*] : Archive
```

### 3.3 Project Membership Flow

```mermaid
flowchart TD
    A[Owner creates project] --> B[Owner can add members]
    B --> C{Select role}
    C -->|ADMIN| D[Admin: manage board, add/remove members]
    C -->|MEMBER| E[Member: create/edit tasks]
    C -->|VIEWER| F[Viewer: read-only access]
    D --> G[Admin can promote to OWNER]
    E --> H[Member can be demoted to VIEWER]
```

---

## 4. Code Execution Service - Detailed Design

### 4.1 Class Diagram

```mermaid
classDiagram
    class ExecutionController {
        +executeCode(ExecuteRequest) ResponseEntity
        +getResult(UUID) ExecutionResult
        +listSupportedLanguages() List
    }

    class ExecutionService {
        -executionRequestRepository ExecutionRequestRepository
        -executionResultRepository ExecutionResultRepository
        -dockerClient DockerClient
        -languageRepository LanguageRepository
        +submitExecution(ExecuteRequest) UUID
        +getResult(UUID) ExecutionResult
        +processExecution(UUID) void
    }

    class DockerSandbox {
        -dockerClient DockerClient
        +createContainer(Language, String) String
        +runContainer(String, int, int) ExecutionResult
        +cleanupContainer(String) void
    }

    class ExecutionQueue {
        -queue BlockingQueue~UUID~
        +enqueue(UUID) void
        +dequeue() UUID
        +size() int
    }

    ExecutionController --> ExecutionService
    ExecutionService --> ExecutionRequestRepository
    ExecutionService --> ExecutionResultRepository
    ExecutionService --> DockerSandbox
    ExecutionService --> ExecutionQueue
    DockerSandbox --> DockerClient
```

### 4.2 Execution Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant EC as ExecutionController
    participant ES as ExecutionService
    participant EQ as ExecutionQueue
    participant DS as DockerSandbox
    participant DB as Database

    C->>EC: POST /execute
    EC->>ES: submitExecution(request)
    ES->>DB: save request (PENDING)
    ES->>EQ: enqueue(executionId)
    ES-->>EC: 202 Accepted
    EC-->>C: 202 Accepted

    Note over ES,DS: Async worker picks up
    ES->>EQ: dequeue()
    EQ-->>ES: executionId
    ES->>DB: update status (RUNNING)
    ES->>DS: createContainer(language, code)
    DS-->>ES: containerId
    ES->>DS: runContainer(containerId, timeout, memory)
    DS-->>ES: ExecutionResult
    ES->>DS: cleanupContainer(containerId)
    ES->>DB: save result, update status (COMPLETED)

    C->>EC: GET /execute/{execution_id}
    EC->>ES: getResult(id)
    ES->>DB: fetch result
    ES-->>EC: ExecutionResult
    EC-->>C: 200 with result
```

### 4.3 Sandbox Security Model

```mermaid
flowchart TD
    A[Source Code] --> B[Write to temp file]
    B --> C[Create Docker container]
    C --> D{Container limits}
    D --> E[CPU: 1 core]
    D --> F[Memory: 256MB max]
    D --> G[Network: DISABLED]
    D --> H[Read-only root FS]
    D --> I[Timeout: 30s max]
    E --> J[Execute in container]
    F --> J
    G --> J
    H --> J
    I --> J
    J --> K[Capture stdout/stderr]
    K --> L[Destroy container]
    L --> M[Return result]
```

---

## 5. Logging Service - Detailed Design

### 5.1 Class Diagram

```mermaid
classDiagram
    class LogController {
        +queryLogs(String, String, String, String, int, int) Page
        +getLogById(UUID) LogEntry
    }

    class LogService {
        -logEntryRepository LogEntryRepository
        -logProducer LogProducer
        +ingestLog(LogEntry) void
        +queryLogs(LogQuery) Page
    }

    class LogProducer {
        -kafkaTemplate KafkaTemplate
        +sendLog(LogEntry) void
    }

    class LogConsumer {
        -logEntryRepository LogEntryRepository
        +consumeLog(LogEntry) void
    }

    class LogInterceptor {
        +preHandle(HttpRequest, byte[], ClientHttpRequestExecution) ClientHttpResponse
    }

    LogController --> LogService
    LogService --> LogEntryRepository
    LogService --> LogProducer
    LogProducer --> KafkaTemplate
    LogConsumer --> LogEntryRepository
    LogInterceptor --> LogService
```

### 5.2 Log Ingestion Pipeline

```mermaid
flowchart LR
    A[HTTP Request] --> B[LogInterceptor]
    B --> C[Capture: method, path, status, duration, user, IP]
    C --> D[LogService.ingestLog]
    D --> E{Async?}
    E -->|Yes| F[Kafka Topic: logs]
    E -->|No| G[Direct DB write]
    F --> H[LogConsumer]
    H --> I[PostgreSQL]
    G --> I
    I --> J[Elasticsearch sync (batch)]
    J --> K[Kibana Dashboard]
```

---

## 6. Metrics Service - Detailed Design

### 6.1 Class Diagram

```mermaid
classDiagram
    class MetricsController {
        +getServiceMetrics(String, String, String) MetricsResponse
        +getDashboardData() DashboardResponse
    }

    class MetricsService {
        -metricsSnapshotRepository MetricsSnapshotRepository
        -metricsCollector MetricsCollector
        +collectSnapshot(String) MetricsSnapshot
        +queryMetrics(MetricsQuery) List
    }

    class MetricsCollector {
        -restTemplate RestTemplate
        +collectFromService(String) ServiceMetrics
        +collectSystemMetrics() SystemMetrics
    }

    class MetricsScheduler {
        -metricsService MetricsService
        +collectAllServices() void
    }

    MetricsController --> MetricsService
    MetricsService --> MetricsSnapshotRepository
    MetricsService --> MetricsCollector
    MetricsScheduler --> MetricsService
```

### 6.2 Metrics Collection Flow

```mermaid
sequenceDiagram
    participant S as MetricsScheduler
    participant MS as MetricsService
    participant MC as MetricsCollector
    participant DB as Database

    loop Every 60 seconds
        S->>MS: collectAllServices()
        MS->>MC: collectFromService(auth)
        MC->>Auth: GET /actuator/metrics
        Auth-->>MC: metrics data
        MC-->>MS: ServiceMetrics
        MS->>MC: collectFromService(project)
        Project-->>MC: metrics data
        MC-->>MS: ServiceMetrics
        MS->>MC: collectSystemMetrics()
        MC-->>MS: CPU, Memory, Connections
        MS->>DB: save MetricsSnapshot
    end
```

---

## 7. API Gateway - Detailed Design

### 7.1 Routing Configuration

```mermaid
flowchart TD
    GW[API Gateway :8080] -->|/api/v1/auth/**| Auth[Auth Service :8081]
    GW -->|/api/v1/projects/**| Project[Project Service :8082]
    GW -->|/api/v1/boards/**| Project
    GW -->|/api/v1/tasks/**| Project
    GW -->|/api/v1/execute/**| CodeExec[Code Exec :8083]
    GW -->|/api/v1/logs/**| Logs[Logging :8084]
    GW -->|/api/v1/metrics/**| Metrics[Metrics :8085]
    GW -->|/actuator/**| Auth
```

### 7.2 Gateway Filter Chain

```mermaid
flowchart LR
    A[Request] --> B[Rate Limiter]
    B --> C[Authentication Filter]
    C --> D[Request Logging]
    D --> E[Route to Service]
    E --> F[Response Logging]
    F --> G[Response]
```

---

## 8. Error Handling Strategy

- Controller Advice: Global @ControllerAdvice catches all exceptions
- Exception Hierarchy: ApiException base class with code, message, httpStatus
- Validation: @Valid with MethodArgumentNotValidException handler
- Fallback: Circuit breaker returns cached response or error message

```mermaid
classDiagram
    class ApiException {
        +String code
        +String message
        +HttpStatus httpStatus
    }

    class ValidationException {
        +List~FieldError~ errors
    }

    class NotFoundException {
        +String resourceType
        +UUID resourceId
    }

    class UnauthorizedException
    class ForbiddenException

    ApiException <|-- ValidationException
    ApiException <|-- NotFoundException
    ApiException <|-- UnauthorizedException
    ApiException <|-- ForbiddenException
```

---

## 9. Notification Service

### 9.1 Notification Flow

Kafka events trigger notification creation and WebSocket delivery.

- Project Service publishes TaskAssignedEvent to Kafka
- NotificationConsumer receives and delegates to NotificationService
- NotificationService saves to DB and broadcasts via WebSocket
- EmailService sends email asynchronously

### 9.2 Entity Table

- id UUID PK
- user_id UUID FK auth_user
- type VARCHAR NOTIFICATION_TYPE
- title VARCHAR 255
- message TEXT
- is_read BOOLEAN DEFAULT FALSE
- reference_id UUID nullable
- reference_type VARCHAR nullable
- created_at TIMESTAMP DEFAULT NOW

### 9.3 API Endpoints

- GET /api/notifications - List notifications paginated
- GET /api/notifications/unread-count - Get unread count
- PUT /api/notifications/id/read - Mark as read
- PUT /api/notifications/read-all - Mark all as read

### 9.4 Kafka Consumer Groups

- notification-task-consumer: notifications.tasks
- notification-error-consumer: notifications.errors
- notification-threshold-consumer: metrics.thresholds
---

## 10. WebSocket Real-Time Components

### 10.1 WebSocket Configuration

- EnableWebSocketMessageBroker annotation on config class
- SimpleBrokerConfigurer: enable /topic destination prefix
- ApplicationDestinationPrefixes: /app
- StompEndpointRegistry: /ws endpoint with SockJS fallback
- CORS: setAllowedOriginPatterns for all origins

### 10.2 Log Streaming Flow

1. Frontend sends STOMP CONNECT with JWT in query param
2. Gateway verifies JWT and upgrades to WebSocket
3. Logging Service subscribes to Kafka logs topic
4. Each new log event is broadcast to /topic/logs via STOMP
5. Frontend receives and renders in real-time log viewer

### 10.3 Notification Streaming Flow

1. NotificationService saves event to database
2. Broadcasts to /topic/notifications/{userId}
3. Frontend displays toast notification in real-time

### 10.4 Frontend WebSocket Client

- Use @stomp/stompjs Client class
- SockJS factory for browser compatibility
- Connect with JWT authorization header
- Subscribe to /topic/logs for log streaming
- Subscribe to /topic/notifications for alerts
---

## 11. Kafka Event-Driven Pipeline

### 11.1 Topic Design

| Topic | Producer | Consumer | Message Type |
|-------|----------|----------|--------------|
| logs.info | Logging Service | Elasticsearch Sync | LogEntry |
| logs.error | Any Service | Notification Service | LogEntry |
| metrics.snapshots | Metrics Service | Metrics Aggregator | MetricsSnapshot |
| notifications.tasks | Project Service | Notification Service | TaskAssignedEvent |
| notifications.errors | Code Exec Service | Notification Service | ExecutionFailedEvent |
| code.exec.events | Code Exec Service | Logging Service | ExecEvent |

### 11.2 Event Flow

- Producers: Auth, Project, CodeExec, Logging services
- Kafka broker receives and stores events by topic
- Consumers subscribe to relevant topics
- Notification Consumer aggregates and delivers via WebSocket
- Metrics Consumer aggregates for dashboard
- Logging Consumer syncs to Elasticsearch for search

### 11.3 Producer Configuration

- KafkaTemplate for sending messages
- Partition key by userId for ordering
- acks=all for durability
- Retry with backoff on transient failures

### 11.4 Consumer Configuration

- GroupId per service per topic
- Manual acknowledgment for at-least-once delivery
- Dead letter queue for failed messages
- Max poll interval and batch size tuning

---

## 12. Distributed Tracing with Zipkin and Sleuth

### 12.1 Configuration

- spring-sleuth sampler probability: 0.1 (10% sampling)
- spring-zipkin base-url: http://zipkin:9411
- spring-zipkin sender type: web
- Trace IDs propagated in log output for correlation

### 12.2 Trace Propagation

1. Frontend sends request with trace-id header
2. Gateway creates span and forwards to Auth Service
3. Auth Service creates child span and forwards to Project Service
4. Each service sends span data to Zipkin
5. Zipkin correlates all spans and shows full request timeline

### 12.3 Zipkin Dashboard Features

- Service dependency graph
- Trace timeline for each request
- Latency analysis per service hop
- Error rate correlation
---

## 13. Circuit Breaker with Resilience4j

### 13.1 Configuration

- slidingWindowSize: 10 calls
- failureRateThreshold: 50 percent
- waitDurationInOpenState: 10 seconds
- permittedNumberOfCallsInHalfOpenState: 3
- retry maxAttempts: 3 with 500ms waitDuration

### 13.2 Circuit Breaker States

1. Closed: Normal operation, calls pass through
2. Open: Failure rate exceeds threshold, calls are rejected
3. HalfOpen: Wait duration expires, test calls are allowed
   - If test calls succeed: transition to Closed
   - If test calls fail: transition back to Open

### 13.3 Service Mesh Integration

- Gateway: circuit breaker on each service route
- Service-to-service: circuit breaker on Feign/RestTemplate calls
- Fallback methods return cached data or default responses
- Metrics exposed via Actuator for monitoring

---

## 14. Analytics Dashboard Components

### 14.1 Metrics Aggregation

- Request count per service per minute
- Average response time per endpoint
- Error rate per service
- Active user count
- Task completion rate
- Code execution success rate

### 14.2 Health Page

- Service status indicators: green/yellow/red
- Database connection status
- Kafka broker status
- Redis connection status
- Docker daemon status for code execution
- Uptime per service

### 14.3 Dashboard Tech Stack

- Recharts for line and bar charts
- Gauge components for real-time metrics
- WebSocket connection for live updates
- Date range picker for historical analysis

## 10. Logging Service - Detailed Design

### 10.1 Class Diagram

```mermaid
classDiagram
    class LoggingService {
        -LogEntryRepository logEntryRepository
        -ElasticsearchClient elasticsearchClient
        -KafkaConsumerService kafkaConsumer
        -LogEntryMapper logEntryMapper
        +ingestLog(LogEvent event) void
        +searchLogs(LogSearchRequest request) Page LogEntryResponse
        +getLogsByProject(UUID projectId, Pageable page) Page LogEntryResponse
        +getLogsByTask(UUID taskId, Pageable page) Page LogEntryResponse
        +getLogById(UUID id) LogEntryResponse
        +deleteLogsByProject(UUID projectId) void
    }

    class LogEntry {
        -UUID id
        -UUID projectId
        -UUID taskId
        -UUID userId
        -String serviceName
        -String level
        -String message
        -String stackTrace
        -String traceId
        -String spanId
        -Map metadata
        -ZonedDateTime timestamp
    }

    class LogEntryRepository {
        <<interface>>
        +findByProjectIdOrderByTimestampDesc(UUID projectId, Pageable page) Page LogEntry
        +findByTaskIdOrderByTimestampDesc(UUID taskId, Pageable page) Page LogEntry
        +deleteByProjectId(UUID projectId) void
    }

    class ElasticsearchClient {
        <<interface>>
        +indexLog(LogEntry entry) void
        +search(LogSearchRequest request) SearchResults
        +deleteByProjectId(UUID projectId) void
        +createIndex(String indexName) void
    }

    class LogSearchRequest {
        <<record>>
        +UUID projectId
        +UUID taskId
        +String level
        +String query
        +ZonedDateTime startTime
        +ZonedDateTime endTime
        +int page
        +int size
    }

    class LogEntryMapper {
        <<interface>>
        +toResponse(LogEntry entity) LogEntryResponse
        +toEntity(LogEvent event) LogEntry
    }

    class LogEntryResponse {
        <<record>>
        +UUID id
        +UUID projectId
        +UUID taskId
        +UUID userId
        +String serviceName
        +String level
        +String message
        +String stackTrace
        +String traceId
        +Map metadata
        +ZonedDateTime timestamp
    }

    class LogEvent {
        <<record>>
        +UUID projectId
        +UUID taskId
        +UUID userId
        +String serviceName
        +String level
        +String message
        +String stackTrace
        +String traceId
        +String spanId
        +Map metadata
        +ZonedDateTime timestamp
    }

    LoggingService --> LogEntryRepository
    LoggingService --> ElasticsearchClient
    LoggingService --> LogEntryMapper
    LogEntryRepository ..> LogEntry
    ElasticsearchClient ..> LogEntry
    LogEntryMapper ..> LogEntry
    LogEntryMapper ..> LogEntryResponse
```

### 10.2 Dual-Write Strategy

Logs are stored in both PostgreSQL (for structured queries and retention) and Elasticsearch (for full-text search and Kibana dashboards).

```mermaid
sequenceDiagram
    participant K as Kafka
    participant LS as LoggingService
    participant PG as PostgreSQL
    participant ES as Elasticsearch
    K->>LS: @KafkaListener(log-events)
    LS->>LS: LogEntryMapper.toEntity(event)
    par Dual Write
        LS->>PG: Save log entry
        LS->>ES: Index log entry
    end
```

### 10.3 Elasticsearch Index Mapping

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "projectId": { "type": "keyword" },
      "taskId": { "type": "keyword" },
      "userId": { "type": "keyword" },
      "serviceName": { "type": "keyword" },
      "level": { "type": "keyword" },
      "message": { "type": "text", "analyzer": "standard" },
      "stackTrace": { "type": "text" },
      "traceId": { "type": "keyword" },
      "metadata": { "type": "object", "enabled": false },
      "timestamp": { "type": "date" }
    }
  }
}
```
## 11. Metrics Service - Detailed Design

### 11.1 Class Diagram

```mermaid
classDiagram
    class MetricsService {
        -MetricsCollector metricsCollector
        -MetricsRepository metricsRepository
        -MetricsAggregator metricsAggregator
        -AlertRuleRepository alertRuleRepository
        +recordMetric(MetricEvent event) void
        +getDashboardMetrics(UUID projectId, TimeRange range) DashboardResponse
        +getServiceHealth(String serviceName) ServiceHealthResponse
        +getTaskMetrics(UUID projectId) TaskMetricsResponse
        +getUserActivity(UUID userId, TimeRange range) UserActivityResponse
        +createAlertRule(AlertRuleRequest request) AlertRuleResponse
        +evaluateAlertRules() void
    }

    class MetricsCollector {
        -Map activeTimers
        +startTimer(String metricName, Map tags) String timerId
        +stopTimer(String timerId, Map tags) void
        +incrementCounter(String metricName, Map tags) void
        +recordGauge(String metricName, double value, Map tags) void
    }

    class MetricsAggregator {
        -MetricsRepository metricsRepository
        +aggregateByService(String serviceName, TimeRange range) ServiceMetrics
        +aggregateByProject(UUID projectId, TimeRange range) ProjectMetrics
        +aggregateTaskMetrics(UUID projectId) TaskMetricsSummary
        +aggregateUserActivity(UUID userId, TimeRange range) UserActivity
    }

    class MetricsEntry {
        -UUID id
        -String metricName
        -String serviceName
        -String metricType
        -double value
        -Map tags
        -ZonedDateTime timestamp
    }

    class MetricsRepository {
        <<interface>>
        +save(MetricsEntry entry) MetricsEntry
        +findByServiceNameAndTimestampBetween(String serviceName, ZonedDateTime start, ZonedDateTime end) List MetricsEntry
        +findByProjectIdAndTimestampBetween(UUID projectId, ZonedDateTime start, ZonedDateTime end) List MetricsEntry
    }

    class AlertRule {
        -UUID id
        -String metricName
        -String condition
        -double threshold
        -String severity
        -boolean active
        -UUID projectId
    }

    class AlertRuleRepository {
        <<interface>>
        +findAllByActiveTrue() List AlertRule
        +findAllByProjectIdAndActiveTrue(UUID projectId) List AlertRule
    }

    class DashboardResponse {
        <<record>>
        +ServiceHealthSummary health
        +TaskMetricsSummary tasks
        +UserActivitySummary activity
        +List timeSeries
    }

    MetricsService --> MetricsCollector
    MetricsService --> MetricsRepository
    MetricsService --> MetricsAggregator
    MetricsService --> AlertRuleRepository
    MetricsRepository ..> MetricsEntry
    AlertRuleRepository ..> AlertRule
```

### 11.2 Metric Types

| Type | Description | Example |
|---|---|---|
| COUNTER | Monotonically increasing count | api.requests.total |
| GAUGE | Point-in-time value | jvm.memory.used |
| TIMER | Duration measurement | api.request.duration |
| HISTOGRAM | Distribution of values | code.execution.duration |

### 11.3 Alert Conditions

| Condition | Description |
|---|---|
| GREATER_THAN | Trigger when value exceeds threshold |
| LESS_THAN | Trigger when value drops below threshold |
| EQUALS | Trigger when value equals threshold |
| PERCENTAGE_CHANGE | Trigger when change exceeds threshold percentage |
## 12. WebSocket and STOMP Configuration

### 12.1 WebSocket Config Class

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new JwtChannelInterceptor(jwtSecret));
    }
}
```

### 12.2 JWT Channel Interceptor

```java
@Component
public class JwtChannelInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider tokenProvider;

    public JwtChannelInterceptor(JwtTokenProvider tokenProvider) {
        this.tokenProvider = tokenProvider;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor
                .getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = accessor.getFirstNativeHeader("Authorization");
            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7);
                if (tokenProvider.validateToken(token)) {
                    UserDetails userDetails = tokenProvider.getUserDetails(token);
                    UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    accessor.setUser(auth);
                }
            }
        }
        return message;
    }
}
```

### 12.3 Topic Mapping

| Topic | Purpose | Payload |
|---|---|---|
| /topic/logs/{projectId} | Real-time log streaming | LogEntryResponse |
| /topic/notifications/{userId} | User notifications | NotificationResponse |
| /topic/tasks/{projectId} | Task updates | TaskUpdateEvent |
| /topic/execution/{taskId} | Execution status | ExecutionStatusEvent |

### 12.4 Frontend Connection

```javascript
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const client = new Client({
  webSocketFactory: () => new SockJS("/ws"),
  connectHeaders: { Authorization: `Bearer ${token}` },
  onConnect: () => {
    client.subscribe(`/topic/notifications/${userId}`, (msg) => {
      const notification = JSON.parse(msg.body);
      handleNotification(notification);
    });
    client.subscribe(`/topic/logs/${projectId}`, (msg) => {
      const logEntry = JSON.parse(msg.body);
      appendLog(logEntry);
    });
  },
  reconnectDelay: 5000,
});
client.activate();
```

## 13. Kafka Integration Layer

### 13.1 Topic Design

| Topic | Partitions | Replication | Retention | Producers | Consumers |
|---|---|---|---|---|---|
| auth-events | 3 | 1 | 7 days | auth-service | notification-service |
| project-events | 3 | 1 | 7 days | project-service | notification, logging |
| task-events | 5 | 1 | 7 days | project-service | notification, logging |
| log-events | 5 | 1 | 3 days | all services | logging-service |
| notification-events | 3 | 1 | 7 days | project, code-exec | notification-service |
| metric-events | 3 | 1 | 1 day | all services | metrics-service |
| code-execution-events | 3 | 1 | 7 days | code-exec-service | notification, logging |

### 13.2 Kafka Configuration

```yaml
spring:
  kafka:
    bootstrap-servers: kafka:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      acks: all
      retries: 3
    consumer:
      group-id: ${spring.application.name}
      auto-offset-reset: earliest
      enable-auto-commit: false
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "com.devopssuite.*"
    listener:
      ack-mode: manual_immediate
      concurrency: 3
```

### 13.3 Event DTOs

```java
public interface Event {
    String getEventType();
    ZonedDateTime getTimestamp();
}

public record UserRegisteredEvent(
    UUID userId, String email, String username, ZonedDateTime timestamp
) implements Event {
    public String getEventType() { return "USER_REGISTERED"; }
}

public record ProjectCreatedEvent(
    UUID projectId, String projectName, UUID createdBy, ZonedDateTime timestamp
) implements Event {
    public String getEventType() { return "PROJECT_CREATED"; }
}

public record ProjectMemberAddedEvent(
    UUID projectId, UUID userId, String role, UUID addedBy, ZonedDateTime timestamp
) implements Event {
    public String getEventType() { return "PROJECT_MEMBER_ADDED"; }
}

public record TaskCreatedEvent(
    UUID projectId, UUID taskId, String taskTitle, UUID createdBy, ZonedDateTime timestamp
) implements Event {
    public String getEventType() { return "TASK_CREATED"; }
}

public record TaskStatusChangedEvent(
    UUID projectId, UUID taskId, String taskTitle,
    String oldStatus, String newStatus, UUID changedBy, ZonedDateTime timestamp
) implements Event {
    public String getEventType() { return "TASK_STATUS_CHANGED"; }
}

public record CodeExecutionCompletedEvent(
    UUID projectId, UUID taskId, UUID executionId,
    String language, String status, long durationMs, UUID executedBy, ZonedDateTime timestamp
) implements Event {
    public String getEventType() { return "CODE_EXECUTION_COMPLETED"; }
}
```

### 13.4 Kafka Producer Pattern

```java
@Service
@Slf4j
public class KafkaProducerService {

    private final KafkaTemplate<String, Event> kafkaTemplate;

    public KafkaProducerService(KafkaTemplate<String, Event> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @Async
    public CompletableFuture<SendResult<String, Event>> sendEvent(
            String topic, String key, Event event) {
        return kafkaTemplate.send(topic, key, event)
            .completable()
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to send event {} to topic {}",
                        event.getEventType(), topic, ex);
                } else {
                    log.debug("Event {} sent to topic {} partition {} offset {}",
                        event.getEventType(), topic,
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
                }
            });
    }
}
```

### 13.5 Kafka Consumer Pattern

```java
@Service
@Slf4j
public class KafkaConsumerService {

    @KafkaListener(topics = "log-events", groupId = "logging-service")
    public void handleLogEvent(
            ConsumerRecord<String, LogEvent> record,
            Acknowledgment ack) {
        try {
            log.debug("Received log event: {}", record.value());
            loggingService.ingestLog(record.value());
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to process log event from partition {} offset {}",
                record.partition(), record.offset(), e);
        }
    }

    @KafkaListener(topics = "notification-events", groupId = "notification-service")
    public void handleNotificationEvent(
            ConsumerRecord<String, NotificationEvent> record,
            Acknowledgment ack) {
        try {
            notificationService.handleEvent(record.value());
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to process notification event", e);
        }
    }
}
```
