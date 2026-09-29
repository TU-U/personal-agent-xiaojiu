import {test,after} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import os from 'node:os';import path from 'node:path';
const dir=mkdtempSync(path.join(os.tmpdir(),'shiguang-engine-'));process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';
const {tokens,searchNotes,evidenceFor,validateGeneration,renderExtractiveSections,providerConfig}=await import('../server/engine.mjs');const {db,setSetting}=await import('../server/store.mjs');
const fixtures=[{id:'1',title:'支付接口验收',content:'星河项目已经完成支付接口验收，回调重试还有风险。',tags:['工作'],project:'星河',createdAt:'2026-09-22',pinned:false},{id:'2',title:'三个生活问题',content:'散步时想到的三个小问题，生活需要留白。',tags:['生活'],project:'',createdAt:'2026-09-21',pinned:true},{id:'3',title:'读书笔记',content:'写作时先思考读者，再整理提纲。',tags:['阅读'],project:'成长',createdAt:'2026-09-20'}];
test('Chinese word segmentation does not cross grammatical boundaries',()=>{assert.equal(tokens('木卫二冰层下的三叠纪珊瑚').includes('的三'),false);assert.equal(evidenceFor('木卫二冰层下的三叠纪珊瑚',fixtures).length,0);});
test('relevant Chinese queries and project filters retrieve the expected note',()=>{assert.equal(searchNotes('支付接口',{},fixtures)[0].id,'1');assert.equal(searchNotes('写作',{},fixtures)[0].id,'3');assert.equal(searchNotes('接口',{project:'成长'},fixtures).length,0);});
test('pin ordering treats missing booleans as false',()=>{assert.equal(searchNotes('',{},fixtures)[0].id,'2');});
test('saved model settings override startup environment defaults',()=>{
 const oldUrl=process.env.LLM_BASE_URL,oldModel=process.env.LLM_MODEL;
 try{
  process.env.LLM_BASE_URL='http://127.0.0.1:4318/v1';process.env.LLM_MODEL='local-default';
  assert.equal(providerConfig().model,'local-default');
  setSetting('provider',{baseUrl:'https://api.deepseek.com',model:'deepseek-flash',apiKey:'test-secret'});
  assert.equal(providerConfig().model,'deepseek-flash');
  assert.equal(providerConfig().baseUrl,'https://api.deepseek.com');
 }finally{
  if(oldUrl===undefined)delete process.env.LLM_BASE_URL;else process.env.LLM_BASE_URL=oldUrl;
  if(oldModel===undefined)delete process.env.LLM_MODEL;else process.env.LLM_MODEL=oldModel;
 }
});
test('question evidence retains original quote and does not generate facts',()=>{const sources=evidenceFor('支付有什么风险',fixtures);assert.equal(sources[0].id,'1');assert.ok(fixtures[0].content.includes(sources[0].quote));});
after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});

test('generation gate rejects fake citations, empty answers and repetition',()=>{const sources=[{id:'1'}];assert.equal(validateGeneration('[1]',sources).ok,false);assert.equal(validateGeneration('这是一段很长但引用并不存在的生成结果。[99]',sources).ok,false);assert.equal(validateGeneration('这一段文字没有引用编号，即使内容很流畅也不能直接显示为可核对回答。',sources).ok,false);assert.equal(validateGeneration('项目的正式手机端优先 Android，先用网页版进行演示。[1]',sources).ok,true);});

test("local writing renders only original excerpts and rejects invented IDs",()=>{const excerpts=[{text:"下周计划：验证DOCX解析和手机上传体验。",source:2}];const sections=[{heading:"后续计划",excerpt_ids:[1,1]}];assert.equal(renderExtractiveSections(sections,excerpts),"## 后续计划\n\n- 下周计划：验证DOCX解析和手机上传体验。 [2]");assert.throws(()=>renderExtractiveSections([{heading:"已完成",excerpt_ids:[1]}],excerpts));assert.throws(()=>renderExtractiveSections([{heading:"资料要点",excerpt_ids:[2]}],excerpts));});
