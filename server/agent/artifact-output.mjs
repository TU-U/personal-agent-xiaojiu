// SQLite is authoritative. Downloads are generated from this exact saved revision,
// never from an earlier task-artifacts file left by an old worker.
export function checkArtifactRevision(artifact,value){
 if(value===undefined)return;
 if(typeof value!=='string'||!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<1)throw Object.assign(new Error('成果版本无效。'),{status:400});
 if(Number(value)!==artifact.revision)throw Object.assign(new Error('成果已更新，请重新打开后导出最新保存版本。'),{status:409,current:artifact});
}
export function sendArtifact(res,artifact,revision){
 checkArtifactRevision(artifact,revision);
 const name=(artifact.title||'成果').replace(/[\r\n/\\]/g,'_').slice(0,100)+'.md';
 res.setHeader('Content-Type','text/markdown; charset=utf-8');
 res.setHeader('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(name));
 res.setHeader('X-Artifact-Revision',String(artifact.revision));
 res.setHeader('Cache-Control','no-store');
 res.send(artifact.body);
}
