import { chromium, devices } from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
for(const [name,options] of [['desktop',{viewport:{width:1440,height:1100}}],['mobile',{...devices['Pixel 7']} ]]){
 const context=await browser.newContext(options);const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:4317');await page.getByRole('button',{name:'进入演示空间'}).click();await page.getByRole('heading',{name:/把此刻，留给未来的自己/}).waitFor();await page.waitForTimeout(800);await page.screenshot({path:`artifacts/${name}-library.png`,fullPage:true});
 console.log(name,JSON.stringify({errors,overflow:await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth})),cards:await page.locator('.note-card').count()}));
 await context.close();
}
await browser.close();
