#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then
  if [ -s "$HOME/.nvm/nvm.sh" ]; then source "$HOME/.nvm/nvm.sh"; fi
fi
if ! command -v node >/dev/null 2>&1; then echo '需要 Node.js 24 或更新版本。'; exit 1; fi
if [ ! -f contracts/openapi.json ] || [ ! -f contracts/generated/routes.mjs ]; then
  echo '缺少协议 Submodule，请按 docs/26-contract-governance-implementation.md 初始化 contracts 后再启动。'; exit 1
fi
if [ ! -d node_modules ]; then npm ci; fi
if [ ! -f dist/index.html ]; then npm run build; fi
node scripts/ensure-queue.mjs || true
source scripts/start-retrieval.sh
if curl -fsS --max-time 2 http://127.0.0.1:4317/api/health >/dev/null 2>&1; then
  echo '拾光已经运行，请打开 http://localhost:4317'; exit 0
fi
model_path='.local-model/qwen2.5-1.5b-instruct-q4_k_m.gguf'
model_pid=''
if [ ! -f server/ai/provider.local.mjs ] && [ -f "$model_path" ] && [ -x .local-model/llama-b10964/llama-server ] && [ "$(stat -c%s "$model_path")" = '1117320736' ]; then
  mkdir -p .data artifacts
  if [ ! -f .data/local-model-key ]; then node -e "require('fs').writeFileSync('.data/local-model-key',require('crypto').randomBytes(32).toString('hex'),{mode:0o600})"; fi
  if ! curl -fsS --max-time 2 http://127.0.0.1:4318/health >/dev/null 2>&1; then
    .local-model/llama-b10964/llama-server --model "$model_path" --host 127.0.0.1 --port 4318 --ctx-size 8192 --threads 6 --parallel 1 --alias qwen2.5-1.5b-instruct --api-key-file .data/local-model-key --no-webui > artifacts/local-model.log 2>&1 &
    model_pid=$!
  fi
  export LLM_BASE_URL='http://127.0.0.1:4318/v1'
  export LLM_MODEL='qwen2.5-1.5b-instruct'
  export LLM_API_KEY="$(cat .data/local-model-key)"
fi
trap 'if [ -n "$model_pid" ]; then kill "$model_pid" 2>/dev/null || true; fi' EXIT INT TERM
server_log_dir="${DATA_DIR:-.data}/logs"
mkdir -p "$server_log_dir"
node server/index.mjs 2>&1 | tee -a "$server_log_dir/server.log"
