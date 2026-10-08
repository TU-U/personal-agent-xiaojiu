import {test,expect} from '@playwright/test';
test('selection survives filtering, stale rows stay removable, and refresh retries the same uncertain operation',async({page})=>{
 const requests:{opId:string;action:string;items:{id:string;revision:number}[]}[]=[];
 let done=false;
 await page.route('**/api/v1/library/files?**',route=>{
  const failed=new URL(route.request().url()).searchParams.get('status')==='failed';
  return route.fulfill({json:{items:done?[]:[{id:failed?'b':'a',revision:1,title:failed?'待重试B':'待判断A',status:failed?'failed':'pending',sourcePath:failed?'旧/B.txt':'新/A.txt',reason:'待处理',availableActions:['copy','skip']}],total:done?0:1,nextCursor:null}});
 });
 await page.route('**/api/v1/library/decisions',async route=>{
  requests.push(route.request().postDataJSON());
  if(requests.length===1)return route.fulfill({status:409,json:{error:'本批未执行，请检查已选清单。',current:{invalid:[{id:'a',reason:'资料已删除'}]}}});
  if(requests.length===2)return route.abort('connectionfailed');
  done=true;return route.fulfill({json:{ok:true,action:'skip',items:[{id:'b',revision:2,status:'skipped'}]}});
 });
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();
 await page.getByRole('button',{name:'资料库',exact:true}).click();
 let dialog=page.getByRole('dialog',{name:'个人资料库'});
 await dialog.getByRole('checkbox',{name:'选择 待判断A'}).check();
 const box=await dialog.getByRole('checkbox',{name:'选择 待判断A'}).boundingBox();expect(box?.width).toBeLessThan(30);
 await dialog.getByLabel('状态筛选').selectOption('failed');await dialog.getByRole('checkbox',{name:'选择 待重试B'}).check();
 await expect(dialog.getByText('已选 2 份资料',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'批量跳过',exact:true}).click();
 await expect(dialog.getByText('资料已删除',{exact:true})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'移除 待判断A',exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'移除 待判断A',exact:true}).click();
 await dialog.getByRole('button',{name:'批量跳过',exact:true}).click();
 await expect(dialog.getByText('上次提交结果尚未确认，重试会使用同一操作编号，不会重复处理。',{exact:true})).toBeVisible();
 await page.reload();await page.getByRole('button',{name:'资料库',exact:true}).click();dialog=page.getByRole('dialog',{name:'个人资料库'});
 await expect(dialog.getByText('已选 1 份资料',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'重试确认上次操作',exact:true}).click();
 await expect(dialog.getByText('已跳过1份资料。',{exact:true})).toBeVisible();
 await expect(dialog.getByText('已选 0 份资料',{exact:true})).toBeVisible();
 expect(requests[0].items.map(item=>item.id)).toEqual(['a','b']);expect(requests[1].items).toEqual([{id:'b',revision:1}]);expect(requests[2]).toEqual(requests[1]);
});
