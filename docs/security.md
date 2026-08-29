# Security — Secrets Management (Stage 2)

## 1. Overview

Stage 2 replaces the `.env`-file approach to secrets with **Azure Key Vault** backed by a **VM System-Assigned Managed Identity**. Sensitive credentials are stored in Key Vault and retrieved at deployment/startup time, so no plaintext secret ever lives in the repository, a Docker image, or a CI/CD log.

---

## 2. The Problem with `.env` Files

Before this stage the secrets flow looked like:

```
Repository / CI runner
        │
        ▼
     .env file  (DB_PASSWORD, JWT_SECRET, MAIL_PASSWORD …)
        │
        ▼
  Docker Compose
        │
        ▼
  Spring Boot containers
```

Risks with this approach:
- `.env` is a plaintext file on disk — anyone with SSH access to the VM can read it
- Secrets must be manually copied to every new VM or environment
- No audit trail of who read a secret or when
- Easy to accidentally commit to Git

---

## 3. Target Architecture

```
Azure Key Vault
  ├── DB-PASSWORD
  ├── JWT-SECRET
  ├── MAIL-USERNAME
  ├── MAIL-PASSWORD
  ├── GOOGLE-CLIENT-ID
  └── GOOGLE-CLIENT-SECRET
        ▲
        │  (Managed Identity auth — no credentials required)
        │
  Azure VM  (System-Assigned Managed Identity)
        │
        ▼
  Startup / deploy script
  (az keyvault secret show …)
        │
        ▼
  .env  (written at runtime, never committed)
        │
        ▼
  Docker Compose → Spring Boot
```

The VM authenticates to Key Vault using its managed identity token — no client secret, no service principal password, nothing to rotate or leak.

---

## 4. Secret Inventory

These are the secrets moved into Key Vault. Non-sensitive config values (hostnames, ports, feature flags) remain in `docker-compose.yml` or `.env.example`.

| Key Vault Secret Name | Maps to `.env` variable | Sensitive? |
|---|---|---|
| `DB-PASSWORD` | `DB_PASSWORD` | ✅ Yes |
| `JWT-SECRET` | `JWT_SECRET` | ✅ Yes |
| `MAIL-USERNAME` | `MAIL_USERNAME` | ✅ Yes |
| `MAIL-PASSWORD` | `MAIL_PASSWORD` | ✅ Yes |
| `GOOGLE-CLIENT-ID` | `GOOGLE_CLIENT_ID` | ✅ Yes |
| `GOOGLE-CLIENT-SECRET` | `GOOGLE_CLIENT_SECRET` | ✅ Yes |
| `GRAFANA-PASSWORD` | `GRAFANA_PASSWORD` | ⚠️ Low risk, optional |

> Values that are **not** secrets — `MAIL_HOST`, `MAIL_PORT`, `ELASTICSEARCH_HOST`, `ELASTICSEARCH_PORT` — stay in the compose file as plain environment variables.

---

## 5. Azure Key Vault Setup

### 5.1 Create the Vault

```
Azure Portal → Key Vaults → Create
  Name:     devopssuite-kv-<unique-suffix>
  Region:   same region as the VM
  SKU:      Standard
```

Naming uses a unique suffix (e.g., short random string or subscription-derived) because Key Vault names are globally unique.

### 5.2 Access Configuration

- **Permission model:** Azure RBAC (recommended over legacy Access Policies)
- **Public network access:** Enabled (restrict to VM's public IP for tighter security)
- **Soft delete:** Enabled (default — prevents accidental permanent deletion)
- **Purge protection:** Enabled in production

### 5.3 Add Secrets

Secrets are added via the portal (`Key Vault → Secrets → Generate/Import`) or CLI:

```bash
az keyvault secret set --vault-name devopssuite-kv-<suffix> \
  --name "JWT-SECRET" --value "<your-value>"

az keyvault secret set --vault-name devopssuite-kv-<suffix> \
  --name "DB-PASSWORD" --value "<your-value>"

# ... repeat for each secret in the inventory above
```

> Never paste secret values into documentation, Git commits, screenshots, or terminal recordings.

---

## 6. Managed Identity

### 6.1 Enable System-Assigned Identity on the VM

```
Azure Portal → Virtual Machines → <your VM>
  → Identity → System assigned → Status: On → Save
```

Azure automatically creates and manages an identity for the VM. The identity is deleted when the VM is deleted.

```
vm-devopssuite
      │
      └── System-Assigned Managed Identity
                    │
                    ▼ (OIDC token, auto-rotated by Azure)
              Azure Key Vault
```

### 6.2 Grant Key Vault Permission (Least Privilege)

Using Azure RBAC, assign only the minimum required role to the VM's managed identity:

```
Azure Portal → Key Vault → Access Control (IAM)
  → Add role assignment
  → Role: Key Vault Secrets User
  → Assign access to: Managed identity
  → Select: vm-devopssuite (system assigned)
```

| Role | Permissions granted | Why this role |
|---|---|---|
| Key Vault Secrets User | `secrets/get`, `secrets/list` | Read-only; cannot create, update, or delete secrets |

The VM can **read** secrets. It cannot modify or delete them. Administrative operations (adding/rotating secrets) require a human operator with a higher-privilege role.

### 6.3 Verify Access from the VM

SSH into the VM and confirm the managed identity can authenticate and retrieve a secret:

```bash
# Login using the VM's managed identity (no credentials needed)
az login --identity

# Retrieve a secret to confirm permissions
az keyvault secret show \
  --vault-name devopssuite-kv-<suffix> \
  --name "JWT-SECRET" \
  --query value -o tsv
```

If this returns the secret value, the identity and RBAC assignment are working correctly.

> Do not log, screenshot, or save the returned value anywhere.

---

## 7. Application Integration Strategy

The application architecture (Spring Boot → Docker Compose) is kept unchanged. Secrets are injected at VM startup via a shell script that writes the `.env` file from Key Vault — this keeps the blast radius of any Key Vault integration issue contained to the startup script.

### Startup Script Pattern

```bash
#!/bin/bash
# fetch-secrets.sh — run once at VM startup or before docker compose up
set -e

VAULT="devopssuite-kv-<suffix>"

az login --identity --output none

DB_PASSWORD=$(az keyvault secret show \
  --vault-name "$VAULT" --name "DB-PASSWORD" --query value -o tsv)

JWT_SECRET=$(az keyvault secret show \
  --vault-name "$VAULT" --name "JWT-SECRET" --query value -o tsv)

MAIL_USERNAME=$(az keyvault secret show \
  --vault-name "$VAULT" --name "MAIL-USERNAME" --query value -o tsv)

MAIL_PASSWORD=$(az keyvault secret show \
  --vault-name "$VAULT" --name "MAIL-PASSWORD" --query value -o tsv)

GOOGLE_CLIENT_ID=$(az keyvault secret show \
  --vault-name "$VAULT" --name "GOOGLE-CLIENT-ID" --query value -o tsv)

GOOGLE_CLIENT_SECRET=$(az keyvault secret show \
  --vault-name "$VAULT" --name "GOOGLE-CLIENT-SECRET" --query value -o tsv)

# Write the runtime .env (chmod 600 — owner read/write only)
cat > /home/sky/DevOps-Suite/.env <<EOF
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
MAIL_USERNAME=${MAIL_USERNAME}
MAIL_PASSWORD=${MAIL_PASSWORD}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
EOF

chmod 600 /home/sky/DevOps-Suite/.env
echo "✅ Secrets loaded from Key Vault"
```

The generated `.env` is:
- Written to disk with `chmod 600` (owner-only read)
- Never committed to Git
- Re-generated fresh on every deploy, so rotated secrets are always picked up

### Deploy Flow with Key Vault

```
GitHub Actions (push to main)
        │
        ▼
  SSH into Azure VM
        │
        ▼
  ./fetch-secrets.sh        ← pulls secrets from Key Vault
        │
        ▼
  git pull origin main
        │
        ▼
  docker compose build frontend backend
        │
        ▼
  docker compose up -d --remove-orphans
```

---

## 8. Repository Hygiene

Run these searches to confirm no real secrets are committed:

```bash
git grep -n "password"
git grep -n "secret"
git grep -n "JWT"
```

Check these files specifically:
- `.env` — must not exist in the repo (covered by `.gitignore`)
- `application.properties` / `application.yml` — should reference `${ENV_VAR}`, not hardcoded values
- `docker-compose.yml` — should use `${VARIABLE:-}` syntax, no literals

The repository should contain only `.env.example` with empty placeholders:

```dotenv
DB_PASSWORD=
JWT_SECRET=
MAIL_USERNAME=
MAIL_PASSWORD=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 9. Security Properties

| Property | Implementation |
|---|---|
| **Secrets storage** | Azure Key Vault — encrypted at rest (AES-256), TLS in transit |
| **Authentication** | VM System-Assigned Managed Identity — no stored credentials |
| **Authorization** | Azure RBAC — `Key Vault Secrets User` role (read-only) |
| **Principle of least privilege** | VM can only `get` secrets; cannot create, update, or delete |
| **Audit trail** | Key Vault diagnostic logs record every secret access with timestamp and identity |
| **Secret rotation** | Update value in Key Vault → re-run startup script → redeploy; no code changes required |
| **No credentials in code** | Spring Boot reads from environment variables injected by Docker Compose |
| **No credentials in Git** | `.env` is in `.gitignore`; `.env.example` has empty placeholders only |
| **No credentials in CI logs** | GitHub Actions secrets (`AZURE_VM_SSH_KEY` etc.) are masked in logs |

---

## 10. Completion Criteria

> "Sensitive application secrets are stored in Azure Key Vault and accessed by the Azure VM using managed identity instead of hard-coded credentials."

- ✅ Key Vault created in the same region as the VM
- ✅ All sensitive secrets added to Key Vault (DB, JWT, SMTP, OAuth2)
- ✅ System-assigned managed identity enabled on the VM
- ✅ VM identity assigned `Key Vault Secrets User` role (least privilege)
- ✅ VM can retrieve secrets via `az login --identity` (verified via CLI)
- ✅ Startup script writes `.env` from Key Vault before `docker compose up`
- ✅ No plaintext secrets in the repository, Docker images, or CI logs
- ✅ `.env` excluded from Git via `.gitignore`
