# Azure Deployment Guide — DevOps Suite

This guide provides detailed, step-by-step instructions for deploying the **DevOps Suite** platform to Microsoft Azure.

---

## 📌 Architecture Options on Azure

DevOps Suite consists of a React frontend, a Spring Boot monolith backend, PostgreSQL, Redis, Elasticsearch/Logstash/Kibana, and Prometheus/Grafana. Crucially, the backend requires a **Docker Daemon connection** (via `/var/run/docker.sock`) to spawn ephemeral sandbox containers for code execution.

We support two main deployment options on Azure:

| Deployment Option | Effort | Code Sandbox Compatibility | Best For |
| :--- | :--- | :--- | :--- |
| **Option A: Azure VM (Docker Compose)** | ⭐ Easiest | 🟢 Out-of-the-box (uses host Docker daemon) | Small-to-medium teams, portfolios, rapid deployments. |
| **Option B: Azure Kubernetes Service (AKS)** | 🛡️ Complex | 🟡 Requires Docker-in-Docker (DinD) configuration | Highly scalable, high availability, enterprise use. |

---

## 🚀 Option A: Azure VM Deployment (Recommended)

This strategy deploys the entire stack onto a single Azure Virtual Machine using Docker Compose, preserving the Docker socket sandbox out-of-the-box.

### Step 1: Create an Azure Virtual Machine
1. Log in to the [Azure Portal](https://portal.azure.com/).
2. Search for **Virtual Machines** and click **Create -> Azure Virtual Machine**.
3. Configure the VM:
   - **Resource Group:** Create new (e.g., `rg-devopssuite`).
   - **VM Name:** `vm-devopssuite`.
   - **Region:** Choose your preferred region.
   - **Image:** `Ubuntu Server 22.04 LTS - x64 Gen2` (or latest Ubuntu).
   - **Size:** `Standard_B2ms` (2 vCPUs, 8 GB RAM) is recommended to support ELK and Prometheus/Grafana.
   - **Authentication:** SSH public key.
4. Under **Inbound Port Rules**, select **Allow selected ports** and choose:
   - `SSH (22)`
   - `HTTP (80)`
   - `HTTPS (443)`
5. Click **Review + Create**, then **Create**. Download the private key `.pem` file.

### Step 2: Install Docker and Docker Compose on the VM
SSH into your VM:
```bash
ssh -i /path/to/key.pem azureuser@<VM_PUBLIC_IP>
```
Run the following script to install Docker and Docker Compose:
```bash
# Update package database
sudo apt-get update -y

# Install Docker dependencies
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker’s official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker CE
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add azureuser to docker group so sudo isn't needed for docker commands
sudo usermod -aG docker $USER
newgrp docker
```

### Step 3: Clone the Repository and Prepare Files
On the VM, clone your repository and navigate to the project directory:
```bash
git clone <YOUR_GIT_REPO_URL> devops-suite
cd devops-suite
```

### Step 4: Configure Production Environment Variables
Create the production `.env` file from the example:
```bash
cp .env.example .env
nano .env
```
Update the variables for production:
- Set `DB_PASSWORD` to a strong random string.
- Generate a strong `JWT_SECRET` using `openssl rand -hex 32` and set it.
- Fill in optional third-party integrations (Google Client ID/Secret for OAuth2, SMTP settings, etc.).

### Step 5: Start the Application Stack
Build the production containers and start them in background mode:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
> Note: If `docker-compose.prod.yml` isn't created yet, you can spin up the core services (`postgres`, `redis`, `backend`, `frontend`) using standard docker-compose commands.

---

## ☸️ Option B: Azure Kubernetes Service (AKS) Deployment

If you prefer deploying via AKS, follow these instructions.

### Step 1: Create the AKS Cluster and Azure Container Registry (ACR)
Use Azure CLI to spin up AKS and ACR, linking them together:
```bash
# Create Resource Group
az group create --name rg-devopssuite --location eastus

# Create Azure Container Registry
az acr create --resource-group rg-devopssuite --name acrdevopssuite --sku Basic

# Create AKS Cluster and attach it to ACR
az aks create \
    --resource-group rg-devopssuite \
    --name aks-devopssuite \
    --node-count 2 \
    --generate-ssh-keys \
    --attach-acr acrdevopssuite

# Get credentials to run kubectl commands locally
az aks get-credentials --resource-group rg-devopssuite --name aks-devopssuite
```

### Step 2: Build & Push Docker Images to ACR
Build and tag backend and frontend images:
```bash
# Login to ACR
az acr login --name acrdevopssuite

# Build and Push Backend Monolith
docker build -t acrdevopssuite.azurecr.io/devopssuite-backend:latest ./backend
docker push acrdevopssuite.azurecr.io/devopssuite-backend:latest

# Build and Push Frontend SPA
docker build -t acrdevopssuite.azurecr.io/devopssuite-frontend:latest ./frontend
docker push acrdevopssuite.azurecr.io/devopssuite-frontend:latest
```

### Step 3: Configure K8s Pods to Support Code Execution Sandbox
Since AKS uses `containerd` and doesn't run Docker on the host nodes, you must deploy a Docker-in-Docker (DinD) sidecar or DaemonSet to allow the backend pod to access a Docker daemon.
- Modify `k8s/backend.yaml` to include a `dind` sidecar container.
- Configure the backend container's `DOCKER_HOST` environment variable to connect to the DinD sidecar at `tcp://localhost:2375`.

### Step 4: Apply Manifests
Deploy the applications to the cluster:
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap-secrets.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
```

---

## 🛠️ Required Codebase Changes Before Deploying

To ensure the production build behaves correctly on Azure, the following changes are required in this codebase:

1. **Frontend Production Dockerfile (`frontend/Dockerfile`):**
   A production-ready Dockerfile that compiles the React SPA via Node.js and serves the static files using Nginx.
   
2. **Frontend Nginx Proxy Configuration (`frontend/nginx.conf`):**
   Configure Nginx to act as the web server for the frontend, while proxying request paths starting with `/api/` and `/ws/` to the backend monolith service.

3. **Relative Frontend Environment API URLs:**
   Change the environment configuration in the React frontend so it uses relative paths (e.g., `/api` and `/ws`) instead of hardcoded `localhost:8081` URLs. This prevents browser CORS and mixed-content issues when fronted by Nginx.

4. **Production Docker Compose Override File (`docker-compose.prod.yml`):**
   Add a production override file to spin up Nginx, frontend, backend, PostgreSQL, and Redis together, with secure, production-ready environment configurations.
