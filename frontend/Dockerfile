# ======================================================
# Stage 1 - Build the React application
# ======================================================

# Use the Node.js 22 LTS Alpine image.
# This stage contains everything needed to install
# dependencies and build the application.
FROM node:22-alpine AS builder

# Set the working directory inside the container.
WORKDIR /app

# Copy only the dependency files first.
# This allows Docker to cache dependency installation
# unless package.json or pnpm-lock.yaml changes.
COPY package.json pnpm-lock.yaml ./

# Enable Corepack.
# Corepack automatically installs the pnpm version
# specified in package.json's "packageManager" field.
RUN corepack enable

# Install dependencies exactly as specified by the lockfile.
# This guarantees reproducible builds.
RUN pnpm install --frozen-lockfile

# Copy the remainder of the application.
COPY . .

# Build the production application.
RUN pnpm build

# ======================================================
# Stage 2 - Production image
# ======================================================

# Use a lightweight Nginx image to serve the built files.
FROM nginx:alpine

# Copy the compiled application from the builder stage.
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace the default Nginx configuration.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Document that the container listens on port 80.
EXPOSE 80

# Run Nginx in the foreground.
CMD ["nginx", "-g", "daemon off;"]
