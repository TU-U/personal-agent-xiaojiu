@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动拾光。启动后请访问 http://localhost:4317
where wsl.exe >nul 2>nul
if %errorlevel% equ 0 (
  wsl.exe --cd "%~dp0." bash scripts/start.sh
) else (
  where node >nul 2>nul
  if errorlevel 1 (
    echo 请安装 Node.js 24 或更新版本，或使用已配置的 WSL 环境。
  ) else (
    if not exist node_modules call npm ci
    if not exist dist\index.html call npm run build
    call npm start
  )
)
pause
