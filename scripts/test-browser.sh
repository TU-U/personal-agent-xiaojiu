#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Optional unprivileged Playwright runtime installed in this workspace's WSL environment.
if [ -d "$HOME/.cache/shiguang/lib/usr/lib/x86_64-linux-gnu" ]; then
 export LD_LIBRARY_PATH="$HOME/.cache/shiguang/lib/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi
npm run test:e2e -- "$@"
