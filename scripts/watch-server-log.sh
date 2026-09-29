#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
log_dir="${DATA_DIR:-.data}/logs"
mkdir -p "$log_dir"
touch "$log_dir/server.log"
echo "正在查看后端日志：$log_dir/server.log（Ctrl+C 退出查看，不会停止服务）"
tail -n 100 -F "$log_dir/server.log"
