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

### 4. Status Dropdowns / Properties
Add an inline status dropdown to every task card and table row, matching the behavior of tools like Trello, Jira, Notion, and Asana.
- Backend: Ensure task status field supports all required states; expose PATCH endpoint for status-only updates
- Frontend: Clickable status badge on each card that opens a dropdown to change status without opening the full task detail view

### 5. Context / Right-Click Menus
Support right-clicking a task card to reveal quick actions: move to column, duplicate, archive/delete.
- Frontend: Attach a context menu to each card (onContextMenu); actions dispatch the appropriate API calls (move, duplicate, archive)

### 6. Keyboard Shortcuts
Add keyboard shortcuts for common task board actions (e.g., press `M` to move a card, `E` to edit, `D` to set due date).
- Frontend: Global keydown listener scoped to the focused card; show a shortcuts reference modal (e.g., `?` to open)

### 7. Command Palette
Add a Cmd+K / Ctrl+K command palette for quick navigation and actions across the board (create task, search, change status, move card).
- Frontend: Floating palette overlay triggered by Ctrl+K; fuzzy-search over tasks, columns, and actions; executes the selected command

### 8. Automated Rules & Triggers
Allow users to configure automation rules on a board (e.g., "When due date arrives → set status to In Progress", "When card moved to Done → notify assignee").
- Backend: `automation_rules` table (trigger type, condition, action); rule evaluation service triggered by task events
- Frontend: Automation settings panel per board; UI to create/edit/delete rules with trigger + action selectors

### 9. Git / PR Integration
Link a GitHub/GitLab repository to a project board so that PR and commit activity automatically updates task status or posts a comment.
- Backend: Webhook receiver endpoint for GitHub/GitLab events; map branch names or PR titles to task IDs; update task status or add activity log entry on matching events
- Frontend: Repository link settings per project; display linked PR/commit references on task cards

## Kanban Dashboard Enhancements

### 10. Delete Task
Add a delete option directly on task cards in the Kanban board so users can remove a task without opening the detail view.
- Backend: Confirm `DELETE /api/projects/{projectId}/tasks/{taskId}` endpoint exists and is properly secured (OWNER/ADMIN/MEMBER only)
- Frontend: Add a delete icon/button on each card (visible on hover); show a confirmation dialog before firing the delete request; remove the card from the board state on success

### 11. Task Metadata — Created At, Last Modified, Creator & Last Modified By
Display audit information on each task so users can see when it was created, when it was last changed, and who made those changes.
- Backend:
  - Ensure `Task` entity has `createdAt`, `updatedAt` (JPA `@CreationTimestamp` / `@UpdateTimestamp`) and `createdBy`, `lastModifiedBy` fields (Spring Data Auditing or manual population in the service layer)
  - Include these fields in the task response DTO
- Frontend:
  - Show "Created by \<user\> on \<date\>" and "Last modified by \<user\> on \<date\>" inside the task detail modal/drawer
  - Optionally show a compact "Created \<relative time\>" tooltip on the card itself (e.g., "Created 2 days ago")

## UI Theme

### 12. Dark Mode
First, ensure the entire UI is fully polished in light mode. Once light mode is stable, add a toggle to switch the whole app to dark mode.
- Phase 1 — Light mode: Audit all pages and components to make sure they look consistent and complete in light mode; fix any unstyled or broken elements
- Phase 2 — Dark mode toggle:
  - Frontend: Add a theme toggle button (e.g., sun/moon icon in the navbar); persist the user's preference in `localStorage`
  - Use Tailwind's `dark:` variant (enable `darkMode: 'class'` in `tailwind.config.js`) so a single class on `<html>` flips the entire app
  - This includes the Monaco code editor — switch its theme between a light variant (e.g., `vs`) and a dark variant (e.g., `vs-dark`) based on the selected mode

### 13. Responsive Design
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

## Task Assignment & Visibility

### 14. Task Assignment — Assigned To / Assigned By
Show who a task is assigned to and who assigned it. Apply role-based visibility so members only see their own tasks while project admins have full visibility.
- Backend:
  - Ensure `Task` entity has both `assignedTo` (the member doing the work) and `assignedBy` (the member who made the assignment) fields, populated in the service layer on create/update
  - Include both fields in the task response DTO
  - Enforce visibility in the query layer: if the requesting user is the project OWNER or the user who created the project, return all tasks; otherwise return only tasks where `assignedTo` matches the requesting user
- Frontend:
  - Display "Assigned to \<user\>" and "Assigned by \<user\>" on the task card and in the task detail modal
  - Project admin/owner view: shows all tasks across all members with full assignment info
  - Member view: Kanban board only renders tasks assigned to the logged-in user; tasks assigned to others are hidden

## Project Member Management

### 15. Change Member Role & Remove Member
- **Admin** can change the role of MEMBER-level users (promote/demote between MEMBER and ADMIN) but **cannot remove members**.
- **Owner** can do everything: change any member's role and remove any member (except themselves).
- Backend:
  - Add a `PATCH /api/projects/{projectId}/members/{userId}/role` endpoint that accepts a `role` body (`MEMBER` or `ADMIN`)
  - Restrict role changes: OWNER can change any member's role; ADMIN can only change roles of users with role MEMBER (not other ADMINs or the OWNER); return `403 Forbidden` otherwise
  - Restrict member removal (`DELETE /api/projects/{projectId}/members/{userId}`) to OWNER only; return `403 Forbidden` for ADMIN or below
  - Update the member's role in the `project_members` (or equivalent) join table
- Frontend:
  - In the project members list, show a role badge/dropdown next to each member
  - OWNER sees the role dropdown and a "Remove" button for every member except themselves
  - ADMIN sees the role dropdown only for MEMBER-level users (no dropdown for other ADMINs or the OWNER); no "Remove" button at all
  - Non-owner/non-admin users see a read-only role label with no controls
