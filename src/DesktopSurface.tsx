import {useEffect,useState} from 'react';
import PetBuddy from './PetBuddy';
import {PetReminderProvider} from './PetReminderContext';
import {openPetSource} from './PetReminderTable';
import {contractGet} from './api';
import {desktop,type DesktopSettings} from './desktop';
import {applyTheme,readTheme} from './theme';
export function DesktopNavigation(){
 useEffect(()=>desktop?.onNavigate(target=>{if(target.source)openPetSource(target.source);else location.hash=target.page;}),[]);
 return null;
}
export function DesktopSettingsPanel(){
 const [settings,setSettings]=useState<DesktopSettings|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(desktop)void desktop.settings().then(setSettings).catch(e=>setError(e.message));},[]);
 if(!desktop)return null;
 return <section className="settings-panel"><h2>桌面小九</h2><p>关闭主窗口会收起拾光，小九和后台任务继续运行。完全退出请使用托盘菜单。</p>
 {error&&<p role="alert">{error}</p>}
 <label className="desktop-autostart"><input type="checkbox" checked={settings?.autostart||false} disabled={!settings?.supported||busy} onChange={async event=>{setBusy(true);setError('');try{setSettings(await desktop!.setAutostart(event.target.checked));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}/>登录 Windows 后自动启动，只显示小九</label>
 <button type="button" className="btn secondary" onClick={()=>void desktop?.logs()}>查看桌面启动日志</button> <button type="button" className="btn secondary" onClick={()=>void desktop?.serverLogs()}>查看后台日志</button></section>;
}
export default function DesktopPet(){
 const [authenticated,setAuthenticated]=useState(false),[error,setError]=useState(''),[cursor,setCursor]=useState(0);
 useEffect(()=>{
  document.documentElement.classList.add('desktop-pet-mode');applyTheme(readTheme());
  const unlayout=desktop?.onPetLayout?.(layout=>{
   document.documentElement.dataset.petLayout='ready';
   const values={'pet-left':layout.pet.x,'pet-top':layout.pet.y,'pet-panel-left':layout.panel.x,'pet-panel-top':layout.panel.y,'pet-panel-width':layout.panel.width,'pet-panel-height':layout.panel.maxHeight,'pet-speech-left':layout.speech.x,'pet-speech-top':layout.speech.y,'pet-label-left':layout.labelLeft};
   for(const [name,value] of Object.entries(values))document.documentElement.style.setProperty('--'+name,value+'px');
  });
  let alive=true,inFlight=false;
  const refresh=async()=>{if(inFlight)return;inFlight=true;try{const state=await contractGet('getSession','/session');if(!alive)return;setAuthenticated(state.authenticated);if(state.authenticated){const changed=await contractGet('getChanges','/changes?since=0');if(alive)setCursor(changed.cursor);}if(alive)setError('');}catch(e){if(alive)setError((e as Error).message);}finally{inFlight=false;}};
  const theme=()=>applyTheme(readTheme());const mouse=(event:MouseEvent)=>desktop?.mouse(!!(event.target as Element).closest('.pet-buddy-button,.pet-buddy-panel,.desktop-pet-gate,.desktop-open-main'));
  void refresh();const timer=setInterval(()=>void refresh(),4000);window.addEventListener('focus',refresh);window.addEventListener('storage',theme);window.addEventListener('mousemove',mouse);
  return()=>{unlayout?.();delete document.documentElement.dataset.petLayout;alive=false;clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('storage',theme);window.removeEventListener('mousemove',mouse);document.documentElement.classList.remove('desktop-pet-mode');};
 },[]);
 return authenticated?<PetReminderProvider cursor={cursor}><PetBuddy/></PetReminderProvider>:<section className="desktop-pet-gate"><strong>小九在这里</strong><p>{error||'打开拾光登录后，就可以查看你的提示。'}</p><button className="btn primary" onClick={()=>void desktop?.openMain()}>打开拾光主界面</button>{error&&<button className="btn secondary" onClick={()=>void desktop?.retry()}>重连后台</button>}</section>;
}
