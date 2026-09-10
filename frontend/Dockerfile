# ─── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN CYPRESS_INSTALL_BINARY=0 npm install --legacy-peer-deps

# Copy source and build static assets
# Pass empty API URLs so the built bundle uses relative paths (/api, /ws).
# The nginx reverse-proxy in this same image forwards /api/ and /ws/ to the
# backend container, so no absolute localhost URL is ever baked in.
COPY . .
RUN VITE_API_URL="" VITE_WS_URL="" npm run build

# ─── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM nginx:alpine

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom Nginx config for routing and proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
