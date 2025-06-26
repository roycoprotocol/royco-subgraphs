# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    bash \
    curl

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Envio code first (this creates the 'generated' module)
# Use yes command to automatically answer prompts
RUN yes | pnpm run codegen

# Then build the application
RUN pnpm run build

# Create non-root user for security
RUN addgroup -g 1001 -S envio && \
    adduser -S envio -u 1001 -G envio

# Change ownership of the app directory
RUN chown -R envio:envio /app

# Switch to non-root user
USER envio

# Expose port 8081 for potential web interface
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1

# Start the indexer using pnpm
CMD ["pnpm", "start"]