# WebSocket STOMP Protocol Authentication & Authorization in DevOps Suite

> **Document Version:** 1.0.0  
> **Topic:** Real-Time Architecture, WebSocket Handshake Security, STOMP Frame Interception, Destination Authorization, Redis Blacklist Integration  
> **Target Audience:** Engineering Leads, Distributed Systems Architects, Senior Full-Stack Interviewers  
> **Relevant Codebases:** [`WebSocketConfig.java`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/config/WebSocketConfig.java), [`StompAuthChannelInterceptor.java`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/notification/security/StompAuthChannelInterceptor.java), [`SecurityConfig.java`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/security/SecurityConfig.java), [`JwtUtils.java`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/security/JwtUtils.java), [`NotificationService.java`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/notification/service/NotificationService.java), [`websocketService.js`](file:///d:/Projects/DevOps%20Suite/frontend/src/services/websocketService.js), [`WebSocketContext.jsx`](file:///d:/Projects/DevOps%20Suite/frontend/src/context/WebSocketContext.jsx)

---

## Executive Summary & System Context

DevOps Suite integrates real-time duplex communication to push immediate workspace notifications, stream live Docker execution logs, and synchronize Kanban task boards across collaborative teams. Unlike traditional REST endpoints where each discrete request carries an `Authorization: Bearer <jwt>` HTTP header inspected by standard servlet filters (`JwtRequestFilter`), persistent WebSocket connections establish a single long-lived TCP connection and multiplex bi-directional message frames over STOMP (Simple Text Oriented Messaging Protocol) via SockJS.

Securing this transport requires a bifurcated architecture:
1. **The Transport Layer (HTTP / SockJS Upgrade):** The initial handshake request must traverse standard web servers, proxies, and firewalls. Because the W3C standard browser `WebSocket` constructor does not allow attaching custom HTTP headers, DevOps Suite permits the HTTP upgrade handshake at the servlet level (`permitAll()` on `/ws/**`).
2. **The Protocol Layer (STOMP Application Frames):** Authentication is deferred to the first application-level frame — the STOMP `CONNECT` frame. DevOps Suite implements a custom Spring `ChannelInterceptor` ([`StompAuthChannelInterceptor`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/notification/security/StompAuthChannelInterceptor.java)) plugged directly into the inbound messaging channel (`clientInboundChannel`). It extracts the JWT from the native STOMP header, verifies cryptographic integrity via [`JwtUtils`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/security/JwtUtils.java), verifies blacklist state against Redis 7 (`blacklist:<token>`), and binds an authenticated `Principal` to the long-lived session.
3. **Destination Authorization:** Subsequent STOMP `SUBSCRIBE` commands are guarded to ensure strict isolation across tenant channels (`/topic/notifications/{userId}`, `/topic/logs/{projectId}`, and `/topic/tasks/{projectId}`).

```
+--------------------------------------------------------------------------------------------------------------------+
|                                             DevOps Suite Real-Time Architecture                                   |
|                                                                                                                    |
|   +-------------------+                     +--------------------+                     +-----------------------+   |
|   |  React 18 Client  |                     | Spring Boot Monolith|                    | Infrastructure Stores |   |
|   |  (@stomp/stompjs) |                     |  (Embedded Broker) |                    |  (Redis 7 & Postgres) |   |
|   +---------+---------+                     +----------+---------+                     +-----------+-----------+   |
|             |                                          |                                           |               |
|             | 1. HTTP GET /ws/info                     |                                           |               |
|             +----------------------------------------->| (SecurityConfig: permitAll)               |               |
|             |<-----------------------------------------+                                           |               |
|             | 2. HTTP Upgrade /ws/.../websocket        |                                           |               |
|             +----------------------------------------->| 101 Switching Protocols                   |               |
|             |<-----------------------------------------+ (TCP persistent stream established)       |               |
|             |                                          |                                           |               |
|             | 3. STOMP CONNECT (Auth: Bearer <jwt>)    |                                           |               |
|             +----------------------------------------->|--+ StompAuthChannelInterceptor            |               |
|             |                                          |  |                                        |               |
|             |                                          |  |-- Verify Redis blacklist ------------->| (GET blacklist:token)
|             |                                          |  |<-- OK (Key absent) --------------------+               |
|             |                                          |  |                                        |               |
|             |                                          |  |-- Cryptographic check (JwtUtils)      |               |
|             |                                          |  |-- Attach StompPrincipal(userId)        |               |
|             |                                          |<-+                                        |               |
|             |<-----------------------------------------+                                           |               |
|             | 4. STOMP CONNECTED                       |                                           |               |
|             |                                          |                                           |               |
|             | 5. STOMP SUBSCRIBE /topic/...            |                                           |               |
|             +----------------------------------------->|-- Access Control (User/Project Matching)  |               |
|             |                                          |                                           |               |
|             |<=========================================+ Pushed Event Deliveries                   |               |
|             |    (convertAndSend / convertAndSendToUser)                                           |               |
+-------------+--------------------------------------------------------------------------------------+---------------+
```

---

## Detailed Architectural Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client as React 18 (@stomp/stompjs)
    participant Nginx as Reverse Proxy (:80)
    participant SpringSec as SecurityConfig (Servlet Filter)
    participant SockJS as SockJS / WebSocket Engine
    participant Interceptor as StompAuthChannelInterceptor
    participant Redis as Redis 7 (Cache & Blacklist)
    participant Broker as Spring Simple Message Broker

    Note over Client, SpringSec: Phase 1: HTTP Upgrade Handshake (SockJS Transport)
    Client->>Nginx: GET /ws/info?t=1728000000
    Nginx->>SpringSec: Forward GET /ws/info
    SpringSec->>SockJS: Matches permitAll(/ws/**)
    SockJS-->>Client: 200 OK (websocket: true, origins: [*], entropy)
    
    Client->>Nginx: GET /ws/482/xyz123/websocket (Connection: Upgrade, Upgrade: websocket)
    Nginx->>SpringSec: Forward Upgrade Request
    SpringSec->>SockJS: Permitted under /ws/**
    SockJS-->>Client: HTTP/1.1 101 Switching Protocols (Transport Upgraded to Raw WebSocket)

    Note over Client, Broker: Phase 2: STOMP Protocol Frame Exchange
    Client->>SockJS: STOMP Frame: CONNECT\naccept-version:1.2\nAuthorization:Bearer eyJhbGciOi...
    SockJS->>Interceptor: preSend(Message<CONNECT>, clientInboundChannel)
    
    rect rgb(240, 245, 255)
        Note over Interceptor, Redis: Frame Validation & Security Binding
        Interceptor->>Interceptor: Extract nativeHeader("Authorization") -> Bearer <token>
        Interceptor->>Redis: EXISTS blacklist:<token>
        Redis-->>Interceptor: 0 (Not blacklisted)
        Interceptor->>Interceptor: JwtUtils.validateToken(token) (Signature & Expiration)
        Interceptor->>Interceptor: JwtUtils.getUserIdFromToken(token) -> "usr-9a8b7c"
        Interceptor->>Interceptor: accessor.setUser(new StompPrincipal("usr-9a8b7c"))
    end

    Interceptor->>Broker: Forward sanitized & authenticated CONNECT frame
    Broker-->>Client: STOMP Frame: CONNECTED\nversion:1.2\nheart-beat:4000,4000

    Note over Client, Broker: Phase 3: Destination Subscription & Real-Time Push
    Client->>SockJS: STOMP Frame: SUBSCRIBE\nid:sub-0\ndestination:/topic/notifications/usr-9a8b7c
    SockJS->>Interceptor: preSend(Message<SUBSCRIBE>)
    Interceptor->>Interceptor: Verify Principal ("usr-9a8b7c") == Destination userId ("usr-9a8b7c")
    Interceptor->>Broker: Register client subscription on /topic/notifications/usr-9a8b7c
    
    Note over Broker, Client: Asynchronous Event Dispatch
    Broker-->>Client: STOMP Frame: MESSAGE\ndestination:/topic/notifications/usr-9a8b7c\n{"type":"TASK_ASSIGNED"}
```

---

## Section 1: WebSocket Handshake & STOMP Layer

### 1. The Two-Phase Connection Model
In DevOps Suite, connecting a browser to the server for real-time messaging is not an atomic HTTP request/response cycle. It consists of two fundamentally distinct phases across different OSI abstraction levels:

1. **Phase 1: The Transport Handshake (HTTP / SockJS Upgrade):**
   - The browser initiates standard HTTP traffic via the SockJS fallback layer:
     - `GET /ws/info?t=...` returns server capabilities, transport options (`websocket: true`), and session cookies.
     - `GET /ws/{server-id}/{session-id}/websocket` carries HTTP upgrade headers:
       ```http
       GET /ws/812/abcdef12/websocket HTTP/1.1
       Host: devopssuite.local
       Upgrade: websocket
       Connection: Upgrade
       Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
       Sec-WebSocket-Version: 13
       Origin: http://localhost:5173
       ```
   - If accepted, the server returns status code `101 Switching Protocols`. The underlying TCP socket remains open and switches from half-duplex HTTP request/response parsing to framing raw bidirectional WebSocket messages.

2. **Phase 2: The Messaging Protocol Negotiation (STOMP Framing):**
   - Once the raw WebSocket pipe is established, the client does not send raw unstructured text. It negotiates the STOMP protocol (Simple Text Oriented Messaging Protocol) by transmitting a `CONNECT` frame over the active socket:
     ```stomp
     CONNECT
     accept-version:1.1,1.2
     heart-beat:4000,4000
     Authorization:Bearer eyJhbGciOiJIUzI1NiIsInR5cCI...

     ^@
     ```
   - The Spring application processes this frame through its messaging pipeline. Once verified, the server acknowledges the session with:
     ```stomp
     CONNECTED
     version:1.2
     heart-beat:4000,4000
     user-name:3fa85f64-5717-4562-b3fc-2c963f66afa6

     ^@
     ```

### 2. Why the Native Browser WebSocket API Cannot Send `Authorization: Bearer`
A common question in full-stack architecture interviews is why frontend clients cannot simply add an `Authorization` header during the HTTP Upgrade request.

The standard W3C WebSocket specification intentionally limits the parameters that can be passed to the browser `WebSocket` constructor:
```javascript
// Native browser API signature
const ws = new WebSocket(url, [protocols]);
```
- Browsers do **not** permit arbitrary HTTP headers (such as `Authorization: Bearer <jwt>`) to be attached to the initial WebSocket HTTP upgrade request.
- **Security Justification by W3C / WHATWG:** Allowing web applications running in the browser sandbox to inject arbitrary headers into protocol upgrade handshakes opens severe Cross-Site WebSocket Hijacking (CSWSH) attack vectors, request-splitting exploits, and credential-leaking headers to untrusted third-party hosts.
- **Alternative Approaches & Their Flaws:**
  - *Query Parameter (`ws://.../ws?token=eyJ...`):* Passing tokens in query parameters is a major security vulnerability. Query parameters appear in plain text within reverse-proxy access logs (Nginx, HAProxy), AWS CloudWatch, browser history, and referer headers. Furthermore, query parameters cannot be revoked or mutated dynamically without destroying and re-establishing the underlying socket.
  - *Cookies (`Cookie: access_token=...`):* Browsers do send cookies with WebSocket handshake requests. However, cookies are vulnerable to CSWSH (the WebSocket equivalent of CSRF). Because WebSockets are not restricted by the Same-Origin Policy (SOP) during handshake initiation, any malicious site visited by the user could initiate a connection to `ws://api.devopssuite.com/ws`, and the browser would automatically attach the authenticated session cookie.

### 3. DevOps Suite's Design Decision: `permitAll()` on Handshake, Security at STOMP
DevOps Suite addresses this architectural constraint by divorcing transport-level establishment from application-level authorization:
1. In [`SecurityConfig.java`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/security/SecurityConfig.java#L65-L69), the HTTP endpoint is opened to the public:
   ```java
   // SockJS HTTP handshake requests (/ws/info, /ws/<transport>) must be
   // permitted here — the JWT is sent as a STOMP connect header after the
   // WebSocket upgrade, not as an HTTP Authorization header, so the HTTP
   // security layer cannot validate it during the initial handshake.
   .requestMatchers("/ws/**").permitAll()
   ```
2. The browser successfully completes the HTTP 101 Switching Protocols upgrade without being blocked by Spring Security's servlet `JwtRequestFilter`.
3. The WebSocket pipeline is isolated in an unauthenticated holding state. The message broker rejects or drops any messaging commands until the client issues a valid STOMP `CONNECT` frame carrying credentials.
4. If a malicious client attempts to flood the open `/ws` endpoint with connections, rate limiting and connection pooling limits at Nginx and SockJS prevent exhaustion before authentication occurs.

---

## Section 2: StompAuthChannelInterceptor.java

The core gatekeeper of real-time communication in DevOps Suite is [`StompAuthChannelInterceptor.java`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/notification/security/StompAuthChannelInterceptor.java).

### Implementation Breakdown

```java
package com.devopssuite.notification.security;

import com.devopssuite.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtUtils jwtUtils;
    private final StringRedisTemplate redisTemplate;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
                message, StompHeaderAccessor.class);

        if (accessor == null) {
            return message;
        }

        // Only authenticate the initial CONNECT command
        if (!StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        String token = extractToken(accessor);

        if (token == null) {
            log.warn("STOMP CONNECT rejected: no Authorization header");
            throw new MessagingException("Missing Authorization header on STOMP CONNECT");
        }

        // Check Redis blacklist — identical check to JwtRequestFilter for HTTP
        if (Boolean.TRUE.equals(redisTemplate.hasKey("blacklist:" + token))) {
            log.warn("STOMP CONNECT rejected: token is blacklisted");
            throw new MessagingException("Token has been revoked");
        }

        if (!jwtUtils.validateToken(token)) {
            log.warn("STOMP CONNECT rejected: invalid or expired token");
            throw new MessagingException("Invalid or expired JWT");
        }

        // Extract userId and attach as the STOMP session principal
        String userId = jwtUtils.getUserIdFromToken(token);
        accessor.setUser(new StompPrincipal(userId));
        log.debug("STOMP CONNECT authenticated: userId={}", userId);

        return message;
    }

    private String extractToken(StompHeaderAccessor accessor) {
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders == null || authHeaders.isEmpty()) {
            return null;
        }
        String header = authHeaders.get(0);
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }

    private record StompPrincipal(String name) implements Principal {
        @Override
        public String getName() {
            return name;
        }
    }
}
```

### Registration in `WebSocketConfig.java`

The interceptor is registered directly into Spring's message routing topology:

```java
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthChannelInterceptor stompAuthChannelInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("http://localhost:5173", "http://localhost:*")
                .withSockJS();
    }

    /** Attach the JWT interceptor to the inbound channel (client -> broker). */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthChannelInterceptor);
    }
}
```

### Execution Lifecycle within the Interceptor
1. **Header Extraction:** Spring wraps the raw STOMP frame inside a `Message<?>` object. The `MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class)` extracts STOMP-specific headers.
2. **Command Filtering:** Only frames with `StompCommand.CONNECT` trigger the authentication routine. All other frame types (`SUBSCRIBE`, `SEND`, `UNSUBSCRIBE`, `DISCONNECT`, `HEARTBEAT`) bypass token validation because session identity has already been stamped onto the connection session attributes.
3. **Native Header Retrieval:** In STOMP, standard protocol headers are distinct from application headers. The frontend sends `connectHeaders: { Authorization: "Bearer <token>" }`. The method `accessor.getNativeHeader("Authorization")` retrieves this list of string headers.
4. **Redis Blacklist Lookup:** If a user logs out from the web UI, the backend writes `blacklist:<token>` to Redis with an expiration matching the token's remaining lifespan. The interceptor queries Redis (`redisTemplate.hasKey("blacklist:" + token)`). If found, the connection is instantly rejected.
5. **Cryptographic Validation:** [`JwtUtils.validateToken(token)`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/security/JwtUtils.java#L59-L69) uses the HMAC-SHA256 secret key to verify signature authenticity and check that `exp` is in the future.
6. **Principal Binding:** The user's subject claim (`userId`) is wrapped into an immutable `StompPrincipal` record and registered via `accessor.setUser(...)`. This principal remains associated with the underlying WebSocket session throughout its entire lifetime.
7. **Session Termination on Error:** Throwing a `MessagingException` inside `preSend()` prevents the message from reaching the broker. Spring catches this exception, constructs a STOMP `ERROR` frame back to the client (`message: Invalid or expired JWT`), and immediately closes the underlying TCP socket.

---

## Section 3: Destination & Topic Security

DevOps Suite broadcasts three primary real-time topics:
1. `/topic/notifications/{userId}`: Toast alerts for task assignments, role changes, and execution failures.
2. `/topic/tasks/{projectId}`: Real-time Kanban board state mutations.
3. `/topic/logs/{projectId}`: Live streaming execution stdout/stderr logs from Docker sandboxes.

Without destination authorization, any authenticated user with a valid JWT could subscribe to `/topic/notifications/00000000-0000-0000-0000-000000000001` or `/topic/logs/{competitorProjectId}` and spy on other tenants.

### 1. Pre-Send Subscription Authorization Checks
To prevent eavesdropping, `ChannelInterceptor.preSend` can be expanded to intercept `StompCommand.SUBSCRIBE` frames and enforce fine-grained access control before permitting registration in the broker registry:

```java
@Override
public Message<?> preSend(Message<?> message, MessageChannel channel) {
    StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
            message, StompHeaderAccessor.class);
    if (accessor == null) return message;

    // Handle initial authentication
    if (StompCommand.CONNECT.equals(accessor.getCommand())) {
        return handleConnect(accessor, message);
    }

    // Handle destination subscription authorization
    if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
        return handleSubscribe(accessor, message);
    }

    return message;
}

private Message<?> handleSubscribe(StompHeaderAccessor accessor, Message<?> message) {
    Principal principal = accessor.getUser();
    if (principal == null) {
        log.warn("STOMP SUBSCRIBE rejected: Unauthenticated session");
        throw new AccessDeniedException("User not authenticated");
    }

    String destination = accessor.getDestination();
    if (destination == null) {
        throw new IllegalArgumentException("Missing subscription destination");
    }

    String userId = principal.getName();

    // 1. Personal Notification Channel Isolation
    if (destination.startsWith("/topic/notifications/")) {
        String targetUserId = destination.substring("/topic/notifications/".length());
        if (!userId.equals(targetUserId)) {
            log.warn("Security violation: User {} attempted to subscribe to private notifications of {}", 
                     userId, targetUserId);
            throw new AccessDeniedException("Unauthorized subscription to private notification channel");
        }
    }

    // 2. Project-Scoped Channels (Tasks & Logs)
    if (destination.startsWith("/topic/tasks/") || destination.startsWith("/topic/logs/")) {
        String projectIdStr = destination.substring(destination.lastIndexOf('/') + 1);
        UUID projectId = UUID.fromString(projectIdStr);
        
        // Verify project membership via database or Redis cache
        boolean isMember = projectMemberRepository.existsByProjectIdAndUserId(
                projectId, UUID.fromString(userId));
        
        if (!isMember) {
            log.warn("Security violation: User {} is not a member of project {}", userId, projectId);
            throw new AccessDeniedException("Unauthorized subscription to project channel");
        }
    }

    return message;
}
```

### 2. Spring User Destinations (`/user/queue/...`) vs. Explicit Topic Paths
Spring STOMP provides two architectural patterns for addressing specific clients:

| Feature | Explicit Topics (`/topic/notifications/{userId}`) | User Destinations (`/user/queue/notifications`) |
| :--- | :--- | :--- |
| **Addressing Method** | Server broadcasts to path containing the explicit ID. | Server sends to `/user/{username}/queue/...` via `SimpMessagingTemplate.convertAndSendToUser`. |
| **Subscription Path** | Client subscribes directly to `/topic/notifications/{myUserId}`. | Client subscribes uniformly to `/user/queue/notifications`. |
| **Security Enforcement** | Requires interceptor inspection of destination string during `SUBSCRIBE`. | Spring automatically prepends unique session prefix; users **cannot** subscribe to other users' queues. |
| **Implementation Complexity** | Simple, explicit, transparent debugging in browser network tab. | Requires Spring `UserDestinationResolver` and session mapping internals. |
| **DevOps Suite Usage** | **Primary choice:** Used for clear architectural transparency across frontend context hooks and backend services. | Supported via `StompPrincipal` binding for future zero-knowledge queues. |

---

## Section 4: Comprehensive Interview Q&A

### 🟢 Basic Concepts

#### Q1: Why can't browsers send custom HTTP headers like `Authorization: Bearer <jwt>` during a native WebSocket handshake?
**Difficulty:** 🟢 Basic  
**Focus:** Browser standards, W3C specification, CSWSH risks

**Answer:**
The standard browser `WebSocket` API constructor defined by the W3C specification accepts only two arguments:
```javascript
new WebSocket(url, [protocols]);
```
It deliberately provides no mechanism or options bag to pass custom HTTP headers such as `Authorization: Bearer <token>`.

There are two primary reasons for this limitation:
1. **Browser Security Sandbox & Cross-Origin Requests:** The browser treats WebSocket connections as cross-origin by default. If arbitrary headers could be set by JavaScript on the initial upgrade handshake, malicious scripts running in the user's browser could forge arbitrary headers (e.g., internal proxy headers, custom tracking headers) across origins before the server has even acknowledged or consented to the connection.
2. **Cross-Site WebSocket Hijacking (CSWSH):** The initial handshake relies heavily on the `Origin` header. Because the native API was designed to support ambient credentials (HTTP cookies), allowing custom headers would increase the attack surface for session hijacking across unvetted domains.

**DevOps Suite Solution:**  
DevOps Suite bypasses this browser limitation by performing an unauthenticated HTTP upgrade handshake (`permitAll()` on `/ws/**`), and then sending the JWT inside the STOMP `CONNECT` frame's native headers (`connectHeaders: { Authorization: 'Bearer ...' }`), which is fully supported by the application layer.

---

#### Q2: What is the role of `StompAuthChannelInterceptor` in DevOps Suite?
**Difficulty:** 🟢 Basic  
**Focus:** Spring messaging lifecycle, `ChannelInterceptor`, `preSend`

**Answer:**
[`StompAuthChannelInterceptor`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/notification/security/StompAuthChannelInterceptor.java) acts as the authentication firewall for incoming STOMP messages. 

In Spring's messaging architecture:
1. All client-to-broker frames pass through an execution pipeline named `clientInboundChannel`.
2. By implementing `ChannelInterceptor` and overriding `preSend(Message<?> message, MessageChannel channel)`, the interceptor can inspect, modify, or drop messages before they reach the message broker.
3. When a client sends a STOMP `CONNECT` frame, `StompAuthChannelInterceptor`:
   - Extracts the Bearer token from native headers.
   - Verifies the token against the Redis revocation blacklist.
   - Cryptographically validates the JWT (signature and expiration) using [`JwtUtils`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/security/JwtUtils.java).
   - Generates a `StompPrincipal(userId)` and attaches it to the STOMP session (`accessor.setUser(auth)`).
   - Aborts the connection by throwing a `MessagingException` if validation fails.

---

#### Q3: What is the difference between an HTTP filter (`JwtRequestFilter`) and a STOMP channel interceptor (`StompAuthChannelInterceptor`)?
**Difficulty:** 🟢 Basic  
**Focus:** Servlet container vs. Spring messaging pipeline

**Answer:**

```
+--------------------------------------------------------------------------------------------------+
| Layer 1: Servlet Container (Tomcat / Undertow)                                                   |
| Requests: GET /api/**, POST /api/**, GET /ws/info                                                |
| Security Filter: JwtRequestFilter extends OncePerRequestFilter                                   |
| Inspection: Inspects HttpServletRequest & HttpServletResponse for every HTTP request              |
+--------------------------------------------------------------------------------------------------+
                                                 | (Upgrade: websocket - HTTP 101)
                                                 v
+--------------------------------------------------------------------------------------------------+
| Layer 2: Spring Messaging Subsystem (Spring Integration / MessageBroker)                        |
| Frames: STOMP CONNECT, SUBSCRIBE, SEND, DISCONNECT                                               |
| Security Interceptor: StompAuthChannelInterceptor implements ChannelInterceptor                 |
| Inspection: Inspects Message<?> and StompHeaderAccessor over an open TCP pipe                    |
+--------------------------------------------------------------------------------------------------+
```

| Dimension | `JwtRequestFilter` | `StompAuthChannelInterceptor` |
| :--- | :--- | :--- |
| **Pipeline Level** | Servlet Filter Chain (HTTP layer). | Spring Messaging Channel (`clientInboundChannel`). |
| **Execution Frequency** | Executed once per discrete HTTP request. | Executed per STOMP frame (only `CONNECT` in DevOps Suite). |
| **Protocol Handled** | Standard HTTP/1.1 or HTTP/2. | STOMP frames over raw WebSocket/SockJS streams. |
| **Security Context Target** | Sets `SecurityContextHolder.getContext().setAuthentication(...)`. | Sets `StompHeaderAccessor.setUser(Principal)`. |
| **Failure Response** | `HttpServletResponse.sendError(401, "Unauthorized")`. | Throws `MessagingException`, sending a STOMP `ERROR` frame and terminating TCP. |

---

### 🟡 Intermediate Architecture

#### Q4: Walk through the exact code execution path when a frontend client connects to the WebSocket in DevOps Suite.
**Difficulty:** 🟡 Intermediate  
**Focus:** Frontend `@stomp/stompjs` to backend interceptor flow

**Answer:**

1. **Frontend Initiation:**  
   In [`websocketService.js`](file:///d:/Projects/DevOps%20Suite/frontend/src/services/websocketService.js#L7-L35), `connectWebSocket(token)` initializes the STOMP client:
   ```javascript
   stompClient = new Client({
     webSocketFactory: () => new SockJS(`${WS_URL}`),
     connectHeaders: {
       Authorization: `Bearer ${token}`,
     },
     reconnectDelay: 5000,
     heartbeatIncoming: 4000,
     heartbeatOutgoing: 4000,
   });
   stompClient.activate();
   ```
2. **SockJS Transport Negotiation:**  
   SockJS sends `GET /ws/info`. [`SecurityConfig.java`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/security/SecurityConfig.java#L69) permits this request without authentication. A WebSocket upgrade request follows: `GET /ws/{server-id}/{session-id}/websocket`. Tomcat responds with HTTP `101 Switching Protocols`.
3. **STOMP CONNECT Dispatch:**  
   `@stomp/stompjs` sends the STOMP frame:
   ```stomp
   CONNECT
   accept-version:1.2
   Authorization:Bearer eyJhbGciOiJIUzI1Ni...
   heart-beat:4000,4000
   ```
4. **Channel Interception:**  
   The message arrives at Spring's `clientInboundChannel`. [`StompAuthChannelInterceptor.java`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/notification/security/StompAuthChannelInterceptor.java#L49-L86) intercepts it:
   - Evaluates `accessor.getCommand() == StompCommand.CONNECT`.
   - Invokes `extractToken(accessor)` to strip the `"Bearer "` prefix.
   - Checks Redis: `redisTemplate.hasKey("blacklist:" + token)`.
   - Validates claims via `jwtUtils.validateToken(token)`.
   - Extracts `userId` via `jwtUtils.getUserIdFromToken(token)`.
   - Attaches `new StompPrincipal(userId)` via `accessor.setUser(...)`.
5. **Session Acknowledgment:**  
   Spring's `SimpleBroker` writes back a STOMP `CONNECTED` frame to the client. The frontend's `onConnect` callback fires, updating [`WebSocketContext.jsx`](file:///d:/Projects/DevOps%20Suite/frontend/src/context/WebSocketContext.jsx#L19) state to `connected = true`.

---

#### Q5: How does DevOps Suite handle token revocation when a user logs out while an active WebSocket connection is established?
**Difficulty:** 🟡 Intermediate  
**Focus:** Redis blacklist, session disconnect, logout flow

**Answer:**

**The Problem:**  
When a user logs out, their JWT is written to Redis under `blacklist:<token>` with a TTL equal to the token's remaining validity. However, `StompAuthChannelInterceptor` only inspects the JWT during the initial `CONNECT` frame. If the user leaves their browser tab open, the WebSocket connection remains physically connected and could theoretically continue receiving real-time broadcasts.

**DevOps Suite Multi-Layered Invalidation:**
1. **Frontend Graceful Disconnect:**  
   In [`WebSocketContext.jsx`](file:///d:/Projects/DevOps%20Suite/frontend/src/context/WebSocketContext.jsx#L24-L28), a React `useEffect` hook monitors the `isAuthenticated` flag from `AuthContext`:
   ```javascript
   useEffect(() => {
     if (isAuthenticated && token) {
       const client = connectWebSocket(token, ...);
       return () => {
         disconnectWebSocket();
         setConnected(false);
       };
     }
   }, [isAuthenticated, token]);
   ```
   When the user clicks **Logout**, `AuthContext` clears state, triggering the cleanup function which calls `stompClient.deactivate()`. This transmits a STOMP `DISCONNECT` frame and severs the TCP socket.
2. **Backend Forced Termination (Server-Side Invalidation):**  
   To safeguard against compromised tokens or modified clients that refuse to disconnect voluntarily, the backend logout handler can publish a session revocation event:
   ```java
   @PostMapping("/auth/logout")
   public ResponseEntity<?> logout(@RequestHeader("Authorization") String bearerToken) {
       String token = bearerToken.substring(7);
       long remainingTtl = jwtUtils.getRemainingTtl(token);
       redisTemplate.opsForValue().set("blacklist:" + token, "revoked", Duration.ofMillis(remainingTtl));

       // Terminate active STOMP sessions for this user
       String userId = jwtUtils.getUserIdFromToken(token);
       userSessionRegistry.disconnectUserSessions(userId);

       return ResponseEntity.ok().build();
   }
   ```
   Spring's `SimpUserRegistry` looks up all active `WebSocketSession` IDs registered to the `StompPrincipal(userId)` and closes them with `CloseStatus.POLICY_VIOLATION`.

---

#### Q6: How do you prevent unauthorized users from eavesdropping on private WebSocket topics?
**Difficulty:** 🟡 Intermediate  
**Focus:** Destination security, `SUBSCRIBE` interception, multi-tenancy

**Answer:**
In a multi-tenant platform like DevOps Suite, users must only receive events intended for their identity or projects they belong to.

**Vulnerability Without Topic Security:**  
If only `CONNECT` is validated, an attacker authenticated as `User B` could issue:
```stomp
SUBSCRIBE
id:sub-100
destination:/topic/notifications/3fa85f64-5717-4562-b3fc-2c963f66afa6 (User A's UUID)
```
The simple broker would happily register the subscription and stream User A's private notifications to User B.

**Enforcement Strategy in DevOps Suite:**  
Intercept `StompCommand.SUBSCRIBE` inside `ChannelInterceptor.preSend`:
1. Extract destination: `String dest = accessor.getDestination()`.
2. Extract user identity: `Principal principal = accessor.getUser()`.
3. Check notification rules:
   - For `/topic/notifications/{targetUserId}`: verify that `principal.getName().equals(targetUserId)`. If false, throw `AccessDeniedException`.
4. Check project-level rules:
   - For `/topic/tasks/{projectId}` or `/topic/logs/{projectId}`: extract `projectId`, query PostgreSQL or Redis (`projectMemberRepository.existsByProjectIdAndUserId(...)`), and reject if the user is not an active collaborator.

---

### 🔴 Advanced Engineering

#### Q7: What happens if a user's JWT expires while their WebSocket connection is still open? Does the connection drop immediately?
**Difficulty:** 🔴 Advanced  
**Focus:** Long-lived TCP connections, token expiration semantics, periodic re-validation

**Answer:**

**Default Spring Behavior:**  
**No, the connection does not drop immediately.**  
In standard Spring STOMP architecture, authentication is **connection-oriented, not message-oriented**. Once the `CONNECT` frame is authenticated, the `StompPrincipal` is stored in the WebSocket session's attributes. As long as the TCP socket remains active (sustained by 4-second STOMP heartbeats), the client can maintain the connection well past the original 1-hour expiration timestamp of the JWT.

**Architectural Risk:**  
If a user is downgraded, fired, or their credentials expire 10 minutes into an 8-hour working day, their open WebSocket session could continue receiving confidential project task updates and execution logs.

**DevOps Suite Production Mitigation Strategies:**

1. **Periodic Inbound Heartbeat / Command Re-Validation:**  
   Every time the client publishes a frame or sends a STOMP heartbeat ping, the channel interceptor can verify the session's establishment timestamp against token lifetime:
   ```java
   if (StompCommand.SUBSCRIBE.equals(accessor.getCommand()) || 
       StompCommand.SEND.equals(accessor.getCommand())) {
       Instant authTime = (Instant) accessor.getSessionAttributes().get("AUTH_TIMESTAMP");
       if (Duration.between(authTime, Instant.now()).toHours() >= 1) {
           throw new MessagingException("Session authentication expired. Please reconnect.");
       }
   }
   ```

2. **Session Eviction via Scheduled Task or Redis Expiration:**  
   When the user authenticates during `CONNECT`, store the session ID in Redis with an exact TTL matching the access token's remaining lifespan:
   ```
   SET ws:session:3fa85f64-5717:session-891 "active" EX 3600
   ```
   A Redis keyspace notification listener or a scheduled job running inside Spring Boot scans for expired session keys and programmatically closes the WebSocket session via `WebSocketSession.close(CloseStatus.POLICY_VIOLATION)`.

3. **Client-Side Proactive Rotation:**  
   In [`websocketService.js`](file:///d:/Projects/DevOps%20Suite/frontend/src/services/websocketService.js), when the frontend refresh token timer fires (every 55 minutes) and receives a new access token, it gracefully re-activates the STOMP client with updated `connectHeaders`:
   ```javascript
   export const updateAuthToken = (newToken) => {
     if (stompClient) {
       stompClient.connectHeaders = { Authorization: `Bearer ${newToken}` };
       // Re-activate smoothly closes old socket and opens new authenticated one
       stompClient.deactivate().then(() => stompClient.activate());
     }
   };
   ```

---

#### Q8: How would you scale STOMP WebSocket authentication across multiple backend server nodes?
**Difficulty:** 🔴 Advanced  
**Focus:** Horizontal scaling, clustered brokers, RabbitMQ/ActiveMQ relay, distributed sessions

**Answer:**

**The Bottleneck with In-Memory SimpleBroker:**  
Currently, DevOps Suite configures `registry.enableSimpleBroker("/topic")`. This runs an **in-memory message broker** inside a single Spring Boot JVM. If the backend scales horizontally to 5 instances behind an AWS ALB or Nginx load balancer:
- User A connects to Node 1.
- User B connects to Node 2.
- When an execution completes on Node 1, its `SimpMessagingTemplate` broadcasts to `/topic/tasks/{projectId}` on Node 1 only. User B on Node 2 never receives the event!

```
                                  +-----------------------+
                                  |    Load Balancer      |
                                  | (Nginx / AWS ALB)     |
                                  +-----------+-----------+
                                              |
                   +--------------------------+--------------------------+
                   | (Sticky Sessions / IP Hash)                         |
                   v                                                     v
       +-----------------------+                             +-----------------------+
       |   Backend Node 1      |                             |   Backend Node 2      |
       |  StompAuthInterceptor |                             |  StompAuthInterceptor |
       +-----------+-----------+                             +-----------+-----------+
                   |                                                     |
                   | In-Memory Broker (Isolated)                         | In-Memory Broker (Isolated)
                   |                                                     |
                   +--------------------------+--------------------------+
                                              |
                                              v
                              +-------------------------------+
                              | Shared Message Broker Relay   |
                              | (RabbitMQ / Redis Pub-Sub)    |
                              +-------------------------------+
```

**Step-by-Step Distributed Architecture Migration:**

1. **Shared State Store for Authentication:**  
   JWT verification is already stateless and relies on HMAC signatures + Redis 7 for blacklists. Since Redis is externalized across the cluster, any backend node can independently validate any client's `CONNECT` frame identically.

2. **Replace SimpleBroker with an External Stomp Broker Relay:**  
   Update `WebSocketConfig.java` to use a dedicated message broker such as **RabbitMQ** with the STOMP plugin enabled:
   ```java
   @Override
   public void configureMessageBroker(MessageBrokerRegistry registry) {
       registry.enableStompBrokerRelay("/topic", "/queue")
               .setRelayHost("rabbitmq.internal")
               .setRelayPort(61613)
               .setClientLogin("devops_guest")
               .setClientPasscode("devops_secret")
               .setSystemLogin("devops_admin")
               .setSystemPasscode("devops_admin_secret");
       registry.setApplicationDestinationPrefixes("/app");
   }
   ```

3. **Message Distribution Flow:**  
   - When User A subscribes to `/topic/tasks/prj-100` on Node 1, Spring's STOMP broker relay forwards this subscription upstream to RabbitMQ.
   - When an event occurs on Node 2, Node 2 publishes the message to RabbitMQ's topic exchange.
   - RabbitMQ routes the frame to all subscribed nodes (Node 1, Node 2, etc.), which deliver it downstream to their local WebSocket TCP clients.

4. **Distributed User Session Registry:**  
   To resolve user destinations across nodes (`convertAndSendToUser`), deploy Spring Session with Redis (`spring-session-data-redis`). This shares the mapping of `userId -> [node1:session-abc, node2:session-xyz]` across the entire cluster.

---

#### Q9: Compare STOMP over SockJS vs. Server-Sent Events (SSE) vs. pure WebSockets for DevOps Suite. Why was STOMP chosen?
**Difficulty:** 🔴 Advanced  
**Focus:** Architectural trade-offs, duplex protocols, overhead, firewall traversal

**Answer:**

| Evaluation Metric | Server-Sent Events (SSE) | Raw Native WebSockets | STOMP over SockJS (DevOps Suite) |
| :--- | :--- | :--- | :--- |
| **Directionality** | Unidirectional (Server -> Client only). Client cannot send messages back over the same channel. | Full Duplex (Bidirectional). | Full Duplex (Bidirectional) with rich pub-sub framing semantics. |
| **Protocol Overhead** | Extremely lightweight; plain text `text/event-stream` over standard HTTP. | Minimal; 2-10 byte framing overhead. | Moderate; text-based headers on frames (`CONNECT`, `SEND`, `SUBSCRIBE`). |
| **Authentication Flow** | Standard HTTP headers allowed via `fetch`/`EventSource` polyfills (`Authorization: Bearer`). | No custom HTTP headers in browser API; forces query params or cookie workarounds. | Standard HTTP upgrade handshake + native STOMP headers on `CONNECT` frame. |
| **Pub/Sub Semantics** | None; server must manually filter streams per connection. | None; application must invent its own framing and topic routing JSON structure. | Built-in standard semantics (`SUBSCRIBE /topic/...`, `SEND /app/...`). |
| **Proxy / Firewall Fallback** | Runs over standard HTTP/1.1 or HTTP/2; bypasses strict enterprise proxies natively. | Often blocked or dropped by legacy enterprise corporate firewalls. | SockJS gracefully falls back to XHR streaming or long-polling if WebSockets fail. |
| **Best Used For** | Notification-only feeds, unidirectional dashboard metrics. | High-frequency binary data (gaming, low-latency financial trading). | Collaborative platforms with notifications, chat, live task boards, and terminal logs. |

**Rationale for DevOps Suite:**  
DevOps Suite requires bidirectional interactivity: users receive notifications, stream terminal output, and will soon send interactive terminal input back to Docker containers (`stdin`). Pure SSE cannot handle client upstream streaming without opening separate HTTP POST requests per keystroke. Raw WebSockets lack an application-level sub-protocol, forcing developers to build custom JSON dispatchers. STOMP provides standardized framing, heartbeats, topic abstractions, and out-of-the-box Spring broker integration.

---

### ⚫ Expert & Security Hardening

#### Q10: How can Cross-Site WebSocket Hijacking (CSWSH) be executed against an improperly secured STOMP endpoint, and how does DevOps Suite defend against it?
**Difficulty:** ⚫ Expert  
**Focus:** CSWSH exploitation, Origin validation, CORS vs. WebSocket security

**Answer:**

**The Exploit Mechanics of CSWSH:**
1. Unlike standard AJAX/Fetch requests, **the browser's Same-Origin Policy (SOP) does not restrict WebSocket connections**. A script on `https://evil-hacker.com` can freely execute `new WebSocket("https://api.devopssuite.com/ws")`.
2. If the application relies on **HTTP Cookies** for WebSocket authentication, the user's browser automatically attaches the session cookie to the cross-origin upgrade request.
3. The server upgrades the connection, believing it belongs to the authenticated user.
4. The malicious script on `evil-hacker.com` can now issue STOMP subscriptions to `/topic/notifications/{userId}` and harvest sensitive tokens, project data, and private logs.

```
[Attacker Site: evil-hacker.com]
          |
          | 1. JS: new WebSocket("https://api.devopssuite.com/ws")
          |    Browser attaches Cookie: JSESSIONID=abc (Ambient Credential)
          v
[DevOps Suite Server]
          |
          | 2. Accepts handshake without Origin check -> Connection established!
          |
[Attacker Site]
          |
          | 3. Sends STOMP: SUBSCRIBE /topic/notifications/{victim_id}
          v
[DevOps Suite Server]
          |
          | 4. Leaks confidential project alerts & tokens to attacker
          v
[Attacker Site]
```

**DevOps Suite's Defense-in-Depth Model:**

1. **Origin Header Filtering in `registerStompEndpoints`:**  
   In [`WebSocketConfig.java`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/config/WebSocketConfig.java#L40-L42), DevOps Suite restricts origins:
   ```java
   registry.addEndpoint("/ws")
           .setAllowedOriginPatterns("http://localhost:5173", "http://localhost:*")
           .withSockJS();
   ```
   If a request carries `Origin: https://evil-hacker.com`, Spring's underlying WebSocket handshake handler immediately aborts the handshake with HTTP `403 Forbidden` before protocol switching occurs.

2. **Explicit Bearer Tokens Instead of Ambient Cookies:**  
   DevOps Suite does **not** rely on cookies for WebSocket authentication. The JWT must be explicitly extracted from the client's memory/localStorage and placed inside the STOMP `Authorization` header by JavaScript running on the permitted frontend domain. A cross-origin site has no access to the victim's local storage or application memory due to browser storage isolation.

---

#### Q11: How do you design end-to-end automated integration tests for `StompAuthChannelInterceptor` in Spring Boot?
**Difficulty:** ⚫ Expert  
**Focus:** `@SpringBootTest`, `WebSocketStompClient`, test containers, concurrency

**Answer:**

Testing STOMP authentication requires spinning up an embedded servlet container and simulating real network socket communication:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class StompAuthChannelInterceptorIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private StringRedisTemplate redisTemplate;

    private WebSocketStompClient stompClient;

    @BeforeEach
    void setup() {
        stompClient = new WebSocketStompClient(
                new SockJsClient(List.of(new WebSocketTransport(new StandardWebSocketClient()))));
        stompClient.setMessageConverter(new MappingJackson2MessageConverter());
    }

    @Test
    void shouldConnectSuccessfullyWithValidJwt() throws Exception {
        User testUser = createTestUser();
        String validJwt = jwtUtils.generateAccessToken(testUser);

        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer " + validJwt);

        CompletableFuture<StompSession> sessionFuture = new CompletableFuture<>();

        stompClient.connectAsync(
                "ws://localhost:" + port + "/ws",
                new WebSocketHttpHeaders(),
                connectHeaders,
                new StompSessionHandlerAdapter() {
                    @Override
                    public void afterConnected(StompSession session, StompHeaders connectedHeaders) {
                        sessionFuture.complete(session);
                    }
                }
        );

        StompSession session = sessionFuture.get(3, TimeUnit.SECONDS);
        assertThat(session.isConnected()).isTrue();
        session.disconnect();
    }

    @Test
    void shouldRejectConnectionWhenTokenIsBlacklistedInRedis() {
        User testUser = createTestUser();
        String token = jwtUtils.generateAccessToken(testUser);
        
        // Populate blacklist in Redis
        redisTemplate.opsForValue().set("blacklist:" + token, "revoked", Duration.ofMinutes(10));

        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer " + token);

        CompletableFuture<Throwable> errorFuture = new CompletableFuture<>();

        stompClient.connectAsync(
                "ws://localhost:" + port + "/ws",
                new WebSocketHttpHeaders(),
                connectHeaders,
                new StompSessionHandlerAdapter() {
                    @Override
                    public void handleTransportError(StompSession session, Throwable exception) {
                        errorFuture.complete(exception);
                    }
                }
        );

        assertThatThrownBy(() -> errorFuture.get(3, TimeUnit.SECONDS))
                .hasCauseInstanceOf(Exception.class);
    }
}
```

---

#### Q12: Walk through the thread-safety and concurrency considerations when multiple frames are handled simultaneously by `StompAuthChannelInterceptor`.
**Difficulty:** ⚫ Expert  
**Focus:** Concurrency, Spring thread pools, session race conditions

**Answer:**

**Thread Model of Spring STOMP:**
- When messages arrive over the TCP connection, Tomcat/Undertow read the bytes and dispatch them to Spring's `clientInboundChannel`.
- `clientInboundChannel` is backed by a `ThreadPoolTaskExecutor` (by default, number of available CPU cores × 2).
- Therefore, different frames from the **same** client connection can theoretically be executed concurrently by different threads in the thread pool if not properly synchronized!

**Concurrency Failure Scenario (Race Condition):**
1. Client connects and immediately sends `CONNECT` and `SUBSCRIBE` in rapid succession over the same socket pipeline.
2. Thread 1 picks up the `CONNECT` frame and enters [`StompAuthChannelInterceptor.preSend`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/notification/security/StompAuthChannelInterceptor.java#L49). It invokes Redis (`redisTemplate.hasKey`) and begins cryptographic parsing (`jwtUtils.validateToken`).
3. Thread 2 picks up the `SUBSCRIBE` frame simultaneously.
4. If Thread 2 executes its topic authorization check before Thread 1 completes `accessor.setUser(new StompPrincipal(userId))`, Thread 2 sees `accessor.getUser() == null`!
5. Thread 2 throws an `AccessDeniedException`, erroneously terminating the client's subscription.

**How DevOps Suite & Spring Mitigate This:**
1. **Ordered Message Processing:**  
   Spring's `SubscribableChannel` preserves message ordering per WebSocket session by default using message sequencing logic in `AbstractSubscribableChannel`.
2. **Client-Side STOMP Protocol State Machine:**  
   In [`websocketService.js`](file:///d:/Projects/DevOps%20Suite/frontend/src/services/websocketService.js), `@stomp/stompjs` strictly enforces that `SUBSCRIBE` frames are buffered and **never transmitted over the wire until the `CONNECTED` acknowledgment frame is received from the server**.
3. **Immutability of `StompPrincipal`:**  
   `StompPrincipal` is implemented as an immutable Java `record`:
   ```java
   private record StompPrincipal(String name) implements Principal {
       @Override public String getName() { return name; }
   }
   ```
   Its internal state cannot be corrupted by concurrent reads once stamped onto the session.

---

## Quick Reference & Interview Summary

### Key Architecture Facts
- **Transport Handshake:** HTTP `GET /ws/info` and `GET /ws/.../websocket` upgraded via SockJS (`permitAll()` in [`SecurityConfig.java`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/security/SecurityConfig.java)).
- **Protocol Security:** Deferred to STOMP application layer. Intercepted by [`StompAuthChannelInterceptor.java`](file:///d:/Projects/DevOps%20Suite/backend/src/main/java/com/devopssuite/notification/security/StompAuthChannelInterceptor.java) on `StompCommand.CONNECT`.
- **Credential Transport:** STOMP native header: `Authorization: Bearer <jwt>`.
- **Validation Pipeline:**
  1. Extract header string.
  2. Verify absence in Redis: `redisTemplate.hasKey("blacklist:" + token)`.
  3. Validate signature & expiration: `jwtUtils.validateToken(token)`.
  4. Bind user: `accessor.setUser(new StompPrincipal(userId))`.
- **Topic Destinations:**
  - `/topic/notifications/{userId}`: Personal toast events.
  - `/topic/tasks/{projectId}`: Kanban task updates.
  - `/topic/logs/{projectId}`: Live Docker sandbox log streaming.
- **Heartbeats:** Configured as `4000ms` incoming and `4000ms` outgoing.
- **Client Library:** `@stomp/stompjs` + `sockjs-client` in React 18.

### Common Interview Traps & Pitfalls to Avoid
- **Trap 1:** *"Why not just put the JWT in an HTTP header during the WebSocket upgrade?"*  
  *Correction:* Browser W3C WebSocket API does not support custom headers.
- **Trap 2:** *"Can we pass the token as a query parameter (`/ws?token=...`)?"*  
  *Correction:* Insecure; leaks into server logs, proxy access logs, referer headers, and cannot be updated dynamically.
- **Trap 3:** *"Does standard Spring Security automatically authenticate STOMP frames if the HTTP endpoint is secured?"*  
  *Correction:* No. Securing `/ws/**` at the servlet level only protects the initial handshake. If using token-based auth without session cookies, the STOMP channel itself must be intercepted.
- **Trap 4:** *"Does the interceptor validate every STOMP frame?"*  
  *Correction:* In DevOps Suite, `StompAuthChannelInterceptor` inspects only `StompCommand.CONNECT`. Once validated, the resulting `Principal` is bound to the session for the connection's lifetime.
