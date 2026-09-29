#!/usr/bin/env python3
"""Download pinned public weights; only replace the target after checksum verification."""
import hashlib,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[2]
model=json.loads((root/'scripts/embedding/model.json').read_text())
target=root/'.local-model'/model['filename']
def valid(p):
 if not p.exists() or p.stat().st_size!=model['bytes']: return False
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
 return h.hexdigest()==model['sha256']
if valid(target): print('Model already verified:',target.name)
else:
 target.parent.mkdir(parents=True,exist_ok=True)
 partial=target.with_suffix('.gguf.partial')
 url=f"https://huggingface.co/{model['repository']}/resolve/{model['revision']}/{model['filename']}"
 subprocess.run(['curl','--fail','--location','--retry','3','--connect-timeout','30','--max-time','1800','--continue-at','-','--output',str(partial),url],check=True)
 if not valid(partial): raise RuntimeError('Model checksum/size mismatch; partial retained, target unchanged')
 partial.replace(target)
 print('Verified model:',target.name)
