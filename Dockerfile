# Use an official Node.js image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy only package.json and package-lock.json first to leverage Docker caching
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy the rest of the application files
COPY . .

# Expose the port your NestJS app runs on (optional)
EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]
