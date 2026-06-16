# Step 1: Build Frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app/frontend
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Build & Run Backend
FROM node:20-alpine
WORKDIR /app

# Copy server package files and install dependencies
COPY server/package*.json ./server/
RUN cd server && npm install

# Copy server source code
COPY server/ ./server/

# Copy built frontend assets to server dist folder
COPY --from=build-frontend /app/frontend/dist ./server/dist

# Expose port 7860 for Hugging Face Spaces
EXPOSE 7860

# Set environment variables
ENV NODE_ENV=production
ENV PORT=7860

# Run the backend server
WORKDIR /app/server
CMD ["node", "index.js"]
