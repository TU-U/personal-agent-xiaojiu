#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
runtime="$PWD/.local-runtime/redis"
queue_data="${QUEUE_DATA_DIR:-$PWD/.data/redis}"
mkdir -p "$queue_data"
chmod 700 "$queue_data"
if command -v redis-server >/dev/null 2>&1; then
  redis_bin="$(command -v redis-server)"
else
  redis_bin="$runtime/usr/bin/redis-server"
  export LD_LIBRARY_PATH="$runtime/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi
if [[ ! -x "$redis_bin" ]]; then
  echo 'Redis 未安装，请先安装 redis-server 或恢复项目 .local-runtime/redis。' >&2
  exit 1
fi
# Dedicated local queue instance; never evict unfinished jobs as cache entries.
exec "$redis_bin" --bind 127.0.0.1 --protected-mode yes --port "${REDIS_PORT:-6381}" \
  --dir "$queue_data" --appendonly yes --appendfsync everysec \
  --maxmemory 256mb --maxmemory-policy noeviction --save '' --daemonize no
