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

## Task Board Enhancements

### 4. Keyboard Shortcuts
Add keyboard shortcuts for common task board actions (e.g., press `M` to move a card, `E` to edit, `D` to set due date).
- Frontend: Global keydown listener scoped to the focused card; show a shortcuts reference modal (e.g., `?` to open)

### 5. Command Palette
Add a Cmd+K / Ctrl+K command palette for quick navigation and actions across the board (create task, search, change status, move card).
- Frontend: Floating palette overlay triggered by Ctrl+K; fuzzy-search over tasks, columns, and actions; executes the selected command

### 6. Automated Rules & Triggers
Allow users to configure automation rules on a board (e.g., "When due date arrives → set status to In Progress", "When card moved to Done → notify assignee").
- Backend: `automation_rules` table (trigger type, condition, action); rule evaluation service triggered by task events
- Frontend: Automation settings panel per board; UI to create/edit/delete rules with trigger + action selectors

### 7. Git / PR Integration
Link a GitHub/GitLab repository to a project board so that PR and commit activity automatically updates task status or posts a comment.
- Backend: Webhook receiver endpoint for GitHub/GitLab events; map branch names or PR titles to task IDs; update task status or add activity log entry on matching events
- Frontend: Repository link settings per project; display linked PR/commit references on task cards

## UI Theme

### 8. Dark Mode
First, ensure the entire UI is fully polished in light mode. Once light mode is stable, add a toggle to switch the whole app to dark mode.
- Phase 1 — Light mode: Audit all pages and components to make sure they look consistent and complete in light mode; fix any unstyled or broken elements
- Phase 2 — Dark mode toggle:
  - Frontend: Add a theme toggle button (e.g., sun/moon icon in the navbar); persist the user's preference in `localStorage`
  - Use Tailwind's `dark:` variant (enable `darkMode: 'class'` in `tailwind.config.js`) so a single class on `<html>` flips the entire app
  - This includes the Monaco code editor — switch its theme between a light variant (e.g., `vs`) and a dark variant (e.g., `vs-dark`) based on the selected mode

### 9. Responsive Design
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
