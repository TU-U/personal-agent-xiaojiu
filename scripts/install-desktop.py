#!/usr/bin/env python3
"""Install the Windows shell around this existing WSL project, without copying its data."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,tempfile,zipfile
root=Path(__file__).resolve().parent.parent
version=json.loads((root/'desktop/package.json').read_text())['electronVersion']
runtime=root/'.local-runtime'/'xiaojiu-desktop'/version
archive=Path(tempfile.gettempdir())/'xiaojiu-electron-win.zip'
checksums=Path(tempfile.gettempdir())/'xiaojiu-electron-shasums.txt'
name=f'electron-v{version}-win32-x64.zip'
base=f'https://github.com/electron/electron/releases/download/v{version}'
subprocess.run(['curl','-fsSL',base+'/SHASUMS256.txt','-o',str(checksums)],check=True)
expected=next(line.split()[0] for line in checksums.read_text().splitlines() if line.split()[-1].lstrip('*')==name)
if not archive.exists() or hashlib.sha256(archive.read_bytes()).hexdigest()!=expected:
 subprocess.run(['curl','-fL',base+'/'+name,'-o',str(archive)],check=True)
if hashlib.sha256(archive.read_bytes()).hexdigest()!=expected:raise RuntimeError('Electron 校验和不匹配，停止安装。')
runtime.mkdir(parents=True,exist_ok=True)
if not (runtime/'xiaojiu.exe').exists():
 with zipfile.ZipFile(archive) as z:z.extractall(runtime)
 (runtime/'electron.exe').rename(runtime/'xiaojiu.exe')
appdir=runtime/'resources/app';appdir.mkdir(parents=True,exist_ok=True)
for name in ['package.json','main.mjs','preload.cjs','startup.html','startup.js']:
 shutil.copy2(root/'desktop'/name,appdir/name)
shutil.copy2(root/'assets/小九-端正坐好萌萌地看着你.png',appdir/'icon.png')
node=subprocess.check_output(['node','-p','process.execPath'],text=True).strip()
config={'mode':'wsl','distro':os.environ.get('WSL_DISTRO_NAME','Ubuntu-24.04'),'projectRoot':str(root),'nodePath':node,'windowsRoot':subprocess.check_output(['wslpath','-w',str(root)],text=True).strip()}
(appdir/'runtime.local.json').write_text(json.dumps(config,ensure_ascii=False,indent=2))
def win(p):return subprocess.check_output(['wslpath','-w',str(p)],text=True).strip()
exe=win(runtime/'xiaojiu.exe');directory=win(runtime)
def ps(s):return "'"+s.replace("'","''")+"'"
installer=runtime/'shortcut.ps1'
installer.write_text("$ErrorActionPreference='Stop'\n$shell=New-Object -ComObject WScript.Shell\n$desktop=[Environment]::GetFolderPath('Desktop')\n$link=$shell.CreateShortcut((Join-Path $desktop '拾光小九.lnk'))\n$link.TargetPath="+ps(exe)+"\n$link.WorkingDirectory="+ps(directory)+"\n$link.Description='打开拾光主界面和桌面小九'\n$link.Save()\nWrite-Output (Join-Path $desktop '拾光小九.lnk')\n",encoding='utf-8-sig')
subprocess.run(['powershell.exe','-NoProfile','-ExecutionPolicy','Bypass','-File',win(installer)],check=True)
print('桌面壳已安装：'+exe+'\n后台复用：'+str(root)+'\n首次启动默认开启登录 Windows 后自启；设置中可关闭。')
