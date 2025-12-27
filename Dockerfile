# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies (including dev dependencies for building)
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from build stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# Create directories for persistent data
RUN mkdir -p /app/db

# Expose the port the app runs on
EXPOSE 3000

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Start the application
CMD ["node", "server/index.js"]