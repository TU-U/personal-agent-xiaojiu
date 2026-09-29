#!/usr/bin/env bash
# Called from start.sh in the project root. All services bind to loopback.
mkdir -p .data/logs .data/qdrant
if [ -x .local-model/qdrant/qdrant ] && [ -f .local-model/bge-m3-Q4_K_M.gguf ]; then
  if ! curl -fsS --max-time 2 http://127.0.0.1:6333/healthz >/dev/null 2>&1; then
    QDRANT__SERVICE__HOST=127.0.0.1 QDRANT__STORAGE__STORAGE_PATH=.data/qdrant QDRANT__TELEMETRY_DISABLED=true nohup .local-model/qdrant/qdrant >> .data/logs/qdrant.log 2>&1 &
  fi
  if ! curl -fsS --max-time 2 http://127.0.0.1:4319/health >/dev/null 2>&1; then
    nohup .local-model/llama-b10964/llama-server --model .local-model/bge-m3-Q4_K_M.gguf --host 127.0.0.1 --port 4319 --embedding --pooling cls --ctx-size 4096 --batch-size 4096 --ubatch-size 4096 --threads 4 --parallel 1 --alias bge-m3 --no-webui >> .data/logs/embedding.log 2>&1 &
  fi
  export QDRANT_URL="${QDRANT_URL:-http://127.0.0.1:6333}"
  export EMBEDDING_BASE_URL="${EMBEDDING_BASE_URL:-http://127.0.0.1:4319/v1}"
  export EMBEDDING_MODEL="${EMBEDDING_MODEL:-bge-m3}"
fi

node scripts/embedding/start-if-active.mjs
