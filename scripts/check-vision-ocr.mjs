import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,writeFile,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {chromium} from '@playwright/test';
if(process.env.SHIGUANG_CHECK_VISION!=='1')throw new Error('Explicit synthetic vision check opt-in required');
const destination=resolve(process.argv[2]||'artifacts/vision-ocr-live-20261008.json');
try{await access(destination);throw new Error('Existing result: inspect instead of repeating a model call');}catch(e){if(e.code!=='ENOENT')throw e;}
const live=new DatabaseSync('.data/shiguang.sqlite',{readOnly:true});const setting=key=>JSON.parse(live.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value||'null');const provider=setting('provider'),vision=setting('visionProvider');live.close();
if(!(vision||provider))throw new Error('No saved model configuration');
const dir=await mkdtemp(join(tmpdir(),'shiguang-vision-ocr-'));
Object.assign(process.env,{DATA_DIR:dir,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,setSetting}=await import('../server/store.mjs');setSetting('provider',provider);if(vision)setSetting('visionProvider',vision);
const {parseAccountingScreenshot}=await import('../server/domain/accounting/accounting-ocr.mjs');
const {withAiContext}=await import('../server/core/ai-context.mjs');
let browser;const result={checkedAt:new Date().toISOString(),source:vision?'independent-vision':'text-model-fallback',model:(vision||provider).model,dataDir:dir,scope:'One synthetic English receipt, actual accounting OCR parser; no private images or real financial transaction'};
try{
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:640,height:540}});
 await page.setContent('<html><body style="font:28px sans-serif;padding:32px;background:white;color:black"><h2>SYNTHETIC RECEIPT</h2><p>Merchant: Test Cafe</p><p>Type: Expense</p><p>Amount: CNY 35.50</p><p>Date: 2026-10-08</p><p>Status: Successful</p><p>Item: Lunch</p></body></html>');
 const bytes=await page.screenshot({path:join(dir,'synthetic-receipt.png')});await browser.close();browser=null;
 result.parsed=await withAiContext({sourceId:'synthetic-vision-ocr'},()=>parseAccountingScreenshot(bytes,'image/png'));
 const row=result.parsed.rows[0];result.passed=row.draft.amountCents===3550&&row.draft.date==='2026-10-08'&&row.draft.type==='expense';
 if(!result.passed)result.error='Recognized amount/date/type differ from synthetic receipt';
}catch(error){result.passed=false;result.error=error.message;result.code=error.code;result.upstreamStatus=error.upstreamStatus;}
finally{
 if(browser)await browser.close();db.prepare("DELETE FROM settings WHERE key IN ('provider','visionProvider')").run();db.close();
 await writeFile(destination,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({destination,passed:result.passed,model:result.model,error:result.error,upstreamStatus:result.upstreamStatus}));
}
if(!result.passed)process.exitCode=1;
