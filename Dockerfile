FROM node:24-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ARG VITE_BACKEND_URL=""
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
RUN npm run build

FROM node:24-bookworm-slim AS backend-deps

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:24-bookworm-slim AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./

RUN npx --yes esbuild@0.25.11 bin/www --bundle --platform=node --format=cjs --minify --outfile=/app/backend-dist/server.js --external:mysql2 --external:bcrypt --external:officeparser
RUN npx --yes esbuild@0.25.11 scripts/create_default_user.js --bundle --platform=node --format=cjs --minify --outfile=/app/backend-dist/create_default_user.js --external:mysql2 --external:bcrypt --external:officeparser

FROM node:24-bookworm-slim AS node-runtime

FROM mysql:8.4 AS runtime

ENV NODE_ENV=production
ENV MYSQL_ROOT_PASSWORD=change-this-root-password
ENV MYSQL_DATABASE=test_grid
ENV MYSQL_USER=testgrid
ENV MYSQL_PASSWORD=change-this-db-password
ENV DB_HOST=127.0.0.1
ENV DB_NAME=test_grid
ENV DB_USER=testgrid
ENV DB_PASSWORD=change-this-db-password
ENV PORT=5000
ENV JWT_SECRET=change-this-jwt-secret

WORKDIR /app/backend

COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend-dist/server.js ./server.js
COPY --from=backend-builder /app/backend-dist/create_default_user.js ./create_default_user.js
COPY --from=frontend-builder /app/frontend/dist ./public
COPY docker/mysql/init.sql /docker-entrypoint-initdb.d/00-init.sql
COPY docker/start-container.sh /usr/local/bin/start-container.sh

RUN chmod +x /usr/local/bin/start-container.sh

EXPOSE 5000

ENTRYPOINT ["/usr/local/bin/start-container.sh"]
