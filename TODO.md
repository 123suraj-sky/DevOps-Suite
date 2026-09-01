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
