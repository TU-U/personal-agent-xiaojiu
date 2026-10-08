import {test,expect} from '@playwright/test';
async function login(page){await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.getByRole('heading',{name:/把此刻/})).toBeVisible();}
async function go(page,hash){await page.goto('/#'+hash);await expect(page.locator('.app-shell')).toBeVisible();}
const unique=()=>Date.now()+'-'+Math.random().toString(36).slice(2,7);
test.beforeEach(async({page})=>{await login(page);});
test('capture, persistence, editing, search, tags and deletion',async({page})=>{
 const id=unique(),title='测试记录 '+id;
 await page.locator('.capture-prompt').click();await page.getByLabel('记录标题').fill(title);await page.getByLabel('记录内容').fill('今天完成星河接口验收。下一步测试手机同步。');await page.getByLabel('旧项目标签').fill('自动化项目');await page.getByLabel('标签',{exact:true}).fill('验收，工作');await page.getByRole('button',{name:'保存记录',exact:true}).click();await expect(page.getByRole('dialog').getByRole('heading',{name:title,exact:true})).toBeVisible();await page.getByLabel('关闭窗口').click();
 await page.reload();await page.getByLabel('搜索记录').fill(id);await expect(page.locator('.note-card')).toHaveCount(1);await page.locator('.note-card-body').click();await page.getByRole('button',{name:'编辑',exact:true}).click();await page.getByLabel('记录内容').fill('完成接口验收，并完成手机同步测试。');await page.getByRole('button',{name:'保存记录',exact:true}).click();await expect(page.locator('.note-detail .markdown')).toContainText('完成手机同步测试');await page.getByLabel('删除记录',{exact:true}).click();await page.getByRole('button',{name:'确认删除'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.note-card')).toHaveCount(0);
});
test('new draft survives close and reopening',async({page})=>{
 const body='草稿内容 '+unique();await page.locator('.capture-prompt').click();await page.getByLabel('记录内容').fill(body);page.once('dialog',d=>d.accept());await page.getByLabel('关闭窗口').click();await expect.poll(()=>page.evaluate(()=>localStorage.getItem('shiguang-new-draft'))).toContain(body);await page.locator('.capture-prompt').click();await expect(page.getByLabel('记录内容')).toHaveValue(body);await page.getByRole('button',{name:'保存记录',exact:true}).click();await page.getByLabel('关闭窗口').click();
});
test('today refreshes into its own todo list and older days stay readable',async({page})=>{
 const suffix=unique(),oldTitle='昨天未完成 '+suffix,todayTitle='今天处理 '+suffix;
 const date=new Date();date.setDate(date.getDate()-1);const yesterday=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
 const created=await page.request.post('/api/v1/todos',{data:{title:oldTitle,day:yesterday}});expect(created.ok()).toBe(true);
 await page.reload();await expect(page.locator('.todo-panel')).toContainText('今日待办');await expect(page.locator('.todo-panel')).not.toContainText(oldTitle);
 await page.getByLabel('添加待办事项').fill(todayTitle);await page.getByLabel('添加待办',{exact:true}).click();await expect(page.locator('.todo-panel')).toContainText(todayTitle);
 await page.getByLabel('查看日期').selectOption(yesterday);await expect(page.locator('.todo-panel')).toContainText(oldTitle);await expect(page.locator('.todo-panel')).not.toContainText(todayTitle);await expect(page.getByLabel('添加待办事项')).toHaveCount(0);
 await page.getByRole('button',{name:'加入今天：'+oldTitle}).click();await page.getByRole('button',{name:'返回今天'}).click();await expect(page.locator('.todo-panel')).toContainText(oldTitle);await expect(page.locator('.todo-panel')).toContainText(todayTitle);
 await page.getByLabel('查看日期').selectOption(yesterday);await expect(page.locator('.todo-panel')).toContainText(oldTitle);await expect(page.getByRole('button',{name:'加入今天：'+oldTitle})).toBeDisabled();
});
test('open todo panel switches to a new list after midnight',async({page})=>{
 const start=new Date();start.setHours(23,59,50,0);await page.clock.install({time:start});await page.reload();
 const title='跨天待办 '+unique();await page.getByLabel('添加待办事项').fill(title);await page.getByLabel('添加待办',{exact:true}).click();await expect(page.locator('.todo-panel')).toContainText(title);
 await page.clock.fastForward('00:00:40');await expect(page.locator('.todo-panel')).not.toContainText(title);
 const day=`${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;await page.getByLabel('查看日期').selectOption(day);await expect(page.locator('.todo-panel')).toContainText(title);
});
test('question with sources, unavailable evidence, and source navigation',async({page})=>{
 await go(page,'assistant');await page.getByLabel('向助手提问').fill('资料导入有哪些风险？');await page.getByLabel('发送问题').click();await expect(page.locator('.answer-card').last()).toBeVisible();await expect(page.locator('.answer-card').last()).toContainText('本地');await expect(page.locator('.source-item').first()).toBeVisible();await page.locator('.source-item').first().click();await expect(page.getByRole('dialog',{name:'记录详情'})).toBeVisible();await page.getByLabel('关闭窗口').click();await page.getByRole('button',{name:'新建话题'}).click();await page.getByLabel('向助手提问').fill('木卫二冰层下的三叠纪珊瑚');await page.getByLabel('发送问题').click();await expect(page.locator('.answer-card').last()).toContainText('没有找到');
});
test('memory review choices keep compact controls beside long text',async({page})=>{
 await go(page,'assistant');
 const geometry=await page.evaluate(()=>{
  document.documentElement.dataset.theme='brutalist';
  const container=document.createElement('section');
  container.className='memory-review';
  container.innerHTML='<div class="memory-review-item"><label><input type="checkbox"><span>用户计划跑通从公司注册到商品上架 Ozon 的整个流程，并且希望长期保留相关背景以供以后讨论。</span></label><div class="memory-conflict"><label><input type="radio" name="choice">保留已有：用户所在城市是深圳或广州</label></div></div>';
  document.querySelector('.assistant-main')!.append(container);
  const label=container.querySelector('.memory-review-item>label')!.getBoundingClientRect();
  const checkbox=container.querySelector('input[type=checkbox]')!.getBoundingClientRect();
  const content=container.querySelector('.memory-review-item span')!.getBoundingClientRect();
  const radio=container.querySelector('input[type=radio]')!.getBoundingClientRect();
  container.remove();
  return {checkboxWidth:checkbox.width,radioWidth:radio.width,checkboxRight:checkbox.right,textLeft:content.left,textRight:content.right,labelRight:label.right};
 });
 expect(geometry.checkboxWidth).toBeLessThan(30);
 expect(geometry.radioWidth).toBeLessThan(30);
 expect(geometry.checkboxRight).toBeLessThan(geometry.textLeft);
 expect(geometry.textRight).toBeLessThanOrEqual(geometry.labelRight);
});
test('create, confirm, pause, edit and delete a memory',async({page})=>{
 await go(page,'memories');await page.getByRole('button',{name:'添加记忆',exact:true}).click();const content='验收偏好 '+unique()+'：周报要简短。';await page.getByLabel('记忆内容').fill(content);await page.getByLabel('什么时候使用').selectOption('周报');await page.getByRole('button',{name:'保存记忆'}).click();const card=page.locator('.memory-card').filter({hasText:content});await expect(card).toContainText('等待你确认');await card.getByRole('button',{name:'确认记住'}).click();await expect(card).toContainText('已生效');await card.getByRole('button',{name:'暂停',exact:true}).click();await expect(card).toContainText('已暂停');page.once('dialog',d=>d.accept());await card.getByLabel('删除记忆').click();await expect(card).toHaveCount(0);
});
test('generate, edit and download a source-backed artifact',async({page})=>{
 await go(page,'artifacts');await page.getByRole('button',{name:'新建成果'}).click();await page.getByLabel('资料范围').selectOption('拾光');await page.getByRole('button',{name:'开始整理'}).click();await expect(page.getByRole('dialog',{name:'成果工作台'})).toBeVisible();await expect(page.locator('.artifact-detail .markdown')).toContainText('本地资料整理稿');await expect(page.locator('.source-item').first()).toBeVisible();await page.getByRole('button',{name:'编辑',exact:true}).click();await page.getByLabel('成果标题').fill('已核对的测试周报');await page.getByLabel('成果正文').fill('# 我的周报\n\n已经人工核对。');await page.getByRole('button',{name:'保存',exact:true}).click();await expect(page.locator('.artifact-detail .markdown')).toContainText('已经人工核对');const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出',exact:true}).click();expect((await download).suggestedFilename()).toBe('已核对的测试周报.md');page.once('dialog',d=>d.accept());await page.getByLabel('删除成果').click();await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('import UTF-8 text through file input',async({page})=>{
 const name='导入测试-'+unique()+'.txt';await page.getByLabel('选择导入文件').setInputFiles({name,mimeType:'text/plain',buffer:Buffer.from('这是一份真实导入的中文文件，包含跨端测试记录。')});await page.getByRole('button',{name:'保存并导入',exact:true}).click();await expect(page.getByRole('dialog').getByRole('heading',{name,exact:true})).toBeVisible();await expect(page.locator('.note-detail .markdown')).toContainText('真实导入');await expect(page.locator('.file-download')).toContainText(name);
});
test('all primary pages have no horizontal overflow or runtime errors',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));for(const hash of ['library','assistant','artifacts','memories','settings']){await go(page,hash);await page.waitForTimeout(100);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 expect(errors).toEqual([]);
});
test('separate browser sessions see updates and protect conflicting edits',async({page,browser})=>{
 const id=unique();await page.locator('.capture-prompt').click();await page.getByLabel('记录标题').fill('冲突测试 '+id);await page.getByLabel('记录内容').fill('原始内容');await page.getByRole('button',{name:'保存记录',exact:true}).click();await page.getByLabel('关闭窗口').click();
 const context2=await browser.newContext();const p2=await context2.newPage();await login(p2);await p2.getByLabel('搜索记录').fill(id);await expect(p2.locator('.note-card')).toHaveCount(1);await p2.locator('.note-card-body').click();await p2.getByRole('button',{name:'编辑',exact:true}).click();await p2.getByLabel('记录内容').fill('第二台设备的修改');
 await page.getByLabel('搜索记录').fill(id);await page.locator('.note-card-body').click();await page.getByRole('button',{name:'编辑',exact:true}).click();await page.getByLabel('记录内容').fill('第一台设备已保存');await page.getByRole('button',{name:'保存记录',exact:true}).click();await p2.getByRole('button',{name:'保存记录',exact:true}).click();await expect(p2.locator('.conflict-box')).toBeVisible();await expect(p2.getByLabel('记录内容')).toHaveValue('第二台设备的修改');await expect(p2.locator('.conflict-box')).toContainText('第一台设备已保存');await context2.close();
});
