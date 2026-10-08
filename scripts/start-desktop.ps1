$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
$package=Get-Content (Join-Path $project 'desktop/package.json') -Raw | ConvertFrom-Json
$exe=Join-Path $project ('.local-runtime/xiaojiu-desktop/'+$package.electronVersion+'/xiaojiu.exe')
if (!(Test-Path $exe)) { throw '请先在 WSL 项目目录运行 python3 scripts/install-desktop.py' }
Start-Process -FilePath $exe -WorkingDirectory (Split-Path $exe)
