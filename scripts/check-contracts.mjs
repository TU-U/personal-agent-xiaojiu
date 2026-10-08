import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {routes,CONTRACT_VERSION} from '../contracts/generated/routes.mjs';
import {contractValidator} from '../server/core/contracts.mjs';

const specification=JSON.parse(fs.readFileSync(new URL('../contracts/openapi.json',import.meta.url),'utf8'));
const root=new URL('../',import.meta.url);
const found=new Map();
function visitDirectory(dir){for(const entry of fs.readdirSync(new URL(dir+'/',root),{withFileTypes:true})){
 const file=dir+'/'+entry.name;if(entry.isDirectory()){visitDirectory(file);continue;}
 if(!file.endsWith('.mjs')||file.endsWith('.local.mjs'))continue;
 const tree=ts.createSourceFile(file,fs.readFileSync(new URL(file,root),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 function visit(n){
  if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&['app','router'].includes(n.expression.expression.getText(tree))&&['get','post','patch','put','delete'].includes(n.expression.name.text)){
   const arg=n.arguments[0];for(const value of arg&&ts.isArrayLiteralExpression(arg)?arg.elements:[arg])if(value&&ts.isStringLiteralLike(value)&&value.text.startsWith('/api/')){
    const key=n.expression.name.text.toUpperCase()+' '+value.text;
    if(found.has(key))throw new Error('Duplicate route: '+key);
    found.set(key,file+':'+(tree.getLineAndCharacterOfPosition(n.getStart(tree)).line+1));
   }
  }
  ts.forEachChild(n,visit);
 }visit(tree);
}}
visitDirectory('server');
const expected=new Set(routes.map(r=>r.method+' '+r.legacy));
for(const key of found.keys())if(!expected.has(key))throw new Error('Contract missing route: '+key);
for(const key of expected)if(!found.has(key))throw new Error('Handler missing route: '+key);
for(const name of Object.keys(specification.components.schemas))contractValidator({$ref:'#/components/schemas/'+name});
const counts=Object.fromEntries(['reviewed','legacy-owned','retired'].map(state=>[state,routes.filter(r=>r.coverage===state).length]));
if(process.argv.includes('--write-inventory')){
 const shape=s=>s?.$ref?.split('/').at(-1)||(s?.type==='object'?'内联对象':s?.type)||'待抽取';
 const lines=routes.map(route=>{
  const op=specification.paths[route.schemaPath][route.method.toLowerCase()];
  const body=op.requestBody?Object.entries(op.requestBody.content).map(([type,value])=>type+': '+shape(value.schema)).join('<br>'):'无';
  const responses=Object.entries(op.responses).filter(([code])=>code!=='default').map(([code,value])=>code+' '+Object.entries(value.content||{}).map(([type,value])=>type+': '+shape(value.schema)).join(', ')).join('<br>');
  const consumer=route.path.includes('/devices/')?'设备客户端（Android未接入v1）':'Web；桌面后续复用';
  return `| ${route.method} | \`${route.legacy}\` | \`${route.path}\` | ${body} | ${responses} | ${consumer} | ${route.coverage} | ${found.get(route.method+' '+route.legacy)} |`;
 });
 const document=`# 9.3 接口迁移清单\n\n由 \`npm run contracts:inventory\` 从协议和实际路由生成，不把路径接通当作字段抽取完成。\n\n协议版本：${CONTRACT_VERSION}；共 ${routes.length} 个操作。已抽取形状 ${counts.reviewed}；业务模块继续负责、待抽取 ${counts['legacy-owned']}；已退役 ${counts.retired}。\n\n新旧路径均调用同一处理函数；鉴权、事务、revision、opId、游标和附件存储不切换。错误仍为原 HTTP 状态与 \`{error,current?}\`。\n\n- \`reviewed\`：已抽取公共形状。新 JSON 请求使用共享形状校验，原业务校验继续执行；multipart 由原上传/业务处理器校验和清理文件。响应暂不在写入完成后阻断返回，代表路径在集成测试中校验。\n- \`legacy-owned\`：路径与传输已盘点，具体字段尚未全部抽取；前端该部分仍使用既有局部类型，不能计为完整强类型接入。\n- \`retired\`：已有 410 接口，迁移不重新开放。\n- 当前 /ask 为 JSON；ZIP 下载是流式字节输出，不代表聊天支持 SSE。未来新增流式事件需先补协议。\n- 资料库、调研、监督、记账复杂动作等剩余字段以此表为继续迁移清单。Android单独接入，未做手机测试或打包。\n\n| 方法 | 旧路径 | v1路径 | 请求 | 响应 | 消费者 | 字段状态 | 当前处理器 |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${lines.join('\n')}\n`;
 fs.writeFileSync(new URL('docs/25-contract-migration-inventory.md',root),document);
}
console.log(`Contracts ${CONTRACT_VERSION}: ${routes.length} route mappings; ${Object.keys(specification.components.schemas).length} schemas compile; ${JSON.stringify(counts)}`);
