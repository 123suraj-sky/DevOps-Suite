# GEMINI.md — Gemini / Antigravity Specific Rules

> **This file is for Gemini and Google Antigravity agents specifically.**
> For general project context, start with `AGENTS.md` first.

---

## 🔵 Gemini Agent Behavior Rules

### Planning Mode
- Always create an `implementation_plan.md` for tasks involving:
  - New backend modules or feature domains
  - Database schema changes (new Flyway migrations)
  - New frontend pages or major component refactors
  - Changes to security configuration
- Do **not** plan for trivial fixes (typos, minor style changes, single-method additions)

### Research Before Coding
- Before implementing any backend feature, read the corresponding doc:
  - `docs/05-lld-detailed-design.md` for package/class structure
  - `docs/04-api-design.md` for REST endpoint contracts
  - `docs/03-database-design.md` for entity/schema design
- Before implementing any frontend feature, read `docs/11-frontend-design.md`

### File Editing Preferences
- Use `multi_replace_file_content` for non-contiguous edits in the same file
- Use `replace_file_content` only for single contiguous block changes
- Always verify changes compile after backend edits: `mvn clean compile`

---

## 🛠️ Tool Usage Guidelines

### Running Commands
- **Backend (compiles + runs in Docker):** `docker-compose up -d postgres redis backend`
- **Backend rebuild after code change:** `docker-compose up -d --build backend`
- **Frontend install + run (local):** `cd frontend && npm install && npm run dev`
- **Full stack (all services):** `docker-compose up -d`
- **Stop everything:** `docker-compose down`

### When to Use Subagents
- Use `research` subagent for broad codebase surveys (e.g., "find all places where X is used")
- Use `self` subagent when running parallel independent tasks (e.g., backend + frontend changes simultaneously)

---

## 📝 Response Style Preferences

- Keep responses **concise** — no lengthy preambles
- Always provide **clickable file links** using `[filename](file:///absolute/path)` syntax
- When showing code changes, prefer **diff format** in artifacts
- After completing work, create or update `walkthrough.md` summarizing changes
- Do **not** re-summarize artifact contents in chat — just reference the artifact

---

## 🗂️ Agent Memory & Task Tracking

- **Before starting any task:** Check `.agents/TASKS.md` for current work-in-progress
- **After completing a task:** Update `.agents/TASKS.md` and `.agents/MEMORY.md` with any new decisions or discoveries
- **Persistent decisions and gotchas:** Record in `.agents/MEMORY.md` so future agents don't re-discover them

---

## 🚫 Gemini-Specific Prohibitions

- Do not use `TailwindCSS` for new components unless it is already used in the target file (frontend already uses Tailwind — maintain consistency)
- Do not propose switching to a different build tool (Maven is locked in for backend, Vite for frontend)
- Do not suggest microservice decomposition — this is intentionally a monolith
- Do not use `cd` in proposed shell commands — use full paths or the `Cwd` parameter instead
