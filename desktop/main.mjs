import {app,BrowserWindow,Tray,Menu,nativeImage,ipcMain,shell,dialog,screen,session} from 'electron';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,appendFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {placePet,PET_SIZE} from './pet-placement.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
app.setName('拾光小九');app.setAppUserModelId('org.xiaojiu.shiguang');
if(process.env.XIAOJIU_DESKTOP_TEST_DIR)app.setPath('userData',process.env.XIAOJIU_DESKTOP_TEST_DIR);
const auto=process.argv.includes('--autostart'),client=randomUUID();
let main,pet,tray,starting,backend,config,quitting=false,quitBusy=false,pendingNavigation=null,rendererReady=false,dragTimer,petPlacement;
const errorUrl=new URL('./startup.html',import.meta.url).href;
const prefsFile=path.join(app.getPath('userData'),'desktop.json'),logFile=path.join(app.getPath('userData'),'desktop.log');
let prefs={};try{prefs=JSON.parse(readFileSync(prefsFile,'utf8'));}catch{}
const persist=()=>{mkdirSync(path.dirname(prefsFile),{recursive:true});writeFileSync(prefsFile,JSON.stringify(prefs,null,2));};
function log(text){mkdirSync(path.dirname(logFile),{recursive:true});appendFileSync(logFile,new Date().toISOString()+' '+text+'\n');}
const origin=()=>`http://127.0.0.1:${backend?.port||4317}`;
const trusted=url=>url?.startsWith(errorUrl)||(()=>{try{return new URL(url).origin===origin();}catch{return false;}})();
function validate(event){if(![main,pet].some(win=>win&&!win.isDestroyed()&&win.webContents===event.sender)||event.senderFrame!==event.sender.mainFrame||!trusted(event.senderFrame.url))throw new Error('无效桌面调用来源。');}
async function control(action){
 if(!config){config=JSON.parse(readFileSync(path.join(here,'runtime.local.json'),'utf8'));if(!config.projectRoot||!config.nodePath)throw new Error('缺少本机后台路径，请重新运行桌面安装脚本。');}
 const script=config.projectRoot+'/scripts/desktop-backend.mjs';
 const executable=config.mode==='wsl'?'wsl.exe':config.nodePath;
 const args=config.mode==='wsl'?['--distribution',config.distro,'--cd',config.projectRoot,'--exec',config.nodePath,script,action,client]:[script,action,client];
 return new Promise((resolve,reject)=>{const child=spawn(executable,args,{windowsHide:true,stdio:['ignore','pipe','pipe']});let out='',err='';const timeout=setTimeout(()=>{child.kill();reject(new Error('启动本机后台超时，请查看日志。'));},80000);child.stdout.on('data',chunk=>out+=chunk);child.stderr.on('data',chunk=>err+=chunk);child.on('error',e=>{clearTimeout(timeout);reject(e);});child.on('close',code=>{clearTimeout(timeout);if(code!==0)return reject(new Error(err.trim()||'后台控制进程未成功完成。'));try{resolve(JSON.parse(out.trim().split('\n').at(-1)));}catch{reject(new Error('后台控制响应无效。'));}});});
}
function options(role){return {preload:path.join(here,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,backgroundThrottling:false,additionalArguments:role==='pet'?['--xiaojiu-pet']:[]};}
function external(url){try{if(['https:','http:'].includes(new URL(url).protocol))void shell.openExternal(url);}catch{}}
function secure(win){
 win.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
 win.webContents.on('will-navigate',(event,url)=>{if(!trusted(url)){event.preventDefault();external(url);}});
 win.webContents.on('render-process-gone',()=>{log('界面进程中断');if(win===main)showFailure('界面进程中断，请重试。');else win.reload();});
}
function makeMain(){if(main&&!main.isDestroyed())return main;main=new BrowserWindow({title:'拾光',width:1240,height:850,minWidth:760,minHeight:520,show:false,backgroundColor:'#fffdf2',icon:path.join(here,'icon.png'),webPreferences:options('main')});secure(main);main.setMenuBarVisibility(false);main.on('close',event=>{if(!quitting){event.preventDefault();main.hide();}});main.webContents.on('did-start-loading',()=>rendererReady=false);return main;}
function openMain(target){
 if(target!==undefined){if(!target||!['library','assistant','events','artifacts','memories','settings','workTasks','accounting'].includes(target.page))throw new Error('未知页面。');if(target.source&&JSON.stringify(target.source).length>4000)throw new Error('来源信息过长。');pendingNavigation=target;}
 const win=makeMain();if(backend&&!trusted(win.webContents.getURL()))void win.loadURL(origin());
 if(win.isMinimized())win.restore();win.show();win.focus();
 if(rendererReady&&pendingNavigation){win.webContents.send('desktop:navigate',pendingNavigation);pendingNavigation=null;}
 return true;
}
function petAnchor(){const [x,y]=pet.getPosition();return {x:x+petPlacement.pet.x,y:y+petPlacement.pet.y};}
function publishPetPlacement(){if(pet&&!pet.isDestroyed())pet.webContents.send('desktop:pet-layout',petPlacement);}
function positionPet(anchor,area=screen.getDisplayNearestPoint(anchor).workArea){
 petPlacement=placePet(anchor,area);pet.setBounds(petPlacement.window);publishPetPlacement();
}
function makePet(){
 if(pet&&!pet.isDestroyed()){positionPet(petAnchor());pet.showInactive();return;}
 const area=screen.getPrimaryDisplay().workArea;
 const old=prefs.petPosition; // Migrate the old window origin once; new preferences store the pet itself.
 const saved=prefs.petAnchor||(old?{x:old.x+Math.min(490,area.width)-PET_SIZE.width-12,y:old.y+Math.min(720,area.height)-PET_SIZE.height-12}:{x:area.x+area.width-PET_SIZE.width-12,y:area.y+area.height-PET_SIZE.height-12});
 petPlacement=placePet(saved,screen.getDisplayNearestPoint(saved).workArea);
 pet=new BrowserWindow({title:'小九',...petPlacement.window,frame:false,transparent:true,hasShadow:false,resizable:false,skipTaskbar:true,alwaysOnTop:true,show:false,webPreferences:options('pet')});secure(pet);
 pet.once('ready-to-show',()=>pet.showInactive());pet.on('close',event=>{if(!quitting){event.preventDefault();pet.hide();}});pet.on('blur',()=>stopDrag());void pet.loadURL(origin()+'/?desktop=pet');
}
function stopDrag(){clearInterval(dragTimer);dragTimer=null;if(pet&&!pet.isDestroyed()&&petPlacement){prefs.petAnchor=petAnchor();persist();}}
function setAutostart(enabled){
 if(typeof enabled!=='boolean'||process.platform!=='win32')throw new Error('开机自启开关仅在 Windows 桌面安装版可用。');
 const args=[...(app.isPackaged?[]:[here]),'--autostart'];
 app.setLoginItemSettings({openAtLogin:enabled,path:process.execPath,args});prefs.autostart=enabled;persist();return settings();
}
function settings(){const args=[...(app.isPackaged?[]:[here]),'--autostart'];return {autostart:process.platform==='win32'?app.getLoginItemSettings({path:process.execPath,args}).openAtLogin:false,supported:process.platform==='win32',backend:backend?{shared:backend.shared,owned:backend.owned}:null,logFile};}
async function showFailure(message){log(message);const win=makeMain();await win.loadURL(errorUrl+'?message='+encodeURIComponent(message));win.show();}
async function start(){
 if(starting)return starting;
 starting=(async()=>{try{
  backend=await control('ensure');log('后台已连接 '+backend.instance+' '+(backend.owned?'本次启动':'复用'));
  if(process.platform==='win32'&&prefs.autostart===undefined&&!process.env.XIAOJIU_DESKTOP_TEST_DIR)setAutostart(true);
  makePet();if(!auto||main?.isVisible()){const win=makeMain();await win.loadURL(origin());openMain();}
  if(backend.recovery&&prefs.recovery!==backend.recovery){prefs.recovery=backend.recovery;persist();tray?.displayBalloon({title:'小九 · 上次执行需要继续',content:'上次退出保留了进度。打开任务或原搭子会话，查看停止原因后再继续。'});}
 }catch(error){await showFailure(error.message);}finally{starting=null;}})();return starting;
}
async function quit(){
 if(quitBusy||quitting)return;quitBusy=true;
 try{
  if(backend){
   const state=await control('status');
   if(state.activeRequests||state.jobs.length){const choice=await dialog.showMessageBox({type:'question',title:'小九 · 还有任务在执行',message:`桌面发起的 ${state.activeRequests+state.jobs.length} 项执行尚未结束`,detail:'继续后台运行会收起窗口并保留任务。确认退出会停止这些执行，保留已保存进度；网页发起的任务继续运行。',buttons:['继续后台运行','确认退出'],defaultId:0,cancelId:0});if(choice.response===0){main?.hide();pet?.hide();return;}}
   const result=await control('quit');log(result.stopped?'已关闭本次独占后台':'已保留共享后台');
  }
  quitting=true;app.quit();
 }catch(error){log(error.message);const {response}=await dialog.showMessageBox({type:'warning',message:'无法确认后台执行状态',detail:'后台将保留。可以继续等待，或只退出桌面窗口；已保存内容不受影响。\n'+error.message,buttons:['继续等待','仅退出桌面'],defaultId:0,cancelId:0});if(response===1){quitting=true;app.quit();}}
 finally{quitBusy=false;}
}
if(!app.requestSingleInstanceLock())app.quit();else{
 app.on('second-instance',(_event,argv)=>{if(!backend){void start();return;}makePet();if(!argv.includes('--autostart'))openMain();});
 app.on('window-all-closed',()=>{});
 app.on('before-quit',event=>{if(!quitting){event.preventDefault();void quit();}});
 app.on('activate',()=>{if(backend)openMain();});
 app.whenReady().then(()=>{
  tray=new Tray(nativeImage.createFromPath(path.join(here,'icon.png')).resize({width:32,height:32}));tray.setToolTip('拾光 · 小九');
  tray.setContextMenu(Menu.buildFromTemplate([{label:'打开拾光主界面',click:()=>openMain()},{label:'显示小九',click:()=>makePet()},{label:'查看桌面日志',click:()=>shell.openPath(logFile)},{type:'separator'},{label:'退出拾光',click:()=>void quit()}]));tray.on('double-click',()=>openMain());
  const ses=session.defaultSession;
  ses.setPermissionRequestHandler((contents,permission,callback)=>callback(trusted(contents.getURL())&&['media','clipboard-read','clipboard-sanitized-write'].includes(permission)));
  ses.webRequest.onBeforeSendHeaders({urls:['http://127.0.0.1:*/api/*']},(details,callback)=>{if(details.url.startsWith(origin()+'/api/'))details.requestHeaders['X-Xiaojiu-Client']=client;callback({requestHeaders:details.requestHeaders});});
  ses.webRequest.onHeadersReceived({urls:['http://127.0.0.1:*/*']},(details,callback)=>{const headers={...details.responseHeaders};if(details.resourceType==='mainFrame')headers['Content-Security-Policy']=["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; frame-src 'none'"];callback({responseHeaders:headers});});
  for(const [name,handler] of Object.entries({open:openMain,settings,autostart:setAutostart,retry:start,logs:()=>shell.openPath(logFile),serverLogs:()=>shell.openPath(process.platform==='win32'?path.win32.join(config.windowsRoot,'.data','logs','server.log'):path.join(config.projectRoot,'.data','logs','server.log')),quit}))ipcMain.handle('desktop:'+name,(event,...args)=>{validate(event);return handler(...args);});
  ipcMain.on('desktop:ready',event=>{validate(event);if(event.sender===main?.webContents){rendererReady=true;if(pendingNavigation){event.sender.send('desktop:navigate',pendingNavigation);pendingNavigation=null;}}});
  ipcMain.on('desktop:mouse',(event,interactive)=>{validate(event);if(event.sender===pet?.webContents&&typeof interactive==='boolean'&&!dragTimer)pet.setIgnoreMouseEvents(!interactive,{forward:true});});
  ipcMain.on('desktop:pet-layout-ready',event=>{validate(event);if(event.sender===pet?.webContents)publishPetPlacement();});
  ipcMain.on('desktop:move',(event,dx,dy)=>{validate(event);if(event.sender!==pet?.webContents||![dx,dy].every(n=>Number.isFinite(n)&&Math.abs(n)<=80))return;stopDrag();const anchor=petAnchor();positionPet({x:anchor.x+dx,y:anchor.y+dy});stopDrag();});
  ipcMain.on('desktop:drag',(event,enabled)=>{validate(event);if(event.sender!==pet?.webContents)return;stopDrag();if(enabled===true){pet.setIgnoreMouseEvents(false);const begin=screen.getCursorScreenPoint(),anchor=petAnchor();dragTimer=setInterval(()=>{const point=screen.getCursorScreenPoint();if(Math.abs(point.x-begin.x)+Math.abs(point.y-begin.y)<5)return;positionPet({x:anchor.x+point.x-begin.x,y:anchor.y+point.y-begin.y},screen.getDisplayNearestPoint(point).workArea);},16);}});
  for(const event of ['display-removed','display-metrics-changed'])screen.on(event,()=>{if(pet&&!pet.isDestroyed())positionPet(petAnchor());});
  void start();
 });
}
