# TODO

## Profile Page Enhancements

### 1. Code Run Activity Graph
Replace the current "Activity & Statistics" content area (stats cards + recent executions table) with a GitHub/LeetCode-style activity heatmap showing daily code run counts over the past year.
- Backend: API endpoint to return daily execution counts per user (grouped by date)
- Frontend: Render a 52-week calendar grid (similar to GitHub contributions graph) using the execution data

### 2. Follow / Following System
Add the ability for users to follow each other.
- Backend: `user_follows` join table, follow/unfollow endpoints, follower/following count APIs
- Frontend: Follow button on profile page (toggle follow/unfollow), display follower count and following count on the profile

### 3. Profile View Count
Track and display how many times a user's profile has been viewed.
- Backend: Increment view count on every `GET /api/auth/users/:id` (or equivalent public profile endpoint), store count in DB
- Frontend: Display view count on the profile page

## UI Theme

### 4. Dark Mode
First, ensure the entire UI is fully polished in light mode. Once light mode is stable, add a toggle to switch the whole app to dark mode.
- Phase 1 — Light mode: Audit all pages and components to make sure they look consistent and complete in light mode; fix any unstyled or broken elements
- Phase 2 — Dark mode toggle:
  - Frontend: Add a theme toggle button (e.g., sun/moon icon in the navbar); persist the user's preference in `localStorage`
  - Use Tailwind's `dark:` variant (enable `darkMode: 'class'` in `tailwind.config.js`) so a single class on `<html>` flips the entire app
  - This includes the Monaco code editor — switch its theme between a light variant (e.g., `vs`) and a dark variant (e.g., `vs-dark`) based on the selected mode

### 5. Responsive Design
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
