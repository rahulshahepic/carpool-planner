# --- Build client ---
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- Build server ---
FROM node:20-alpine AS server-build
RUN apk add --no-cache python3 make g++
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# --- Production ---
FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY server/package*.json ./
RUN npm ci --production && apk del python3 make g++

COPY --from=server-build /app/server/dist ./dist
COPY --from=client-build /app/client/dist ./public

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/data/carpool.db

# Persistent volume for SQLite database
# Mount a volume at /data so the DB survives container redeployments
# e.g. docker run -v carpool-data:/data ...
# or use Cloud Run volume mounts with a GCS bucket / persistent disk
VOLUME ["/data"]

EXPOSE 8080

CMD ["node", "dist/index.js"]
