"""Freeze corpus IDs/revisions and expected sources BEFORE retrieval is run."""
import sqlite3,json,hashlib,pathlib,datetime
c=sqlite3.connect('file:.data/shiguang.sqlite?mode=ro',uri=True)
sources=[]
for id,k,revision,raw in c.execute("SELECT id,kind,revision,data FROM entities WHERE deleted=0 AND kind IN ('note','memory','event','libraryFile') ORDER BY id"):
 d=json.loads(raw);text=d.get('content') or d.get('summary') or ''
 if not text or k=='memory' and d.get('status')!='active' or k=='libraryFile' and d.get('status')!='ready':continue
 sources.append(dict(id=id,kind=k,revision=revision,title=d.get('title'),sample=bool(d.get('sample')),contentHash=hashlib.sha256(text.encode()).hexdigest()))
questions=[
('去俄罗斯卖货时，供货方和转运仓分别负责什么运输环节？',['一人外贸公司（俄罗斯外贸，平台Ozon）','一、Ozon 跨境电商实战流程']),
('会议里建议跨境新手避开哪些商品合规风险？',['一人外贸公司（俄罗斯外贸，平台Ozon）','一、Ozon 跨境电商实战流程']),
('文件上传下载卡住整个服务时，之前有人建议怎样调整重计算的位置？',['流程/技术']),
('想找我那套玻璃按钮配复古色彩的界面主题方案。',['现在需要一共有三种主题，括号内为参考主题负责的内容','UI色彩主题']),
('界面交互应该自己做判断还是全部让AI决定？之前参考了哪些设计？',['UI/UX设计优化']),
('我给每日任务数量定过什么限制，想加第六件事怎么办？',['细节（不断更新）']),
('上次电脑手机连不上时，哪些热点、校园网和VPN组合试成功了？',['网络的神秘bug——重启手机解决了']),
('那款照顾灵魂乘客、最后送别他们的游戏适不适合拿来参考成长冒险？',['灵魂摆渡人参考报告']),
('面试里如何回答NPC回复质量、上下文过长和生成延迟的问题？',['腾娱客户端面试初试.md']),
('机器人工作流为什么取不到上传的图片，还出现了两次AI回复？',['项目实践周报5-13周.pdf','项目实践周报5-13周（更新）.pdf','陶昱遐人形机器人项目实践周报.pdf']),
('之前存过哪些在Linux或Jetson上装Ollama的文档入口？',['大模型部署.docx']),
('视觉检索项目的代码仓库链接存在哪里？',['项目代码github地址.txt']),
('机器人演示前，ROS语音模块和完整系统脚本怎么启动？',['操作流程(1).docx','操作流程.docx']),
('最早几周学习视觉语言模型和Transformer时记了哪些实践内容？',['项目实践周报1-4周.pdf','陶昱遐人形机器人项目实践周报.pdf']),
('机器人后来为什么不再主要用展厅场景，而拿杯子鼠标等日常物品测试？',['大三下项目实践总结报告_人机交互.docx']),
('最初的多模态检索原型怎样从单纯识图演进到结合知识库回答？',['开发全流程.docx']),
('我希望助手怎样帮我选小红书主题和督促发布？',['希望拾光可以完成的事情：']),
('游戏里玩家控制Live2D角色动作时，什么条件才算完成任务？',['LIVE2D的视觉锁定，类似于人可以操控这个角色做动作']),
('为什么大量文字图片录音混合导入后，模糊检索的速度会成为项目难点？',['项目难点']),
('秋招准备Agent岗位时，我记下了自己哪些技术和产品方面的短板？',['秋招思考'])]
fixed=[]
for i,(query,titles) in enumerate(questions,1):
 for title in titles:
  if not any(s['title']==title for s in sources):raise ValueError('Missing source title: '+title)
 fixed.append(dict(id=f'Q{i:02d}',query=query,expectedIds=[s['id'] for s in sources if s['title'] in titles]))
body={'frozenAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'stage':'baseline; not RET-A05 acceptance','corpus':sources,'userSourceCount':sum(not s['sample'] for s in sources),'sampleSourceCount':sum(s['sample'] for s in sources),'questions':fixed,'noAnswer':[{'id':'N01','query':'我家洗碗机上个月的维修工单编号是什么？','expectedIds':[]},{'id':'N02','query':'2025年火星地下冰层勘探的实测中微子通量是多少？','expectedIds':[]}],'limitations':['当前56个来源含7个演示样本，只有49个非演示来源；不能据此关闭50–200份代表性资料门槛。','先按原文固定预期，再运行检索；预期未穷举所有潜在等价材料。','RRF候选不等于有答案；无答案题单独报告。']}
out=pathlib.Path('artifacts/retrieval-questions-v1.json')
if out.exists():raise RuntimeError('Refusing to overwrite frozen labels')
out.write_text(json.dumps(body,ensure_ascii=False,indent=2)+'\n')
print({'questions':len(fixed),'sources':len(sources),'userSources':body['userSourceCount'],'sha256':hashlib.sha256(out.read_bytes()).hexdigest()})
