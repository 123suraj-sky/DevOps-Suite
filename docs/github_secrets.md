# Walkthrough — CI/CD Pipeline Setup

I have configured a basic GitHub Actions CI/CD workflow to test the application code and deploy it to your Azure VM using Docker Compose.

## Changes Made

### GitHub Actions Workflow
- **Created** [.github/workflows/deploy.yml](file:///d:/Projects/DevOps%20Suite/.github/workflows/deploy.yml): A workflow with jobs to build/test the Spring Boot backend (JDK 21), build the React frontend, and deploy to the Azure VM via SSH.

---

## Validation & Verification

1. **Compilation Check:** Verified that the backend code compiles successfully using Maven:
   ```bash
   mvn clean compile
   ```
   Output: `BUILD SUCCESS`.
2. **Workflow Check:** The workflow configuration uses standard GitHub Actions modules for Java, Node.js, and SSH connection, checking out source directories appropriately.

## Setup Action Items for You

To enable deployment, configure these secrets in your GitHub repository:
- `AZURE_VM_IP`: `20.235.240.81`
- `AZURE_VM_SSH_KEY`: The private key (`vm-devopssuite_key.pem`)
- `AZURE_VM_USER`: `sky`
