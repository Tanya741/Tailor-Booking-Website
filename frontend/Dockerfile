FROM node:20-bullseye

WORKDIR /app

# Copy only package.json + lock file first
COPY package*.json ./

# Install all dependencies including Vite & Rollup at once
RUN npm install --legacy-peer-deps \
    && npm install @rollup/rollup-linux-x64-gnu --save-dev \
    && npm install vite --save-dev

# Copy the rest of the source
COPY . .

# Expose Vite dev server port
EXPOSE 5173

CMD ["npm", "run", "dev"]