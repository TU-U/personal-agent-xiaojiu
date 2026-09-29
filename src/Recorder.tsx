import {useState,useRef,useEffect} from 'react';
import {Mic,Square,Upload} from 'lucide-react';
import {api} from './api';
import {Modal,ErrorBanner,Spinner} from './components';
import type {Note} from './types';
export default function Recorder({onClose,onSaved}:{onClose:()=>void;onSaved:(n:Note)=>void}){
 const [state,setState]=useState<'idle'|'requesting'|'recording'|'recorded'|'uploading'>('idle'),[seconds,setSeconds]=useState(0),[error,setError]=useState(''),[url,setUrl]=useState('');
 const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),chunks=useRef<Blob[]>([]),file=useRef<File|null>(null),urlRef=useRef(''),mounted=useRef(true),operation=useRef(''),started=useRef(0);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());if(urlRef.current)URL.revokeObjectURL(urlRef.current);};},[]);
 useEffect(()=>{if(state==='idle')return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[state]);
 useEffect(()=>{if(state!=='recording')return;const timer=setInterval(()=>{const elapsed=Math.floor((Date.now()-started.current)/1000);setSeconds(elapsed);if(elapsed>=1800&&recorder.current?.state==='recording'){setError('已达到30分钟上限，录音已停止，请保存后继续录制。');recorder.current.stop();}},250);return()=>clearInterval(timer);},[state]);
 async function start(){
  if(state==='recorded'&&!window.confirm('重新录制将替换尚未保存的录音，是否继续？'))return;
  setError('');if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){setError('当前连接不支持麦克风录音。请用 HTTPS 或本机 localhost 打开；局域网 HTTP 可直接导入已有音频。');return;}
  const previous=state;setState('requesting');
  try{
   const media=await navigator.mediaDevices.getUserMedia({audio:true});if(!mounted.current){media.getTracks().forEach(t=>t.stop());return;}stream.current=media;
   const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
   if(!mime)throw new Error('FORMAT');
   const current=new MediaRecorder(media,{mimeType:mime});recorder.current=current;chunks.current=[];let size=0;
   current.ondataavailable=e=>{if(e.data.size){chunks.current.push(e.data);size+=e.data.size;if(size>=24*1024*1024&&current.state==='recording'){setError('录音已接近上传大小上限，已停止，请先保存。');current.stop();}}};
   current.onstop=()=>{media.getTracks().forEach(t=>t.stop());if(!mounted.current)return;const ext=mime.includes('mp4')?'m4a':mime.includes('ogg')?'ogg':'webm';file.current=new File(chunks.current,`语音记录-${new Date().toISOString().replace(/[:.]/g,'-')}.${ext}`,{type:mime});operation.current=crypto.randomUUID();if(urlRef.current)URL.revokeObjectURL(urlRef.current);urlRef.current=URL.createObjectURL(file.current);setUrl(urlRef.current);setState('recorded');};
   current.onerror=()=>{setError('录音设备中断，请试听已录部分后保存。');if(current.state==='recording')current.stop();};
   current.start(1000);started.current=Date.now();setSeconds(0);file.current=null;setState('recording');
  }catch(e){stream.current?.getTracks().forEach(t=>t.stop());if(!mounted.current)return;const cause=e as Error;setError(cause.name==='NotAllowedError'?'麦克风权限被拒绝，请在浏览器设置中允许后重试。':cause.name==='NotFoundError'?'没有找到麦克风，请连接设备或导入已有音频。':cause.message==='FORMAT'?'浏览器没有支持的录音格式，请导入已有音频。':'无法开始录音，请检查麦克风是否被其他应用占用。');setState(previous);}
 }
 async function upload(){if(!file.current)return;setState('uploading');setError('');try{if(file.current.size>25*1024*1024)throw new Error('录音超过25MB，请先下载到电脑拆分后导入。');if(!file.current.size)throw new Error('录音为空，请重新录制。');const form=new FormData();form.append('file',file.current);form.append('opId',operation.current);const n=await api<Note>('/import',{method:'POST',body:form});onSaved(n);}catch(e){setError((e as Error).message);setState('recorded');}}
 function close(){if(state==='uploading')return;if((state==='recording'||state==='recorded')&&!window.confirm('录音还未保存，确定放弃吗？'))return;onClose();}
 return <Modal title="把想法说出来" onClose={close} closeDisabled={state==='uploading'}><div className="recorder"><ErrorBanner message={error}/><div className={'record-disc '+(state==='recording'?'recording':'')}><Mic size={36} strokeWidth={1.4}/></div><div className="record-time" role="timer">{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</div><p role="status">{state==='requesting'?'等待麦克风权限…':state==='recording'?'正在录音，请保持页面打开':state==='recorded'?'录好了，听一听再保存':'一句话，也值得记下来'}</p>{url&&state!=='recording'&&<audio controls src={url}/>}<div className="button-row">{state==='idle'||state==='recorded'?<button className="btn secondary" onClick={()=>void start()}><Mic size={17}/>{state==='recorded'?'重新录制':'开始录音'}</button>:state==='recording'?<button className="btn primary" onClick={()=>recorder.current?.stop()}><Square size={15}/>结束录音</button>:null}{state==='recorded'||state==='uploading'?<button className="btn primary" onClick={()=>void upload()} disabled={state==='uploading'}>{state==='uploading'?<Spinner label="保存中"/>:<><Upload size={16}/>保存录音</>}</button>:null}{state==='recorded'&&url&&<a className="btn secondary" href={url} download={file.current?.name}>下载录音备份</a>}</div><p className="field-help">保存后可在详情进行本地转写和 AI 归纳。<br/>录制时请保持页面打开；上传失败可以重试或下载备份，刷新页面会丢失未保存录音。</p></div></Modal>;
}
