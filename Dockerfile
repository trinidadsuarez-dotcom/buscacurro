# Multi-stage Dockerfile for Easypanel Deployment
# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency configuration
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy the entire codebase
COPY . .

# Build static client assets and compile backend server to CommonJS
RUN npm run build

# Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy dependency configuration for production install
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled files and build artifacts
COPY --from=builder /app/dist ./dist

# Create a placeholder db.json in case local DB is used as fallback
RUN echo '{"users":[],"jobs":[],"applications":[],"notifications":[]}' > /app/db.json && chmod 666 /app/db.json

# Expose the standard external port
EXPOSE 3000

# Start Express server CJS bundle
CMD ["npm", "start"]
