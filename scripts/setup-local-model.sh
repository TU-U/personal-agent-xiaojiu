#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .local-model
if [ ! -x .local-model/llama-b10964/llama-server ]; then
  curl -fL --retry 3 --max-time 180 'https://github.com/ggml-org/llama.cpp/releases/download/b10964/llama-b10964-bin-ubuntu-x64.tar.gz' -o .local-model/llama.tar.gz
  echo '9abf88aea48a55d0f80edb1ee20220b186848cca0b4e919d71518cfd7ca67443  .local-model/llama.tar.gz' | sha256sum -c -
  tar -xzf .local-model/llama.tar.gz -C .local-model
fi
python3 scripts/download-model-1.5b.py
echo '本地模型准备完成。运行 bash scripts/start.sh 启动。'
