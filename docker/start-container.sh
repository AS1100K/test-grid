#!/bin/bash
set -euo pipefail

cd /app/backend

MAX_MYSQL_WAIT_ITERATIONS=120

require_runtime_secret() {
  local var_name="$1"
  local value="${!var_name:-}"
  if [[ -z "${value}" || "${value}" == change-this-* ]]; then
    echo "Set a strong value for ${var_name} before starting the container."
    exit 1
  fi
}

require_runtime_secret MYSQL_ROOT_PASSWORD
require_runtime_secret MYSQL_PASSWORD
require_runtime_secret DB_PASSWORD
require_runtime_secret JWT_SECRET

mysql_ready() {
  mysqladmin ping \
    -h 127.0.0.1 \
    -u"${DB_USER}" \
    -p"${DB_PASSWORD}" \
    --silent >/dev/null 2>&1
}

term_handler() {
  if [[ -n "${app_pid:-}" ]]; then
    kill "${app_pid}" 2>/dev/null || true
  fi
  if [[ -n "${mysql_pid:-}" ]]; then
    kill "${mysql_pid}" 2>/dev/null || true
  fi
}

trap term_handler SIGTERM SIGINT

/usr/local/bin/docker-entrypoint.sh mysqld &
mysql_pid=$!

for _ in $(seq 1 "${MAX_MYSQL_WAIT_ITERATIONS}"); do
  if mysql_ready; then
    break
  fi
  sleep 2
done

if ! mysql_ready; then
  echo "MySQL did not become ready in time."
  exit 1
fi

node ./create_default_user.js
node ./server.js &
app_pid=$!

# Exit the container if either MySQL or the Node app exits.
wait -n "${mysql_pid}" "${app_pid}"
