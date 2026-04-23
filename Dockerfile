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

FROM node:24-bookworm-slim AS node-runtime

FROM mysql:8.4 AS runtime

ENV NODE_ENV=production
ENV MYSQL_ROOT_PASSWORD=root
ENV MYSQL_DATABASE=test_grid
ENV MYSQL_USER=user
ENV MYSQL_PASSWORD=password
ENV DB_HOST=127.0.0.1
ENV DB_NAME=test_grid
ENV DB_USER=user
ENV DB_PASSWORD=password
ENV PORT=5000
ENV JWT_SECRET=change-me

WORKDIR /app/backend

COPY --from=node-runtime /usr/local/ /usr/local/
COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist ./public
COPY docker/mysql/init.sql /docker-entrypoint-initdb.d/00-init.sql
COPY docker/start-container.sh /usr/local/bin/start-container.sh

RUN chmod +x /usr/local/bin/start-container.sh

EXPOSE 3306
EXPOSE 5000

ENTRYPOINT ["/usr/local/bin/start-container.sh"]
