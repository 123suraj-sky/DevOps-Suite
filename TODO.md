# TODO

## UI Theme

### 1. Dark Mode
First, ensure the entire UI is fully polished in light mode. Once light mode is stable, add a toggle to switch the whole app to dark mode.
- Phase 1 — Light mode: Audit all pages and components to make sure they look consistent and complete in light mode; fix any unstyled or broken elements
- Phase 2 — Dark mode toggle:
  - Frontend: Add a theme toggle button (e.g., sun/moon icon in the navbar); persist the user's preference in `localStorage`
  - Use Tailwind's `dark:` variant (enable `darkMode: 'class'` in `tailwind.config.js`) so a single class on `<html>` flips the entire app
  - This includes the Monaco code editor — switch its theme between a light variant (e.g., `vs`) and a dark variant (e.g., `vs-dark`) based on the selected mode

### 2. Responsive Design
Make the entire website fully responsive so it works well on mobile, tablet, and desktop screen sizes.
- Audit all pages and components for fixed widths, overflow issues, and desktop-only layouts
- Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) to adapt layouts at each breakpoint
- Key areas to address:
  - Navbar: collapse into a hamburger menu on small screens
  - Kanban board: horizontal scroll on mobile with readable card sizes
  - Task detail modal/drawer: full-screen on mobile
  - Code editor page: stack the editor and output panels vertically on small screens
  - Metrics/Logs pages: make charts and tables scrollable or reflowed for narrow viewports
  - Profile page: single-column layout on mobile

## Admin Pannel

Here's a comprehensive status overview based on your planning documents:

---

## Project Status: ~90% Complete

The project is officially in the **manual testing & bug-fixing phase**. Most core features are done. Here's what's left:

---

## **Backend — Open Items**

|S. No.| Task | Priority | Notes |
|---|---|---|---|
|1| CI/CD Pipeline (GitHub Actions) | Medium | No workflow files yet. Needs build, test, Docker image build+push |
|3| Reset Password flow | Low-Medium | `POST /api/auth/forgot-password` + `/reset-password` with time-limited token. Needs SMTP configured first |
|4| Migrate PostgreSQL to Neon | Low | Optional — replace self-hosted Postgres with Neon serverless |
|5| Kubernetes / Helm chart | Low | Not started |
|6| Multi-stage Docker build for production frontend (Nginx) | Low | Not done |
|7| End-to-end Cypress tests | Low | `/cypress` directory exists but tests not written |

## **Frontend — Open Items**

|S. No.| Task | Priority | Notes |
|---|---|---|---|
|1| Full integration test with live backend | High | Pages are scaffolded; all API calls need verification against running backend |
|2| WebSocket live integration testing | Medium | Config and topics exist; end-to-end not verified |

