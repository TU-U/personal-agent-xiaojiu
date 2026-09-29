import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();await page.goto('http://localhost:4317');await page.getByRole('button',{name:'进入演示空间'}).click();await page.getByRole('heading',{name:/把此刻/}).waitFor();
const reports=[];
for(const [hash,heading] of [['library','把此刻'],['assistant','从你的记录里'],['artifacts','让记录'],['memories','慢慢了解你'],['settings','一个属于你的空间']]){
 await page.goto('http://localhost:4317/#'+hash);await page.getByRole('heading',{name:new RegExp(heading)}).waitFor();await page.waitForTimeout(900);const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();reports.push({page:hash,violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary})).slice(0,15)}))});await page.screenshot({path:`artifacts/desktop-${hash}.png`,fullPage:true});console.log(hash,r.violations.map(v=>`${v.id}:${v.nodes.length}`).join(', ')||'PASS');}
await fs.writeFile(process.env.AUDIT_OUTPUT||'artifacts/accessibility-latest.json',JSON.stringify(reports,null,2));await browser.close();
