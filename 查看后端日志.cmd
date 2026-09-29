@echo off
chcp 65001 >nul
cd /d "%~dp0"
where wsl.exe >nul 2>nul
if %errorlevel% equ 0 (
  wsl.exe --cd "%~dp0." bash scripts/watch-server-log.sh
) else (
  powershell -NoProfile -Command "New-Item -ItemType Directory -Force '.data\logs' ^| Out-Null; if (-not (Test-Path '.data\logs\server.log')) { New-Item -ItemType File '.data\logs\server.log' ^| Out-Null }; Get-Content '.data\logs\server.log' -Tail 100 -Wait"
)
pause
