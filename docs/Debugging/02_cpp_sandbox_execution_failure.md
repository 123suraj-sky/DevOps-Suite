# Debugging Log 02: C++ Sandbox Code Execution Failure

## 📌 Issue Summary
When running C++ code via the Sandbox Code Runner:
1. Initially failed with: `System error: Failed to download sandbox runtime environment.`
2. After fixing the image, failed with: `sh: /tmp/program: Permission denied` (Exit code: -1).

---

## 🔍 Root Cause Analysis

### 1. Missing / Invalid Docker Hub Image
- The database migration seeded C++ with the Docker image tag `gcc:13-alpine`.
- On Docker Hub, official GCC images are Debian-based (`gcc:13`, `gcc:latest`); no official `gcc:13-alpine` tag exists.
- When backend invoked `ensureImageExists("gcc:13-alpine")`, Docker daemon returned 404 (Not Found), triggering the runtime environment download error.

### 2. Default `noexec` Behavior on Docker tmpfs
- In Linux / Docker, when a `--read-only` container mounts a tmpfs without explicit execution flags, or if `exec` is not explicitly declared in mount options (e.g. `rw,nosuid,size=64m`), the kernel defaults to `noexec` for the tmpfs mount.
- The C++ compilation pipeline compiles user code into `/tmp/program` (`g++ -O2 /app/code.cpp -o /tmp/program && /tmp/program < /app/input.txt`).
- When attempting to execute `/tmp/program`, the kernel rejects execution with `Permission denied`.

---

## 🛠️ Resolution Steps

### 1. Built Dedicated Local C++ Sandbox Image
Created a minimal, reproducible C++ image based on Alpine:
- File: `Dockerfile.cpp-sandbox`
```dockerfile
FROM alpine:latest
RUN apk add --no-cache g++ musl-dev
```
- Built locally via:
```bash
docker build -t devopssuite-cpp:latest -f Dockerfile.cpp-sandbox .
```

### 2. Applied Flyway Migration for Language Runtime Image
Created Flyway migration `backend/src/main/resources/db/migration/V5__fix_cpp_docker_image.sql`:
```sql
-- Fix C++ sandbox image: gcc:13-alpine does not exist; use local devopssuite-cpp image
UPDATE languages SET docker_image = 'devopssuite-cpp:latest', version = 'g++15' WHERE name = 'cpp';
```

### 3. Added Explicit `exec` Flag on `/tmp` tmpfs Mount
Updated `DockerSandbox.java` to explicitly enable binary execution on the compiler scratch tmpfs:
```java
.withTmpFs(java.util.Map.of(
        "/tmp", "rw,exec,nosuid,size=64m"  // exec flag explicitly enables running compiled binaries
))
```
*Note: Sandbox security remains intact through `--network none`, `readonlyRootfs(true)`, and memory/CPU limits.*

### 4. Rebuilt and Deployed Backend
```bash
docker-compose up -d --build backend
```

---

## ✅ Verification
- Checked database table `languages` to confirm `devopssuite-cpp:latest` is assigned.
- Confirmed `devopssuite-cpp:latest` executes compiled binaries successfully with `rw,exec,nosuid,size=64m`.
- Confirmed C++ execution compiles and executes correctly with stdout/stderr returned to the frontend.
