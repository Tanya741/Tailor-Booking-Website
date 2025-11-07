# Multi-stage Dockerfile for both development and production
FROM node:20-bullseye as base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps \
    && npm install @rollup/rollup-linux-x64-gnu --save-dev \
    && npm install vite --save-dev

# Copy source code
COPY . .

# Accept build arguments for environment configuration
ARG NODE_ENV=development
ARG VITE_API_BASE=http://localhost:8000

# Set environment variables
ENV NODE_ENV=${NODE_ENV}
ENV VITE_API_BASE=${VITE_API_BASE}

# Development stage
FROM base as development
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# Production build stage
FROM base as build
RUN npm run build

# Production serve stage
FROM nginx:alpine as production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]