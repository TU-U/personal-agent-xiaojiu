import { chromium } from '@playwright/test';
const base=process.env.SHOT_URL||'http://localhost:4317';
const theme=process.env.SHOT_THEME||'';
const lift=Number(process.env.SHOT_PET_LIFT||220);
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
if(theme)await context.addInitScript(t=>{try{localStorage.setItem('shiguang.web.theme',t);}catch{}},theme);
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base);await page.getByRole('button',{name:'进入演示空间'}).click();await page.getByRole('heading',{name:/把此刻，留给未来的自己/}).waitFor();await page.waitForTimeout(800);
// 把小九往上拖一点，避免她贴着底边
const pet=page.locator('.pet-buddy').first();
const box=await pet.boundingBox();
if(box){
  const cx=box.x+box.width/2, cy=box.y+box.height/2;
  await page.mouse.move(cx,cy);await page.mouse.down();
  for(let i=1;i<=10;i++)await page.mouse.move(cx-(30*i/10),cy-(lift*i/10),{steps:2});
  await page.mouse.up();
  await page.mouse.move(600,320);await page.waitForTimeout(1500);
}
await page.screenshot({path:'artifacts/desktop-library.png'});
console.log('desktop',JSON.stringify({theme:theme||'default',lift,errors,overflow:await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth})),cards:await page.locator('.note-card').count()}));
await context.close();
await browser.close();
