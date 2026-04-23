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
    --silent >/dev/null 2>&1
}

term_handler() {
  if [[ -n "${app_pid:-}" ]]; then
    kill -TERM "${app_pid}" 2>/dev/null || true
  fi
  if [[ -n "${mysql_pid:-}" ]]; then
    kill -TERM "${mysql_pid}" 2>/dev/null || true
  fi
}

trap term_handler SIGTERM SIGINT

/usr/local/bin/docker-entrypoint.sh mysqld &
mysql_pid=$!

for ((i = 1; i <= MAX_MYSQL_WAIT_ITERATIONS; i++)); do
  if mysql_ready; then
    break
  fi
  sleep 1
done

if ! mysql_ready; then
  echo "MySQL did not become ready in time."
  exit 1
fi

gosu mysql node ./create_default_user.js
gosu mysql node ./server.js &
app_pid=$!

# Exit the container if either MySQL or the Node app exits.
set +e
wait -n "${mysql_pid}" "${app_pid}"
exit_code=$?
set -e

if ! kill -0 "${mysql_pid}" 2>/dev/null; then
  echo "MySQL exited."
fi

if ! kill -0 "${app_pid}" 2>/dev/null; then
  echo "Application server exited."
fi

term_handler

if kill -0 "${mysql_pid}" 2>/dev/null; then
  wait "${mysql_pid}" 2>/dev/null || true
fi

if kill -0 "${app_pid}" 2>/dev/null; then
  wait "${app_pid}" 2>/dev/null || true
fi

exit "${exit_code}"
