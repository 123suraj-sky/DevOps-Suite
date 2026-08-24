```powershell
ssh -i ".\vm-devopssuite_key.pem" sky@20.235.240.81
```

If get error for permission:

```powershell
icacls ".\vm-devopssuite_key.pem" /inheritance:r
```
then
```powershell
icacls ".\vm-devopssuite_key.pem" /remove "SKY\CodexSandboxUsers"
```
```powershell
icacls ".\vm-devopssuite_key.pem" /grant:r "$env:USERNAME:R"
```
```powershell
icacls ".\vm-devopssuite_key.pem" /grant:r "$($env:USERDOMAIN)\$($env:USERNAME):(R)"
```
```powershell
icacls ".\vm-devopssuite_key.pem"
```
```powershell
ssh -i ".\vm-devopssuite_key.pem" sky@20.235.240.81
```
You should now get:
```powershell
sky@vm-devopssuite:~$
```
now we are in VM
```powershell
sudo apt update
```
```powershell
sudo apt install -y ca-certificates curl
```

Add Docker's official GPG key:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
```

```bash
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
```

```bash
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Add the Docker repository:

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Then:

```bash
sudo apt update
```

Install Docker Engine and Compose:

```bash
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Give your `sky` user Docker access

```bash
sudo usermod -aG docker $USER
```

Then:

```bash
newgrp docker
```

### Verify Docker

Run:

```bash
docker --version
```

and:

```bash
docker compose version
```

You should get something similar to:

```text
Docker version 29.x.x
Docker Compose version v2.x.x
```

Then test that Docker actually works:

```bash
docker run hello-world
```

If that succeeds, **don't clone the repository yet**. Send me the output of:

```bash
docker --version
docker compose version
docker run hello-world
```

Then we'll configure Docker specifically for your **Spring Boot + PostgreSQL + Redis + Docker-sandbox DevOps Suite** deployment.

If you want to see it:
```powershell
docker ps -a
```

---

```powershell
git clone -b main --single-branch https://github.com/123suraj-sky/DevOps-Suite.git
```

```powershell
cp .env.example .env
```

```powershell
openssl rand -hex 32
```

```powershell
nano .env
```

```powershell
docker compose config
```

```powershell
docker compose build backend
```
```powershell
docker compose up -d postgres redis
```
```powershell
docker compose up -d elasticsearch
```
```powershell
docker compose up -d logstash prometheus grafana kibana
```
```powershell
cd frontend
npm i
npm run dev -- --host 0.0.0.0
```

then \<public ip from azure>:5173 in browser

