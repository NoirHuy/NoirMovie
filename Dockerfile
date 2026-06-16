# Step 1: Build the React app
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build the application
COPY . .
RUN npm run build

# Step 2: Serve the app using Nginx
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy build artifacts to nginx public folder from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 7860 (Hugging Face Spaces default port)
EXPOSE 7860

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
