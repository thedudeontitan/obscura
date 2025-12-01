FROM node:20-alpine

# Create app directory
WORKDIR /app

# Enable corepack and prepare pnpm (matches packageManager in package.json)
RUN corepack enable && corepack prepare pnpm@10.11.1 --activate

# Install production dependencies first (better layer caching)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod

# Bundle app source
COPY src ./src

# Ensure a logs directory exists for Winston file transport
RUN mkdir -p logs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start the unlinker backend
CMD ["pnpm", "start"]


