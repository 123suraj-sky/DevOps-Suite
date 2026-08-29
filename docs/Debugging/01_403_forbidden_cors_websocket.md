# 01 — 403 Forbidden on POST /api/projects & WebSocket CORS Failure

## Symptoms

- `POST http://localhost:8081/api/projects` returned **403 Forbidden**
- Browser console: `Access-Control-Allow-Origin header must not be wildcard '*' when request credentials mode is 'include'`
- WebSocket connection to `ws://localhost:8081/ws` failed immediately with a CORS error on the `/ws/info` preflight

---

## Root Causes

Three separate bugs combined to produce these errors.

### 1. CORS wildcard incompatible with credentialed requests (`SecurityConfig.java`)

The CORS configuration used:

```java
configuration.setAllowedOrigins(Collections.singletonList("*"));
```

Every API request from the frontend carries an `Authorization: Bearer <token>` header. Any request with a non-simple header triggers a browser CORS preflight. When the browser sees `Access-Control-Allow-Origin: *` on a credentialed preflight, it **hard-blocks it** — the CORS spec explicitly forbids combining a wildcard origin with credentials. There was also no `setAllowCredentials(true)` call, making the situation doubly broken.

### 2. Controller URL mismatch (`ProjectController.java`)

The Vite dev server proxy forwards `/api/*` requests to `localhost:8081` **without stripping the `/api` prefix**. So the backend receives the request as `POST /api/projects`. The controller was only mapped to:

```java
@RequestMapping({"/projects", "/api/v1/projects"})
```

`/api/projects` matched nothing. Spring Security's `anyRequest().authenticated()` rejected the unmatched route with 403 before any controller logic ran.

### 3. WebSocket handshake path blocked by Spring Security (`SecurityConfig.java`)

SockJS initiates connections via HTTP requests to `/ws/info?t=...` before performing the WebSocket upgrade. These HTTP requests hit the Spring Security filter chain. Because `/ws/**` was not in the `permitAll()` list, Spring Security rejected them with 403.

The JWT token is sent as a STOMP `connectHeaders` value — it only arrives **after** the WebSocket upgrade, not during the initial HTTP handshake. So the security layer had no way to authenticate these requests even if it tried.

---

## Fixes Applied

### Fix 1 — `SecurityConfig.java`: proper CORS configuration

Replaced the wildcard origin with `setAllowedOriginPatterns` (which supports patterns and is compatible with `allowCredentials`) and added `setAllowCredentials(true)`:

```java
// Before
configuration.setAllowedOrigins(Collections.singletonList("*"));

// After
configuration.setAllowedOriginPatterns(Arrays.asList("http://localhost:5173", "http://localhost:*"));
configuration.setAllowCredentials(true);
```

### Fix 2 — `ProjectController.java`: added `/api/projects` to the request mapping

```java
// Before
@RequestMapping({"/projects", "/api/v1/projects"})

// After
@RequestMapping({"/projects", "/api/projects", "/api/v1/projects"})
```

### Fix 3 — `SecurityConfig.java`: permit `/ws/**` in the HTTP security chain

```java
.requestMatchers("/ws/**").permitAll()
```

This allows SockJS HTTP handshake requests through the security filter. The actual authentication still happens at the STOMP layer via the `Authorization` header in `connectHeaders`.

---

## Why `*` Doesn't Work for Credentialed Requests

`Access-Control-Allow-Origin: *` means "any origin can read this response" — but only for **anonymous** requests. The CORS spec carves out an explicit exception: when a request is credentialed (carries `Authorization`, cookies, or TLS client certs), the server **must** name a specific origin and set `Access-Control-Allow-Credentials: true`. The wildcard is forbidden in this case, and all browsers enforce it strictly regardless of what the server sends.

---

## Files Modified

| File | Change |
|---|---|
| `backend/src/main/java/com/devopssuite/security/SecurityConfig.java` | CORS wildcard → explicit origin patterns + `allowCredentials(true)` + permit `/ws/**` |
| `backend/src/main/java/com/devopssuite/project/controller/ProjectController.java` | Added `/api/projects` to `@RequestMapping` |
