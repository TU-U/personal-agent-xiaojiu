const invalid=message=>Object.assign(new Error(message),{status:409});
export function controlledLibraryJob(job,action){
 if(action==='pause'){
  if(job.status==='paused')return job;
  if(!['scanning','copying'].includes(job.status))throw invalid('当前没有可暂停的接入任务。');
  return {...job,status:'paused',resumeStatus:job.status};
 }
 if(action==='resume'){
  if(['scanning','copying'].includes(job.status))return job;
  if(!['paused','failed'].includes(job.status))throw invalid('当前没有可继续的接入任务。');
  const phase=job.resumeStatus==='scanning'||job.queue?.length?'scanning':'copying';
  return {...job,status:phase==='scanning'&&!job.queue?.length?'copying':phase,error:''};
 }
 throw Object.assign(new Error('无效接入操作。'),{status:400});
}
export function scannedDirectoryJob(latest,queue){
 const next=queue.length?'scanning':'copying';
 return {...latest,queue,status:latest.status==='paused'?'paused':next,resumeStatus:next,error:''};
}
