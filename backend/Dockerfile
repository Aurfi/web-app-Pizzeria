FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Install all dependencies (including dev) to build TypeScript
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache tini

COPY --from=builder /app/package*.json ./
# Install only production dependencies for runtime image
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db ./src/db

ENV NODE_ENV=production

EXPOSE 3001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/src/index.js"]
