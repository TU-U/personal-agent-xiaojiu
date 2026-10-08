import {z} from 'zod';
import {get} from '../../store.mjs';
import {validate} from '../../core/validation.mjs';
import {eventOperation} from './event-operation.mjs';
import {copyEventImages,discardEventImages,assertEventImageSource} from './event-images.mjs';
import {initializeEventLifecycle,editEventLifecycle} from './event-lifecycle.mjs';
export async function saveEventRequest(id,input,{prepare,copy=copyEventImages}={}){
 const {opId,...body}=validate(z.object({opId:z.string().min(8).max(100).optional()}).passthrough(),input,{label:'要事保存'});
 const operation=eventOperation(id?'save:'+id:'create',opId,body);
 if(operation.cached)return operation.cached;
 const old=id?get(id,'event'):null;
 if(id&&!old)throw Object.assign(new Error('要事不存在或已删除。'),{status:404});
 const revision=id?validate(z.number().int().positive(),body.revision,{label:'要事版本'}):undefined;
 const data=prepare(body,old||{}),note=data.sourceNoteId?get(data.sourceNoteId,'note'):null;
 const replace=!!note&&(!old||data.sourceNoteId!==old.sourceNoteId||!old.images?.length);
 const images=replace?await copy(note):old?.images||[];
 let wrote=false,retained=false;
 try{
  const event=operation.commit(()=>{
   const options={atomic:fn=>fn(),assertCurrent:()=>{if(replace)assertEventImageSource(note);}};
   const value=id?editEventLifecycle(id,{...data,images},revision,options):initializeEventLifecycle({...data,images},options);
   wrote=true;return value;
  });
  retained=wrote;
  if(wrote&&replace&&old)await discardEventImages(old.images);
  return event;
 }finally{if(replace&&!retained)await discardEventImages(images);}
}
