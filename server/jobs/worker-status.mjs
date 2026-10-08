// Process-local observation of the API-owned child; never infer liveness from
// old persisted heartbeats or from Redis PING alone.
export function createWorkerStatus({enabled=true,clock=Date.now}={}){
 let current=null,lastExit=null;
 return {
  start(pid){current={pid,startedAt:clock(),heartbeatAt:null,queueReady:false,error:false};},
  message(pid,message){if(current?.pid!==pid||message?.type!=='worker-status'||typeof message.queueReady!=='boolean'||typeof message.error!=='boolean')return;current={...current,heartbeatAt:clock(),queueReady:message.queueReady,error:message.error};},
  exit(pid){if(current?.pid!==pid)return;lastExit=clock();current=null;},
  snapshot(){const time=clock(),fresh=current?.heartbeatAt!==null&&current?.heartbeatAt!==undefined&&time-current.heartbeatAt<=10000;
   const state=!enabled?'disabled':!current?'stopped':!fresh?(time-current.startedAt<=10000?'starting':'unresponsive'):current.error||!current.queueReady?'degraded':'ready';
   return {state,checkedAt:new Date(time).toISOString(),pid:current?.pid??null,heartbeatAt:current?.heartbeatAt?new Date(current.heartbeatAt).toISOString():null,lastExitAt:lastExit?new Date(lastExit).toISOString():null,queueReady:!!fresh&&!!current?.queueReady};
  }
 };
}
