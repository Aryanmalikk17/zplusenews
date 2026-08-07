# Multi-stage Docker build for zplusenews

# --- Stage 1: Build the React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
# Copy package files for caching
COPY BizzShort/client/package*.json ./
RUN npm ci
# Copy frontend source and build
COPY BizzShort/client/ ./
RUN npm run build

# --- Stage 2: Build the Production Runner ---
FROM node:20-alpine
WORKDIR /app

# Copy backend package files and install only production dependencies
COPY BizzShort/package*.json ./
RUN npm ci --only=production

# Copy backend code
COPY BizzShort/ ./

# Copy frontend static build assets from Stage 1
COPY --from=frontend-builder /app/client/dist ./client/dist

# Expose default backend port (can be overridden by PORT env variable)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Run the server
CMD ["node", "server.js"]
