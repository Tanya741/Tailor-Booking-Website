FROM node:20-bullseye as builder

WORKDIR /app

# Copy only package.json + lock file first
COPY package*.json ./

# Install all dependencies including Vite & Rollup at once
RUN npm install --legacy-peer-deps \
    && npm install @rollup/rollup-linux-x64-gnu --save-dev \
    && npm install vite --save-dev

# Copy the rest of the source
COPY . .

# Create a .env file with the build-time environment variable
ARG VITE_API_BASE
ENV VITE_API_BASE=${VITE_API_BASE:-https://tailor-booking-website.onrender.com}

# Expose Vite dev server port
EXPOSE 5173

# Use an environment variable to determine whether to run dev or build
ENV NODE_ENV=development
CMD ["npm", "run", "dev", "--", "--host"]