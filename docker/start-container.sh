#!/bin/bash
set -euo pipefail

cd /app/backend

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

for _ in $(seq 1 120); do
  if mysql_ready; then
    break
  fi
  sleep 2
done

if ! mysql_ready; then
  echo "MySQL did not become ready in time."
  exit 1
fi

node ./scripts/create_default_user.js
node ./bin/www &
app_pid=$!

wait -n "${mysql_pid}" "${app_pid}"
