import {test,expect} from '@playwright/test';
test('library pagination preserves loaded rows on error and rejects late responses from old filters',async({page})=>{
 let moreAttempts=0,release:()=>void=()=>{},entered:()=>void=()=>{};
 const gate=new Promise<void>(r=>release=r),started=new Promise<void>(r=>entered=r);
 const row=(id:string,title:string,status='ready')=>({id,revision:1,title,status,sourcePath:'项目/'+id+'.txt',reason:'已解析'});
 await page.route('**/api/library/files?**',async route=>{
  const query=new URL(route.request().url()).searchParams;
  if(query.get('status')==='failed')return route.fulfill({json:{items:[row('failed-old','失败旧资料','failed')],total:1,nextCursor:null}});
  if(query.get('cursor')==='c2'){entered();await gate;return route.fulfill({json:{items:[row('late','旧筛选迟到资料')],total:531,nextCursor:null}});}
  if(query.get('cursor')==='c1'){
   if(++moreAttempts===1)return route.fulfill({status:503,json:{error:'分页服务暂时不可用'}});
   return route.fulfill({json:{items:[row('31','第31份资料')],total:531,nextCursor:'c2'}});
  }
  return route.fulfill({json:{items:Array.from({length:30},(_,i)=>row(String(i),'资料-'+i)),total:531,nextCursor:'c1'}});
 });
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();
 await page.getByRole('button',{name:'资料库',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'个人资料库'});
 await expect(dialog.getByText('已显示 30 / 531 项')).toBeVisible();
 await dialog.getByRole('button',{name:'加载更多资料'}).click();
 await expect(dialog.getByRole('alert')).toContainText('分页服务暂时不可用');
 await expect(dialog.getByText('资料-0',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'加载更多资料'}).click();
 await expect(dialog.getByText('已显示 31 / 531 项')).toBeVisible();
 await dialog.getByRole('button',{name:'加载更多资料'}).click();await started;
 await dialog.getByLabel('状态筛选').selectOption('failed');
 await expect(dialog.getByText('失败旧资料',{exact:true})).toBeVisible();
 const response=page.waitForResponse(r=>r.url().includes('cursor=c2'));release();await response;
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(dialog.getByText('旧筛选迟到资料',{exact:true})).toHaveCount(0);
 await expect(dialog.getByText('已显示 1 / 1 项')).toBeVisible();
 await expect(dialog.getByRole('button',{name:'加载更多资料'})).toHaveCount(0);
});
test('combined scope is sent to list and search and a late search cannot replace the new scope',async({page})=>{
 let release:()=>void=()=>{},entered:()=>void=()=>{};
 const gate=new Promise<void>(r=>release=r),started=new Promise<void>(r=>entered=r);
 await page.route('**/api/projects',route=>route.fulfill({json:{items:[{id:'project-a',name:'项目A'}]}}));
 await page.route('**/api/library/files?**',route=>route.fulfill({json:{items:[],total:0,nextCursor:null}}));
 await page.route('**/api/library/search?**',async route=>{entered();await gate;await route.fulfill({json:{mode:'hybrid',results:[{id:'old',title:'旧范围检索结果',text:'旧内容',start:0,end:3}]}});});
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();
 await page.getByRole('button',{name:'资料库',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'个人资料库'});
 await dialog.getByText('项目、目录、文件类型与入库日期筛选',{exact:true}).click();
 await dialog.getByLabel('项目筛选',{exact:true}).selectOption('project-a');
 await dialog.getByLabel('目录筛选',{exact:true}).fill('文档/方案');
 await dialog.getByLabel('文件扩展名').fill('.pdf');
 await dialog.getByLabel('入库开始日期').fill('2026-09-29');
 const listRequest=page.waitForRequest(r=>r.url().includes('/library/files?')&&r.url().includes('project-a'));
 await dialog.getByRole('button',{name:'应用筛选',exact:true}).click();
 const listParams=new URL((await listRequest).url()).searchParams;
 expect(listParams.get('directory')).toBe('文档/方案');expect(listParams.get('dateFrom')).toBe('2026-09-29');
 await dialog.getByLabel('搜索资料正文').fill('方案');
 const searchRequest=page.waitForRequest(r=>r.url().includes('/library/search?'));
 await dialog.getByRole('button',{name:'检索',exact:true}).click();await started;
 const searchParams=new URL((await searchRequest).url()).searchParams;
 for(const key of ['projectId','directory','extension','dateFrom'])expect(searchParams.get(key)).toBe(listParams.get(key));
 await dialog.getByLabel('状态筛选').selectOption('failed');
 const response=page.waitForResponse(r=>r.url().includes('/library/search?'));release();await response;
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(dialog.getByText('旧范围检索结果',{exact:true})).toHaveCount(0);
 await expect(dialog.getByText('当前筛选范围内没有资料。',{exact:true})).toBeVisible();
});
