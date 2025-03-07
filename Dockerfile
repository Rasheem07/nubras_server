# Use Node.js image
FROM node:18-alpine

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package.json and lock file
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the entire project
COPY . .

# Build the NestJS app
RUN pnpm run build

# Expose the port (only inside Docker network)
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]
