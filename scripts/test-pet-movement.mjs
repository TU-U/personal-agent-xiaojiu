// Targeted native-window regression. Temporary UI profile, no AI/business writes.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
const version=JSON.parse(readFileSync('desktop/package.json','utf8')).electronVersion;
const runtime=path.resolve('.local-runtime/xiaojiu-desktop',version);
const profile=mkdtempSync(path.join(tmpdir(),'xiaojiu-move-test-'));
const env={...process.env,XIAOJIU_DESKTOP_TEST_DIR:profile};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({executablePath:path.join(runtime,'xiaojiu.exe'),args:[],env,timeout:60000});
let finalPosition;
try{
 let main,pet;
 for(let i=0;i<120;i++){main=app.windows().find(p=>p.url()==='http://127.0.0.1:4317/');pet=app.windows().find(p=>p.url().includes('desktop=pet'));if(main&&pet)break;await new Promise(r=>setTimeout(r,200));}
 assert.ok(main&&pet);await main.getByRole('button',{name:'进入演示空间'}).click();
 const button=pet.locator('.pet-buddy-button');await button.waitFor({state:'visible',timeout:20000});await pet.waitForFunction(()=>document.documentElement.dataset.petLayout==='ready');
 const area=await app.evaluate(({screen})=>screen.getPrimaryDisplay().workArea);
 async function snapshot(){const local=await pet.locator('.pet-buddy').boundingBox();const bounds=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('desktop=pet')).getBounds());return {local,bounds,x:bounds.x+local.x,y:bounds.y+local.y};}
 // The native drag handler still reads screen.getCursorScreenPoint; replace only
 // this test process's reader so testing never moves the user's physical pointer.
 await app.evaluate(({screen})=>{globalThis.petCursor={x:0,y:0};screen.getCursorScreenPoint=()=>globalThis.petCursor;});
 for(const target of [{x:area.x+12,y:area.y+12},{x:area.x+area.width-134,y:area.y+12},{x:area.x+area.width-134,y:area.y+area.height-168},{x:area.x+12,y:area.y+area.height-168}]){
  const before=await snapshot();const start={x:before.x+56,y:before.y+56};
  await app.evaluate((_electron,point)=>{globalThis.petCursor=point;},start);
  await pet.evaluate(()=>window.xiaojiuDesktop.drag(true));await app.evaluate(()=>new Promise(r=>setTimeout(r,40)));
  await app.evaluate((_electron,point)=>{globalThis.petCursor=point;},{x:start.x+target.x-before.x,y:start.y+target.y-before.y});
  for(let i=0;i<30;i++){const pos=await snapshot();if(Math.abs(pos.x-target.x)<2&&Math.abs(pos.y-target.y)<2)break;await new Promise(r=>setTimeout(r,30));}
  await pet.evaluate(()=>window.xiaojiuDesktop.drag(false));const after=await snapshot();assert.ok(Math.abs(after.x-target.x)<2&&Math.abs(after.y-target.y)<2,JSON.stringify({target,actual:{x:after.x,y:after.y}}));
  await button.focus();await pet.getByRole('region',{name:'小九提示表'}).waitFor({state:'visible'});
  const panel=await pet.locator('.pet-buddy-panel').boundingBox();const actual=await snapshot();
  assert.ok(panel.x>=-1&&panel.y>=-1&&panel.x+panel.width<=actual.bounds.width+1&&panel.y+panel.height<=actual.bounds.height+1,'entire panel stays inside visible native window');
  assert.ok(actual.bounds.y+panel.y>=area.y&&actual.bounds.y+panel.y+panel.height<=area.y+area.height+1);
 }
 // A small keyboard move also uses the real IPC/geometry path.
 const before=await snapshot();await button.press('ArrowUp');for(let i=0;i<30;i++){finalPosition=await snapshot();if(finalPosition.y===before.y-16)break;await new Promise(r=>setTimeout(r,30));}assert.equal(finalPosition.y,before.y-16);
 console.log(JSON.stringify({nativeDragCorners:4,panelVisibleAtEdges:true,keyboardMovement:true,paidCalls:0}));
}finally{await app.close();}
const reopened=await electron.launch({executablePath:path.join(runtime,'xiaojiu.exe'),args:['--autostart'],env,timeout:60000});
try{const pet=await reopened.firstWindow();await pet.waitForURL('**/?desktop=pet');await pet.locator('.pet-buddy-button').waitFor();await pet.waitForFunction(()=>document.documentElement.dataset.petLayout==='ready');const local=await pet.locator('.pet-buddy').boundingBox();const bounds=await reopened.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].getBounds());assert.equal(bounds.x+local.x,finalPosition.x);assert.equal(bounds.y+local.y,finalPosition.y);console.log('Pet screen position survives restart.');}finally{await reopened.close();}
