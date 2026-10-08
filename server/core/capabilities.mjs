import {localAudioCapability,probeLocalAudio} from '../ai/local-audio-probe.mjs';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import Redis from 'ioredis';
import { z } from 'zod';
import { getSetting, setSetting } from '../store.mjs';
import { providerConfig, visionConfig, complete } from '../ai/engine.mjs';
import { retrievalConfig, testEmbedding } from '../retrieval/retrieval.mjs';
import { searchWeb, webSearchKey } from '../ai/web/web-search.mjs';
import { validate } from './validation.mjs';
const names={text:'文本生成',vision:'图片分析',embedding:'Embedding',qdrant:'向量数据库',search:'网页搜索',asr:'语音转写',diarization:'说话人分离',queue:'后台队列'};
const ids=z.enum(Object.keys(names));
const error=(message,status=422)=>Object.assign(new Error(message),{status});
function configFor(id){const r=retrievalConfig();return id==='text'?providerConfig():id==='vision'?visionConfig():id==='embedding'?{baseUrl:r.embedding,model:r.model,apiKey:r.key}:id==='qdrant'?{baseUrl:r.qdrant}:id==='search'?{apiKey:webSearchKey()}:['asr','diarization'].includes(id)?localAudioCapability(id):id==='queue'?{host:process.env.REDIS_HOST||'127.0.0.1',port:Number(process.env.REDIS_PORT||6381)}:{};}
function revision(id,readConfig=configFor){return createHash('sha256').update(JSON.stringify({id,config:readConfig(id),revision:getSetting('capabilityConfigRevision',0)})).digest('hex');}
function configured(id,c){if(['asr','diarization'].includes(id))return c.available;if(id==='queue')return !!process.env.REDIS_HOST||existsSync('.local-runtime/redis/usr/bin/redis-server');if(id==='search')return !!c.apiKey;return !!c.baseUrl&&(!['text','vision','embedding'].includes(id)||!!c.model);}
export function capabilityList(){return Object.entries(names).map(([id,label])=>{
 const config=configFor(id),saved=getSetting('capabilityTest:'+id,null),version=revision(id);
 return {id,label,configured:configured(id,config),config:{baseUrl:config.baseUrl||'',model:config.model||'',hasKey:!!config.apiKey,...(id==='queue'?{host:config.host,port:config.port}:{})},source:id==='vision'?(getSetting('visionProvider',null)?'独立配置':'沿用文本配置，需单独验证'):id==='embedding'||id==='qdrant'?(getSetting('retrieval',null)?'设置':'环境或本地发现'):'当前配置',configRevision:version,test:saved?.configRevision===version?saved:null,notice:config.configError||(['asr','diarization'].includes(id)?'独立测试本地模型，使用已下载公开英语样本前15秒，最多等待90秒；不会读取私人录音。测试成功不代表中文质量或说话人数准确性已验收。':id==='qdrant'?'只读连接测试；索引写入和检索质量另行验证。':id==='queue'?'此项只测试Redis连接；实际任务执行需业务流程验收。':'')};});}
export async function probeCapability(id,{audioProbe=probeLocalAudio,readConfig=configFor}={}){validate(ids,id,{label:'能力'});const config=readConfig(id),version=revision(id,readConfig),started=Date.now();
 let result;
 try{
  if(!configured(id,config))throw error(config.configError||'此能力尚未配置或接入。');
  let detail;
  if(id==='text')detail={response:(await complete('请用中文简短回答。','请只回复：连接成功')).slice(0,150)};
  if(id==='vision'){
   const prompt='描述这张测试图片的颜色；如果无法读取图片请明确说明。';
   const pixel='iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAJklEQVR4nO3NMQ0AAAwDoPo33arYsQQMkB6LQCAQCAQCgUAg+BIMi1X0pjxKe0gAAAAASUVORK5CYII=';
   detail={response:(await complete('请只描述图片中可见的内容。',prompt,null,{maxTokens:150,userContent:[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:image/png;base64,'+pixel}}]})).slice(0,300),notice:'图片请求返回成功；具体识别质量需用实际资料核对。'};
  }
  if(['asr','diarization'].includes(id))detail=await audioProbe(id);
  if(id==='embedding')detail=await testEmbedding();
  if(id==='qdrant'){
   const response=await fetch(config.baseUrl+'/collections',{signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw error(`Qdrant 返回 ${response.status}。`,502);
   const body=await response.json();if(body.status!=='ok'||!Array.isArray(body.result?.collections))throw error('Qdrant 返回无效数据。',502);
   detail={collections:body.result.collections.length,notice:'只读连接成功'};
  }
  if(id==='search')detail={results:(await searchWeb('SQLite official documentation')).length};
  if(id==='queue'){
   const client=new Redis({...config,lazyConnect:true,connectTimeout:3000,maxRetriesPerRequest:1,retryStrategy:()=>null});client.on('error',()=>{});
   try{await client.connect();if(await client.ping()!=='PONG')throw error('Redis 未确认连接',502);detail={response:'PONG',notice:'连接成功不代表后台worker正在工作'};}finally{client.disconnect();}
  }
  result={ok:true,detail};
 }catch(cause){result={ok:false,error:cause.status?cause.message:'能力测试失败，请检查服务运行状态、地址和配置。'};}
 if(version!==revision(id,readConfig))throw error('测试期间配置已更改，请测试最新保存的配置。',409);
 const saved={...result,configRevision:version,checkedAt:new Date().toISOString(),durationMs:Date.now()-started};setSetting('capabilityTest:'+id,saved);
 return saved;
}
export function installCapabilities(app){
 app.get('/api/settings/capabilities',(_req,res)=>res.json({items:capabilityList()}));
 app.post('/api/settings/capabilities/:id/test',async(req,res)=>{validate(z.strictObject({}),req.body);res.json(await probeCapability(req.params.id));});
}
