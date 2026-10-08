import {test,expect} from '@playwright/test';
test('full reminder table, pin, keyboard dismissal, report and failed chat have no business side effects',async({page})=>{
 let mode='full',writes:string[]=[],chats:any[]=[];
 const items=Array.from({length:40},(_,i)=>({id:'prompt-'+i,sourceKind:'todo',sourceId:'todo-'+i,title:'待处理事项 '+i,message:'这是一条需要完整显示的较长提示。'.repeat(4),count:1,actionTarget:{page:'library',id:'todo-'+i}}));
 await page.route('**/api/v1/pet/reminders',route=>mode==='error'?route.fulfill({status:503,json:{error:'暂时不可用'}}):route.fulfill({json:{snapshot:mode,total:mode==='full'?40:0,items:mode==='full'?items:[],cursor:1}}));
 await page.route('**/api/v1/pet/chat',route=>{chats.push(route.request().postDataJSON());return route.fulfill({status:502,json:{error:'模型暂时无响应'}});});
 page.on('request',req=>{if(req.method()!=='GET'&&req.url().includes('/api/v1/'))writes.push(new URL(req.url()).pathname);});
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();writes=[];
 const pet=page.getByRole('button',{name:/小九现在/}),panel=page.getByLabel('小九的互动面板'),table=page.getByLabel('小九提示表');
 await expect(page.getByLabel('40 项待处理提示')).toBeVisible();await pet.hover();await expect(table).toBeVisible();
 await expect(table.locator('article')).toHaveCount(40);await table.getByRole('button',{name:'查看：待处理事项 39',exact:true}).scrollIntoViewIfNeeded();
 expect(await table.locator('.pet-reminder-list').evaluate(el=>el.scrollTop>0&&el.scrollHeight>el.clientHeight)).toBe(true);
 await expect(panel.getByRole('button',{name:'喂食',exact:true})).toHaveCount(0);await expect(panel.getByRole('button',{name:'摸摸它',exact:true})).toHaveCount(0);
 const pin=panel.getByRole('button',{name:'提示语',exact:true});await pin.click();await page.mouse.move(20,20);await expect(panel).toBeVisible();
 await pin.click();await page.mouse.move(20,20);await expect(panel).toBeHidden();
 await pet.focus();await expect(panel).toBeVisible();await page.keyboard.press('Escape');await expect(panel).toBeHidden();
 await pet.hover();await panel.getByRole('button',{name:'汇报',exact:true}).click();await expect(page).toHaveURL(/#artifacts$/);await expect(page.getByLabel('40 项待处理提示')).toBeVisible();expect(writes).toEqual([]);
 await panel.getByRole('button',{name:'交流',exact:true}).click();await page.getByLabel('和小九说话',{exact:true}).fill('今天有点累');await page.getByLabel('发送给小九',{exact:true}).click();
 await expect(page.getByLabel('和小九说话',{exact:true})).toHaveValue('今天有点累');await expect(panel.getByRole('alert')).toContainText('模型暂时无响应');expect(chats).toEqual([{message:'今天有点累',history:[]}]);expect(writes).toEqual(['/api/v1/pet/chat']);
 mode='error';await page.evaluate(()=>window.dispatchEvent(new Event('business-changed')));await expect(table.getByRole('alert')).toContainText('暂时不可用');await expect(table.getByText('无',{exact:true})).toHaveCount(0);
 mode='empty';await table.getByRole('button',{name:'重试提示'}).click();await expect(table.getByText('无',{exact:true})).toBeVisible();await expect(page.getByLabel('40 项待处理提示')).toHaveCount(0);
});

test('real todo reminder jumps to the exact source and disappears only after completion',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const todo=await page.evaluate(async()=>{const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const response=await fetch('/api/v1/todos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'小九来源跳转测试',day})});if(!response.ok)throw new Error(await response.text());return response.json();});
 await page.reload();await expect(page.locator('.app-shell')).toBeVisible();await page.getByRole('button',{name:/小九现在/}).hover();
 await page.getByRole('button',{name:'查看：小九来源跳转测试',exact:true}).click();await expect(page.locator('#todo-'+todo.id)).toBeFocused();
 await page.getByRole('button',{name:'完成：小九来源跳转测试',exact:true}).click();await page.getByRole('button',{name:/小九现在/}).hover();await expect(page.getByRole('button',{name:'查看：小九来源跳转测试',exact:true})).toHaveCount(0);
});

test('a delayed old snapshot cannot revive prompts after invalidation',async({page})=>{
 let release:()=>void=()=>{},held=false,calls=0;
 const gate=new Promise<void>(resolve=>release=resolve);
 await page.route('**/api/v1/pet/reminders',async route=>{
  calls++;const old=calls===1;if(old){held=true;await gate;}
  await route.fulfill({json:{snapshot:old?'old':'new',cursor:old?1:2,total:old?1:0,items:old?[{id:'old',sourceKind:'todo',sourceId:'old',title:'已经处理',message:'旧提示',count:1,actionTarget:{page:'library',id:'old'}}]:[]}}).catch(()=>{});
 });
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect.poll(()=>held).toBe(true);
 await page.evaluate(()=>window.dispatchEvent(new Event('business-changed')));await page.getByRole('button',{name:/小九现在/}).hover();await expect(page.getByLabel('小九提示表').getByText('无',{exact:true})).toBeVisible();
 release();await expect.poll(()=>calls).toBeGreaterThanOrEqual(2);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(page.getByRole('button',{name:'查看：已经处理',exact:true})).toHaveCount(0);await expect(page.getByLabel('1 项待处理提示')).toHaveCount(0);
});
