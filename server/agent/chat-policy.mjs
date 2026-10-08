import {z} from 'zod';
import {get,all,save,getSetting,setSetting,transaction} from '../store.mjs';
import {validate} from '../core/validation.mjs';
import {threadUnavailable} from './source-threads.mjs';
import {chatRun,chatRunView,chatFailure} from './chat-budget.mjs';
const webRequests=new Map();
export function requireChatThread(id){if(threadUnavailable(id))throw chatFailure('会话已删除。','CHAT_THREAD',410);if(!get(id,'thread')&&!all('conversation').some(c=>(c.threadId||c.id)===id))throw chatFailure('会话不存在。','CHAT_THREAD',404);}
export const threadWebPolicy=id=>getSetting('thread-web:'+id,{webSearch:false,revision:0});
export function saveThreadWebPolicy(id,input){requireChatThread(id);const body=validate(z.strictObject({webSearch:z.boolean(),revision:z.number().int().nonnegative()}),input);const result=transaction(()=>{const current=threadWebPolicy(id);if(current.revision!==body.revision)throw chatFailure('联网设置已变化，请重新加载。','CHAT_POLICY');const next={webSearch:body.webSearch,revision:current.revision+1};setSetting('thread-web:'+id,next);return next;});if(!result.webSearch)for(const controller of webRequests.get(id)||[])controller.abort();return result;}
export async function withThreadWeb(id,signal,work){
 requireChatThread(id);if(!threadWebPolicy(id).webSearch)throw chatFailure('当前会话已关闭联网，请使用已有资料回答。','CHAT_WEB_DISABLED');
 const controller=new AbortController(),controllers=webRequests.get(id)||new Set();controllers.add(controller);webRequests.set(id,controllers);
 try{return await work(AbortSignal.any([controller.signal,...(signal?[signal]:[])]));}
 finally{controllers.delete(controller);if(!controllers.size)webRequests.delete(id);}
}
export function installChatPolicy(app){
 app.post('/api/threads',(req,res)=>{const {id}=validate(z.strictObject({id:z.string().uuid()}),req.body);res.json(transaction(()=>{if(threadUnavailable(id))throw chatFailure('会话已删除。','CHAT_THREAD',410);const existing=get(id,'thread');if(!existing){if(get(id))throw chatFailure('标识已使用。','CHAT_THREAD');save('thread',{id,title:'新话题',status:'active'});}return {threadId:id};}));});
 app.get('/api/threads/:id/web-policy',(req,res)=>{requireChatThread(req.params.id);res.json(threadWebPolicy(req.params.id));});
 app.patch('/api/threads/:id/web-policy',(req,res)=>res.json(saveThreadWebPolicy(req.params.id,req.body)));
 app.get('/api/chat-runs/:id',async(req,res)=>{const {recoverChatRun}=await import('./chat-agent.mjs');const run=recoverChatRun(req.params.id);if(!run)throw chatFailure('执行记录不存在。','CHAT_RUN',404);requireChatThread(run.threadId);res.json(chatRunView(run.id));});
}
