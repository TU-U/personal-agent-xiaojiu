import json,urllib.request,urllib.parse,http.cookiejar,sys,pathlib
expected=sys.argv[1];base='http://127.0.0.1:4317/api'
client=urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(route,body=None):
 data=None if body is None else json.dumps(body).encode()
 with client.open(urllib.request.Request(base+route,data=data,headers={'Content-Type':'application/json'}),timeout=30) as response:return json.load(response)
call('/login',{'code':'shiguang-demo'})
cap=next(x for x in call('/settings/capabilities')['items'] if x['id']=='embedding')
assert cap['config']['model']==expected,cap['config']['model']
result=call('/library/search?q='+urllib.parse.quote('Linux上安装Ollama的文档链接'))
assert result['mode']=='hybrid'
assert any(x['id']=='1e515f60-c2e7-4afa-bc97-189c7287dff1' for x in result['results'])
proof={'model':expected,'mode':result['mode'],'foundExpected':True,'returned':len(result['results']),'ids':[x['id'] for x in result['results']]}
with pathlib.Path(sys.argv[2]).open('x') as f:json.dump(proof,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps(proof,ensure_ascii=False))
