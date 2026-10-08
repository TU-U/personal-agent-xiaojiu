// Small native Windows check: no model calls and no business-data writes.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
const root=process.cwd(),version=JSON.parse(readFileSync('desktop/package.json','utf8')).electronVersion;
const runtime=path.join(root,'.local-runtime','xiaojiu-desktop',version);
const env={...process.env,XIAOJIU_DESKTOP_TEST_DIR:mkdtempSync(path.join(tmpdir(),'xiaojiu-shell-test-'))};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({executablePath:path.join(runtime,'xiaojiu.exe'),args:[],env,timeout:60000});
try{
 let windows=[];for(let n=0;n<80;n++){windows=app.windows();if(windows.length===2&&windows.every(p=>p.url().startsWith('http://127.0.0.1:4317')))break;await new Promise(r=>setTimeout(r,250));}
 assert.equal(windows.length,2,'main and pet windows');
 const main=windows.find(p=>!p.url().includes('desktop=pet')),pet=windows.find(p=>p.url().includes('desktop=pet'));
 assert.ok(main&&pet,'both windows connected to the same backend');
 const state=await main.evaluate(()=>fetch('/api/session').then(r=>r.json()));
 if(state.demoAccess)await main.getByRole('button',{name:'进入演示空间'}).click();
 if(state.demoAccess||state.authenticated){
  await pet.locator('.pet-buddy-button').waitFor({state:'visible',timeout:20000});
  await pet.locator('.pet-buddy-button').hover();await pet.getByRole('region',{name:'小九提示表'}).waitFor({state:'visible'});
  const bounds=await pet.locator('.pet-buddy-panel').boundingBox();const size=pet.viewportSize()||await pet.evaluate(()=>({width:innerWidth,height:innerHeight}));assert.ok(bounds.y>=0&&bounds.x>=0&&bounds.y+bounds.height<=size.height+1,'pet panel fits window');
 }
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('desktop=pet')).close());
 assert.deepEqual(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(w=>({pet:w.webContents.getURL().includes('desktop=pet'),visible:w.isVisible()})).sort((a,b)=>Number(a.pet)-Number(b.pet))),[{pet:false,visible:false},{pet:true,visible:true}]);
 await pet.getByRole('button',{name:state.demoAccess||state.authenticated?'打开主界面':'打开拾光主界面',exact:true}).click();
 assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().filter(w=>w.isVisible()).length),2);
 assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length),2);
 await main.evaluate(()=>window.xiaojiuDesktop.openMain({page:'settings'}));
 if(state.demoAccess||state.authenticated)await main.getByRole('heading',{name:'桌面小九',exact:true}).waitFor({state:'visible'});
 console.log(JSON.stringify({nativeWindows:2,closeHidesMain:true,petRestoresMain:true,sameBackend:true,settings:!!state.demoAccess||!!state.authenticated,paidCalls:0}));
}finally{await app.close();}
const response=await fetch('http://127.0.0.1:4317/api/health');assert.equal(response.ok,true,'quitting desktop retains pre-existing Web service');console.log('Shared backend retained after desktop exit.');

const autostart=await electron.launch({executablePath:path.join(runtime,'xiaojiu.exe'),args:['--autostart'],env,timeout:60000});
try{const pet=await autostart.firstWindow();await pet.waitForURL('**/?desktop=pet');assert.equal(autostart.windows().length,1);console.log('Autostart opens only Xiaojiu.');}finally{await autostart.close();}
