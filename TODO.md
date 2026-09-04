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
