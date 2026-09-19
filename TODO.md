# TODO

## UI Theme

### 1. Responsive Design
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


