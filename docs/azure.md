# DevOps Suite — Azure VM Production Deployment

## Access the VM

```powershell
ssh -i ".\vm-devopssuite_key.pem" sky@20.235.240.81
```

If you get a permission error on the key file:

```powershell
icacls ".\vm-devopssuite_key.pem" /inheritance:r
icacls ".\vm-devopssuite_key.pem" /grant:r "$($env:USERDOMAIN)\$($env:USERNAME):(R)"
```

---

## Architecture

```
Internet → http://20.235.240.81  (port 80)
                 │
              Nginx (Docker)
             ┌────┴──────────────────────┐
             │                           │
    / → React SPA files        /api/, /ws/ → backend:8081
         (built Vite dist)        (Spring Boot)

systemd manages the entire Docker Compose stack:
  auto-starts on boot, restarts on crash
```

---

## One-Time VM Setup

Do this **once** after the VM is provisioned and Docker is installed.

### 1. Install Docker

```bash
sudo apt update && sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone the repo

```bash
git clone -b main --single-branch https://github.com/123suraj-sky/DevOps-Suite.git
cd DevOps-Suite
```

### 3. Create the `.env` file

```bash
cp .env.example .env
nano .env
```

Set at minimum:
- `DB_PASSWORD` — a strong password
- `JWT_SECRET` — generate with `openssl rand -hex 32`

### 4. Open port 80 in Azure NSG

In the Azure portal → your VM → Networking → Add inbound rule:
- Port: `80`
- Protocol: `TCP`
- Action: `Allow`

> Port 5173 and 8081 can be **closed** — Nginx handles all public traffic on port 80.

### 5. Do the initial Docker build and start

```bash
docker compose build
docker compose up -d
```

Wait ~3-5 minutes for Maven to compile and all services to start. Verify:

```bash
docker compose ps          # all services should show "running"
curl http://localhost/api/actuator/health   # should return {"status":"UP"}
```

### 6. Install the systemd service (auto-start on reboot)

```bash
bash scripts/install-service.sh
```

This copies `scripts/devopssuite.service` to `/etc/systemd/system/`, enables it, and starts it.

Verify:

```bash
sudo systemctl status devopssuite
```

---

## Accessing the Application

| URL | What it is |
|---|---|
| `http://20.235.240.81` | React frontend + API (via Nginx) |
| `http://20.235.240.81:3000` | Grafana |
| `http://20.235.240.81:5601` | Kibana |
| `http://20.235.240.81:9090` | Prometheus |

---

## Continuous Deployment

Every push to `main` triggers the GitHub Actions CD pipeline:

1. Backend tests (`mvn clean test`)
2. Frontend build (`vite build`)
3. SSH into VM → `git pull` → `docker compose build frontend backend` → `docker compose up -d`

No manual steps needed after the one-time setup.

**Required GitHub Secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `VM_HOST` | `20.235.240.81` |
| `VM_USER` | `sky` |
| `VM_SSH_KEY` | Contents of `vm-devopssuite_key.pem` |

---

## Day-to-Day Operations

```bash
# Check all container statuses
docker compose ps

# View logs for a specific service
docker compose logs -f backend
docker compose logs -f frontend

# Restart a single service
docker compose restart backend

# Check systemd service status
sudo systemctl status devopssuite

# Tail systemd logs
sudo journalctl -u devopssuite -f

# Manual redeploy (if needed outside of CI)
git pull origin main
docker compose build frontend backend
docker compose up -d
```

---

## Troubleshooting

**Site not loading (`http://20.235.240.81`):**
```bash
docker compose ps                        # is "frontend" running?
docker compose logs frontend             # any Nginx errors?
curl http://localhost                    # works from inside the VM?
```

**API calls failing (401/404):**
```bash
docker compose logs backend              # Spring Boot errors?
curl http://localhost/api/actuator/health
```

**Services not starting after reboot:**
```bash
sudo systemctl status devopssuite
sudo journalctl -u devopssuite -n 50
```
