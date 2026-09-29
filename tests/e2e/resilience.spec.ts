import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
async function login(page){await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.capture-prompt')).toBeVisible();}
test.beforeEach(async({page})=>{await login(page);});
test('offline save preserves typed content and succeeds after reconnecting',async({page,context})=>{
 await page.locator('.capture-prompt').click();const body='离线不丢失 '+Date.now();await page.getByLabel('记录内容').fill(body);await context.setOffline(true);await page.getByRole('button',{name:'保存记录',exact:true}).click();await expect(page.locator('.note-detail .error-banner')).toBeVisible();await expect(page.getByLabel('记录内容')).toHaveValue(body);await context.setOffline(false);await page.getByRole('button',{name:'保存记录',exact:true}).click();await expect(page.locator('.note-detail .markdown')).toContainText(body);
});
test('structured note keeps every line break after saving and reopening',async({page})=>{
 const title='原文排版回归 '+Date.now();
 const body='一、Ozon 跨境电商实战流程\n针对俄罗斯 Ozon 电商平台。\n1. 选品与市场调研\nAI 辅助选品策略：生成选品报告。\n无货源模式优势：利用中国供应链。\n2. 商品上架与素材处理\nAPI 对接上架：批量上传商品。\n\n二、合规风控与成本控制\n1. 资质与法律风险\n公司注册与资质：开通对公账户。\n\n五、待办事项\n将 Ozon 官方大学网址及相关资料发到大群。 @赛博司书\n';
 await page.locator('.capture-prompt').click();await page.getByLabel('记录标题').fill(title);await page.getByLabel('记录内容').fill(body);await page.getByRole('button',{name:'保存记录',exact:true}).click();
 await expect(page.locator('.note-detail .markdown')).toBeVisible();await page.getByRole('button',{name:'原文排版',exact:true}).click();const original=page.locator('.note-original');await expect(original).toBeVisible();expect(await original.evaluate(el=>el.textContent)).toBe(body);expect(await original.evaluate(el=>getComputedStyle(el).whiteSpace)).toBe('pre-wrap');
 await page.getByRole('button',{name:'Markdown 预览',exact:true}).click();await expect(page.locator('.note-detail .markdown')).toBeVisible();
 await page.getByLabel('关闭窗口').click();await page.reload();await page.getByLabel('搜索记录').fill(title);await page.locator('.note-card').filter({hasText:title}).locator('.note-card-body').click();await expect(page.locator('.note-detail .markdown')).toBeVisible();await page.getByRole('button',{name:'原文排版',exact:true}).click();expect(await page.locator('.note-original').evaluate(el=>el.textContent)).toBe(body);await page.getByRole('button',{name:'编辑',exact:true}).click();await expect(page.getByLabel('记录内容')).toHaveValue(body);
});
test('record Markdown renders headings, lists, emphasis and tables by default',async({page})=>{
 const body='# Ozon 会议\n\n## 选品\n\n1. 调研市场\n2. **确认物流**\n\n| 项目 | 状态 |\n| --- | --- |\n| 上架 | 待办 |';
 await page.locator('.capture-prompt').click();await page.getByLabel('记录内容').fill(body);await page.getByRole('button',{name:'保存记录',exact:true}).click();
 const rendered=page.locator('.note-detail .markdown');await expect(rendered.getByRole('heading',{name:'Ozon 会议'})).toBeVisible();await expect(rendered.getByRole('heading',{name:'选品'})).toBeVisible();await expect(rendered.locator('ol li')).toHaveCount(2);await expect(rendered.locator('strong')).toHaveText('确认物流');await expect(rendered.getByRole('table')).toContainText('待办');
 await page.getByRole('button',{name:'编辑',exact:true}).click();await expect(page.getByLabel('记录内容')).toHaveValue(body);
});
test('paste an image into a note, then copy, cut and paste it again',async({page})=>{
 const title='图片剪贴板 '+Date.now();const bytes=(await readFile('tests/fixtures/sample.png')).toString('base64');
 await page.locator('.capture-prompt').click();await page.getByLabel('记录标题').fill(title);await page.getByLabel('记录内容').fill('这是截图说明。');
 await page.getByLabel('记录内容').evaluate((el,base64)=>{const raw=atob(base64);const data=Uint8Array.from(raw,char=>char.charCodeAt(0));const transfer=new DataTransfer();transfer.items.add(new File([data],'截图.png',{type:'image/png'}));el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:transfer,bubbles:true,cancelable:true}));},bytes);
 await expect(page.locator('.editor-image')).toHaveCount(1);await page.getByRole('button',{name:'保存记录',exact:true}).click();await expect(page.locator('.attachment img')).toBeVisible();
 await page.getByRole('button',{name:'复制图片',exact:true}).click();await page.getByRole('button',{name:'剪切图片',exact:true}).click();await expect(page.locator('.attachment img')).toHaveCount(0);
 await page.getByRole('button',{name:'编辑',exact:true}).click();await page.getByRole('button',{name:'粘贴图片'}).click();await expect(page.locator('.editor-image')).toHaveCount(1);await page.getByRole('button',{name:'保存记录',exact:true}).click();await expect(page.locator('.attachment img')).toBeVisible();
 await page.getByLabel('关闭窗口').click();await page.reload();await page.getByLabel('搜索记录').fill(title);await page.locator('.note-card').filter({hasText:title}).locator('.note-card-body').click();await expect(page.locator('.attachment img')).toBeVisible();
});
test('a new record can be saved with an image and no text',async({page})=>{
 await page.locator('.capture-prompt').click();await page.getByLabel('选择记录图片').setInputFiles({name:'只有图片.png',mimeType:'image/png',buffer:await readFile('tests/fixtures/sample.png')});
 await expect(page.locator('.editor-image')).toHaveCount(1);await page.getByRole('button',{name:'保存记录',exact:true}).click();await expect(page.locator('.detail-title')).toHaveText('只有图片.png');await expect(page.locator('.attachment img')).toBeVisible();
});
test('malicious HTML and long text render safely without horizontal overflow',async({page})=>{
 await page.locator('.capture-prompt').click();await page.getByLabel('记录标题').fill('安全与长文本回归');await page.getByLabel('记录内容').fill('<script>window.__unsafe=true</script>\n\n<img src=x onerror="window.__unsafe=true">\n\n'+('长文本边界测试'.repeat(150)));await page.getByRole('button',{name:'保存记录',exact:true}).click();await expect(page.locator('.detail-title')).toContainText('安全与长文本');expect(await page.evaluate(()=>window['__unsafe'])).toBeUndefined();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('nested source dialog closes alone on Escape and returns to artifact',async({page})=>{
 await page.goto('/#artifacts');await page.getByRole('button',{name:'新建成果'}).click();await page.getByLabel('资料范围').selectOption('拾光');await page.getByRole('button',{name:'开始整理'}).click();await expect(page.getByRole('dialog',{name:'成果工作台'})).toBeVisible();await page.locator('.source-item').first().click();await expect(page.getByRole('dialog')).toHaveCount(2);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(1);await expect(page.getByRole('dialog',{name:'成果工作台'})).toBeVisible();
});
test('320px screens preserve navigation, settings and editor layout',async({page})=>{
 await page.setViewportSize({width:320,height:720});for(const p of ['library','assistant','artifacts','memories','settings']){await page.goto('/#'+p);await expect(page.locator('.app-shell')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.goto('/#library');await page.locator('.capture-prompt').click();await page.getByLabel('记录内容').fill('小屏幕输入');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('button',{name:'保存记录',exact:true})).toBeVisible();
});
test('unsupported and oversized uploads explain the problem',async({page})=>{
 await page.getByLabel('选择导入文件').setInputFiles({name:'invalid.exe',mimeType:'application/octet-stream',buffer:Buffer.from('invalid')});await expect(page.locator('#main-content > .error-banner')).toContainText('暂不支持');await page.getByLabel('选择导入文件').setInputFiles({name:'large.txt',mimeType:'text/plain',buffer:Buffer.alloc(26*1024*1024)});await expect(page.locator('#main-content > .error-banner')).toContainText('25 MB');
});
test('recording handles microphone permissions or unavailable browser capability',async({page,context})=>{
 await context.clearPermissions();await page.getByRole('button',{name:'语音记录',exact:true}).click();await expect(page.getByRole('dialog',{name:'把想法说出来'})).toBeVisible();await page.getByRole('button',{name:'开始录音'}).click();await expect(page.locator('.recorder .error-banner')).toBeVisible();await page.getByLabel('关闭窗口').click();await expect(page.getByRole('dialog')).toHaveCount(0);
});
