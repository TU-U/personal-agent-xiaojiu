const {contextBridge,ipcRenderer}=require('electron');
const role=process.argv.includes('--xiaojiu-pet')?'pet':'main';
contextBridge.exposeInMainWorld('xiaojiuDesktop',{
 role,
 openMain:target=>ipcRenderer.invoke('desktop:open',target),
 settings:()=>ipcRenderer.invoke('desktop:settings'),
 setAutostart:value=>ipcRenderer.invoke('desktop:autostart',value),
 retry:()=>ipcRenderer.invoke('desktop:retry'),
 logs:()=>ipcRenderer.invoke('desktop:logs'),
 serverLogs:()=>ipcRenderer.invoke('desktop:serverLogs'),
 quit:()=>ipcRenderer.invoke('desktop:quit'),
 mouse:interactive=>ipcRenderer.send('desktop:mouse',interactive),
 drag:active=>ipcRenderer.send('desktop:drag',active),
 move:(dx,dy)=>ipcRenderer.send('desktop:move',dx,dy),
 onPetLayout:callback=>{const listener=(_event,layout)=>callback(layout);ipcRenderer.on('desktop:pet-layout',listener);ipcRenderer.send('desktop:pet-layout-ready');return()=>ipcRenderer.removeListener('desktop:pet-layout',listener);},
 onNavigate:callback=>{const listener=(_event,target)=>callback(target);ipcRenderer.on('desktop:navigate',listener);ipcRenderer.send('desktop:ready');return()=>ipcRenderer.removeListener('desktop:navigate',listener);}
});
