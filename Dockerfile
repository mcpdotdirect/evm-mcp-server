# Use Bun as the base image (preferred runtime according to README)
FROM oven/bun:1.1.29-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json bun.lockb* ./

# Install dependencies (including dev dependencies for TypeScript compilation)
RUN bun install --frozen-lockfile

# Install curl for health checks
RUN apk add --no-cache curl

# Copy source code
COPY . .

# Build the project for production
RUN bun run build && bun run build:http

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S evm-mcp -u 1001

# Change ownership of the app directory
RUN chown -R evm-mcp:nodejs /app
USER evm-mcp

# Expose the HTTP server port (default: 3000)
EXPOSE 3000

# Health check for HTTP server with streaming endpoints
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Run the HTTP server with streaming support
CMD ["bun", "start:http"]

# Multi-stage build for production optimization
FROM base AS production

# Labels for better container management
LABEL maintainer="EVM MCP Server"
LABEL description="HTTP MCP Server for EVM blockchain interactions with streaming support"
LABEL version="1.0.0"

# Environment variables for HTTP server configuration
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0