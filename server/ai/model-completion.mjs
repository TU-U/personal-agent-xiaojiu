import {logAiEvent} from '../core/ai-log.mjs';
import {piRequest,piUserContent} from './pi-provider.mjs';
export async function requestCompletion(config,system,user,schema=null,options={}){
 config={...config};
 if(!config.baseUrl||!config.model){logAiEvent({stage:'skipped',kind:'chat',reason:'未配置模型'});return null;}
 const result=await piRequest(config,{systemPrompt:system,messages:[{role:'user',content:piUserContent(options.userContent||user),timestamp:Date.now()}]},{...options,schema});
 const {message,...details}=result;
 return options.returnDetails?details:details.content;
}
