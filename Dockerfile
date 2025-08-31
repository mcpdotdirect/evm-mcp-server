# Use Bun as the base image (preferred runtime according to README)
FROM oven/bun:1.1.29-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy source code
COPY . .

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S evm-mcp -u 1001

# Change ownership of the app directory
RUN chown -R evm-mcp:nodejs /app
USER evm-mcp

# Expose the HTTP server port (default: 3001)
EXPOSE 3001

# Health check for HTTP server
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/ || exit 1

# Run in HTTP mode only
CMD ["bun", "start:http"]

# Multi-stage build for production optimization
FROM base AS production

# Labels for better container management
LABEL maintainer="EVM MCP Server"
LABEL description="HTTP MCP Server for EVM blockchain interactions"
LABEL version="1.0.0"

# Environment variables for HTTP server configuration
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0