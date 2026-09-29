import sqlite3,json,hashlib,pathlib,datetime
root=pathlib.Path('.').resolve(); c=sqlite3.connect('file:.data/shiguang.sqlite?mode=ro',uri=True)
hash=lambda b:hashlib.sha256(b).hexdigest()
rows=[]
for id,k,revision,raw in c.execute("SELECT id,kind,revision,data FROM entities WHERE deleted=0 AND kind IN ('note','memory','event','libraryFile') ORDER BY id"):
 d=json.loads(raw);text=d.get('content') or d.get('summary') or ''
 if d.get('sample') or not text or k=='memory' and d.get('status')!='active' or k=='libraryFile' and d.get('status')!='ready':continue
 rows.append({'id':id,'kind':k,'revision':revision,'data':d,'origin':'existing-user-source','hash':hash(text.encode())})
for name in ['09-v1-overview.md','10-phase2-product-plan.md','11-phase2-implementation.md','17-confirmed-requirements.md']:
 text=(root/'docs'/name).read_text(); digest=hash(('project-doc:'+name).encode());id=f'{digest[:8]}-{digest[8:12]}-{digest[12:16]}-{digest[16:20]}-{digest[20:32]}'
 rows.append({'id':id,'kind':'libraryFile','revision':1,'data':{'id':id,'revision':1,'title':name,'content':text,'status':'ready','sample':False,'sourcePath':'docs/'+name},'origin':'project-document-copy','hash':hash(text.encode())})
questions=[
('V1的网页能直接自动转写录音吗，当时要怎样让录音进入检索？',['09-v1-overview.md']),
('V1把结构化内容和上传附件分别存到服务器哪里？',['09-v1-overview.md']),
('当时网页端记账到底已经可用还是只有规划入口？',['09-v1-overview.md']),
('用户已经确认的录音语言、时间标注和发言者要求有哪些？',['17-confirmed-requirements.md']),
('按用户答复，单次调研运行多久、花多少钱就应该停止？',['17-confirmed-requirements.md']),
('对话产生的记忆候选一直不处理，会在什么时候过期？',['17-confirmed-requirements.md']),
('记录变为要事后，要继续原来的聊天还是保留独立话题？',['17-confirmed-requirements.md']),
('账单中的退款、内部转账和花呗还款分别怎么计算？',['17-confirmed-requirements.md']),
('录音里的不同人应该直接认姓名还是用匿名编号？',['17-confirmed-requirements.md']),
('我曾提出用什么条件来判断每天的监督任务算完成？',['希望拾光可以完成的事情：']),
('我想做的游戏主角与探索成长方向是什么？',['我想做一个少女闯世界的探险成长向游戏。']),
('这次demo开发给初学者节省了大概多久，记录里的感受是什么？',['终于成功开发了一个demo']),
('在跨境上架流程中，本地图片为什么需要先放到一个公开网址？',['一人外贸公司（俄罗斯外贸，平台Ozon）','一、Ozon 跨境电商实战流程']),
('如何把俄语商品信息批量发到店铺后台？',['一人外贸公司（俄罗斯外贸，平台Ozon）','一、Ozon 跨境电商实战流程']),
('在原来的产品反馈里，置顶按钮和编辑入口希望放在哪里？',['细节（不断更新）']),
('对图片在手机上的编辑，我明确提过哪些操作要求？',['图片的使用']),
('我记录过什么关于项目环境变量文件管理的建议？',['给项目增加.env的库管理环境变量吧']),
('访谈笔记里，对游戏agent的生成质量我提到过哪种评审办法？',['腾娱客户端面试初试.md']),
('那份设计方案中，自然风格主题由哪些参考风格分工配合？',['UI色彩主题','现在需要一共有三种主题，括号内为参考主题负责的内容']),
('游戏角色获得二段跳和滑翔能力后，怎样进入新的区域？',['灵魂摆渡人参考报告'])]
fixed=[]
for i,(q,titles) in enumerate(questions,1):
 expected=[r['id'] for r in rows if r['data']['title'] in titles]
 if not expected:raise RuntimeError('Missing title '+str(titles))
 fixed.append({'id':f'H{i:02d}','query':q,'expectedIds':expected})
manifest={'frozenAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'corpus':[{'id':r['id'],'kind':r['kind'],'revision':r['revision'],'title':r['data']['title'],'contentHash':r['hash'],'origin':r['origin']} for r in rows],'questions':fixed,'noAnswer':[{'id':'U01','query':'我家蓝鲸牌洗衣机电机的保修截止日期是几号？','expectedIds':[]},{'id':'U02','query':'上次冰岛火山岩同位素取样实验测得的锶同位素比值是多少？','expectedIds':[]}],'policyFrozen':'qwen-local-calibration-v1 cosine >= 0.45','limitations':['53来源包括49个既有非演示来源与4份实际项目文档；未添加虚构资料。','20道新表述题在检索前固定，语料与基线部分共享，属于问题留出而非全新语料评测。','资料数量及场景为本机当前授权材料，不能推广成其他用户语料的准确率。']}
private=root/'.data/evaluations/ret-heldout-v2';private.mkdir(parents=True,exist_ok=True)
with (private/'corpus.json').open('x') as f:json.dump(rows,f,ensure_ascii=False)
with (root/'artifacts/retrieval-heldout-questions-v2.json').open('x') as f:json.dump(manifest,f,ensure_ascii=False,indent=2);f.write('\n')
print({'sources':len(rows),'questions':len(fixed),'privateCorpus':str(private),'labelsSha256':hash((root/'artifacts/retrieval-heldout-questions-v2.json').read_bytes())})
