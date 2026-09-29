#!/usr/bin/env python3
"""Start the verified Qwen candidate service without changing the active retrieval config."""
import json,os,pathlib,subprocess,urllib.request,time,socket
root=pathlib.Path(__file__).resolve().parents[2]
port=4320
manifest=json.loads((root/'scripts/embedding/model.json').read_text())
def response(route):
 with urllib.request.urlopen(f'http://127.0.0.1:{port}/{route}',timeout=2) as r:return json.load(r)
try:
 models=response('v1/models')
 if [x['id'] for x in models.get('data',[])]!=['qwen3-embedding-0.6b']:raise RuntimeError('Port 4320 belongs to a different model; refusing to replace it')
 pid=(root/'.data/qwen-embedding.pid').read_text().strip()
 if not pid.isdigit():raise RuntimeError('Invalid Qwen service PID record')
 args=pathlib.Path(f'/proc/{pid}/cmdline').read_bytes().decode().split('\0')
 for flag,value in [('--model',str(root/'.local-model'/manifest['filename'])),('--pooling','last'),('--embd-normalize','2'),('--port',str(port))]:
  if flag not in args or args[args.index(flag)+1]!=value:raise RuntimeError('Running service does not match the pinned launch contract')
 print('Qwen service already running on loopback port',port)
except (urllib.error.URLError,TimeoutError):
 with socket.socket() as sock:
  sock.settimeout(1)
  if sock.connect_ex(('127.0.0.1',port))==0:raise RuntimeError('Port 4320 is already bound but not ready; inspect its process/log instead of restarting')
 subprocess.run(['python3',str(root/'scripts/embedding/prepare.py')],check=True)
 binary=root/'.local-model/llama-b10964/llama-server'
 if not binary.is_file():raise RuntimeError('Pinned llama.cpp b10964 runtime missing')
 version=subprocess.run([str(binary),'--version'],capture_output=True,text=True,check=True)
 if 'b29c606e2' not in version.stdout+version.stderr:raise RuntimeError('Runtime version does not match embedding manifest')
 args=[str(binary),'--model',str(root/'.local-model'/manifest['filename']),'--host','127.0.0.1','--port',str(port),'--embedding','--pooling','last','--embd-normalize','2','--ctx-size','8192','--batch-size','8192','--ubatch-size','8192','--threads','4','--parallel','1','--alias','qwen3-embedding-0.6b','--no-webui']
 (root/'.data/logs').mkdir(parents=True,exist_ok=True)
 with (root/'.data/logs/qwen-embedding.log').open('ab') as log:
  child=subprocess.Popen(args,cwd=root,stdout=log,stderr=log,start_new_session=True)
 (root/'.data/qwen-embedding.pid').write_text(str(child.pid))
 for _ in range(45):
  if child.poll() is not None:raise RuntimeError('Qwen service exited; inspect .data/logs/qwen-embedding.log')
  try:
   if response('health').get('status')=='ok':break
  except (urllib.error.URLError,TimeoutError):pass
  time.sleep(1)
 else:raise RuntimeError('Qwen still initializing; inspect the saved PID/log before restarting')
 print('Qwen candidate service ready:',child.pid,'127.0.0.1:'+str(port))
