# 05 — Transient "Network Error" on Localhost (Frontend to Backend)

## Symptoms

- During login or initial API requests, the UI intermittently displays a red banner with **`Network Error`**.
- No HTTP status code (like 400, 401, or 500) is returned in the response object.
- After waiting a few seconds or retrying, the exact same request succeeds without any code changes.
- Browser DevTools Console shows `ERR_CONNECTION_REFUSED`, `ERR_PROXY_CONNECTION_FAILED`, or `net::ERR_EMPTY_RESPONSE`.

---

## Root Causes

Axios throws a generic `"Network Error"` when an HTTP request fails at the network/TCP socket level before receiving an HTTP response header from the server. In a local development environment, this transient failure happens due to the following reasons:

### 1. Backend Cold Start / Context Initialization Delay
When starting or restarting the Spring Boot application (directly or via Docker Compose):
- Spring Boot initializes DataSource pools (HikariCP), runs Flyway database migrations, sets up JPA EntityManager factories, and connects to Redis.
- This process typically takes **10–25 seconds**.
- If the frontend dev server (`http://localhost:5173`) is already open and an action (such as login) is triggered before the backend binds to port `8081`, the connection is immediately refused (`ECONNREFUSED`).
- Once initialization finishes, subsequent attempts succeed.

### 2. Vite Dev Server Proxy Idle Connection Drop (`ECONNRESET` / Socket Timeout)
- The React application sends requests to `/api/*`, which Vite's Node.js dev proxy (`vite.config.js`) forwards to `http://localhost:8081`.
- When the application is idle for a prolonged period, the keep-alive socket connection between the Vite proxy and the embedded Tomcat server can time out or be closed silently by Tomcat.
- The first request made after the idle period encounters a closed TCP socket, resulting in a dropped request / network error.
- Vite then establishes a fresh TCP socket connection for the next attempt, making the error disappear immediately on retry.

### 3. Container Resource Contention / Restart
- When running backend dependencies through Docker Desktop on Windows, high CPU/RAM usage during compilation or container restarts can cause brief socket dropouts or slow response times exceeding early connection timeouts.

---

## How to Diagnose

1. **Inspect Browser Developer Tools (`F12`):**
   - Go to **Network** tab -> Filter by `Fetch/XHR`.
   - If the status is `(failed)` with no response payload and Console indicates `ERR_CONNECTION_REFUSED` or `ERR_PROXY_CONNECTION_FAILED`, the issue is socket-level connectivity, not an application-level bug.

2. **Check Backend Startup Status:**
   - Verify terminal logs or Docker logs for the backend container.
   - Look for the confirmation line before submitting UI requests:
     ```text
     Started MonolithApplication in X.XXX seconds (process running for ...)
     ```

---

## Recommended Practices & Solutions

1. **Allow Backend Initialization to Complete:**
   - Always verify that the Spring Boot backend has finished starting before performing actions in the UI.

2. **Axios Retry / Interceptor (Optional Improvement):**
   - For transient proxy/socket resets, an exponential backoff or automatic single-retry mechanism on idempotent requests (or network-level failures) can be added to `frontend/src/api/client.js` using `axios-retry`.

3. **Monitor Container Health:**
   - Keep Docker Desktop resources adequately sized (minimum 4GB RAM allocated to WSL2/Docker) to prevent JVM throttling during cold starts.
