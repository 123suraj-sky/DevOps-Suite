# Security Policy

## Supported Versions

Security fixes are applied to the current version on the default branch. Older snapshots are not guaranteed to receive security updates.

## Reporting a Vulnerability

Please do not open a public issue for a suspected security vulnerability. Report it privately to the project maintainers with:

- A clear description of the vulnerability and its impact
- The affected component, endpoint, or configuration
- Reproduction steps or a proof of concept, where safe to provide
- Any suggested mitigation

The maintainers will acknowledge the report, investigate it, and coordinate disclosure after a fix or mitigation is available. Do not include real credentials, tokens, or other sensitive production data in a report.

## Security Controls

DevOps Suite uses the following security measures:

- JWT access and refresh tokens, with Redis-backed token revocation on logout
- BCrypt password hashing and password complexity validation
- Role-based access control with global `ROLE_ADMIN` and `ROLE_MEMBER` authorities
- Project-scoped membership roles of `OWNER`, `ADMIN`, and `MEMBER`
- JWT authentication for REST APIs and STOMP/WebSocket connections
- Redis sliding-window rate limiting for authentication, code execution, and general API requests
- Docker-isolated code execution with no network access, read-only filesystems, dropped capabilities, resource limits, and execution timeouts
- Environment-based secret configuration; secrets must not be hardcoded or committed
- Security headers including HSTS, `X-Content-Type-Options`, `X-Frame-Options`, and Content Security Policy
- Network isolation for application and observability services
- Audit and request logging with trace correlation

## Deployment Requirements

Before deploying outside local development:

1. Set all secrets and passwords through environment variables or a secret manager.
2. Replace the development admin seed credentials with unique credentials, or disable the seed account entirely.
3. Use HTTPS and configure the production frontend and OAuth redirect URLs correctly.
4. Keep Docker socket access out of the application container in production.
5. Restrict Grafana, Kibana, Actuator, database, Redis, Elasticsearch, and Prometheus access to trusted networks.
6. Review rate limits, log retention, dependency updates, and backup procedures for the target environment.

## Local Development Warning

The repository documents development-only default admin seed credentials. These credentials must never be used in production and must be overridden before starting a deployed environment.

For the complete implementation details, see [`docs/06-security-design.md`](docs/06-security-design.md).
