import {test,expect} from '@playwright/test';

test('library discussion works on the current chat page and preserves draft and bounded references',async({page})=>{
 const files=Array.from({length:6},(_,i)=>({id:`discussion-${i}`,revision:1,title:`资料${i}`,sourcePath:`${i}.md`,copyName:`${i}.md`,status:'ready',content:`资料正文${i}`}));
 await page.route('**/api/v1/library/files?**',route=>route.fulfill({json:{items:files,total:files.length,nextCursor:null}}));
 await page.route(/\/api\/v1\/library\/discussion-\d+$/,route=>route.fulfill({json:files.find(file=>route.request().url().endsWith(file.id))}));
 await page.route(/\/api\/v1\/library\/discussion-\d+\/index$/,route=>route.fulfill({json:{state:'indexed',message:'已完成索引',retryable:false}}));
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const add=async(index:number)=>{
  await page.getByRole('button',{name:/^(资料库|引用资料库)$/}).click();
  await page.getByRole('dialog',{name:'个人资料库'}).getByRole('button',{name:'查看正文',exact:true}).nth(index).click();
  await page.getByRole('dialog',{name:`资料${index}`,exact:true}).getByRole('button',{name:'引用这份资料继续讨论',exact:true}).click();
 };
 await add(0);const refs=page.getByLabel('本轮引用的资料');
 await expect(refs.getByRole('button',{name:'移除引用：资料0',exact:true})).toBeVisible();
 const input=page.getByRole('textbox',{name:'向助手提问',exact:true});await input.fill('保留我的问题草稿');
 await add(1);await expect(refs.locator('.composer-reference')).toHaveCount(2);await expect(input).toHaveValue('保留我的问题草稿');
 files[0].revision=2;await add(0);await expect(refs.locator('.composer-reference')).toHaveCount(2);
 for(const i of [2,3,4])await add(i);
 await expect(refs.locator('.composer-reference')).toHaveCount(5);
 await add(5);const picker=page.getByRole('dialog',{name:'引用记录或要事',exact:true});
 await expect(picker.getByText('本次需要引用：资料5。请先移除一条旧引用，随后会自动加入。',{exact:true})).toBeVisible();
 await picker.getByRole('button',{name:'移除：资料1',exact:true}).click();await picker.getByRole('button',{name:'完成引用',exact:true}).click();
 await expect(refs.locator('.composer-reference')).toHaveCount(5);
 await expect(refs.getByRole('button',{name:'移除引用：资料5',exact:true})).toBeVisible();
 await expect(refs.getByRole('button',{name:'移除引用：资料1',exact:true})).toHaveCount(0);
 await expect(input).toHaveValue('保留我的问题草稿');
 expect(await page.evaluate(()=>sessionStorage.getItem('libraryDiscussion'))).toBeNull();
});
