"""Download an optional public model in verified resumable chunks (no user files)."""
from pathlib import Path
from urllib.request import urlopen, Request
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib,time
ROOT=Path(__file__).resolve().parents[1]/'.local-model'
ROOT.mkdir(exist_ok=True)
URL='https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf'
SIZE=1117320736
EXPECTED='6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e'
CHUNK=8*1024*1024
PARTS=ROOT/'qwen-1.5b-parts';PARTS.mkdir(exist_ok=True)
def part(i):
 start=i*CHUNK;end=min(SIZE,start+CHUNK)-1;p=PARTS/str(i);size=end-start+1
 if p.exists() and p.stat().st_size==size:return i
 for attempt in range(4):
  try:
   req=Request(URL+f'?download=1&part={i}&retry={attempt}',headers={'Range':f'bytes={start}-{end}'})
   with urlopen(req,timeout=35) as r:
    if r.status!=206:raise ValueError(f'Range not supported: {r.status}')
    expected=f'bytes {start}-{end}/{SIZE}'
    if r.headers.get('Content-Range')!=expected:raise ValueError('Unexpected Content-Range')
    data=r.read(size+1)
    if len(data)!=size:raise ValueError('Incomplete chunk')
   p.write_bytes(data);return i
  except Exception as e:
   if attempt==3:raise RuntimeError(f'Chunk {i}: {type(e).__name__}') from None
   time.sleep(1)
with ThreadPoolExecutor(max_workers=6) as pool:
 futures=[pool.submit(part,i) for i in range((SIZE+CHUNK-1)//CHUNK)]
 for count,f in enumerate(as_completed(futures),1):
  f.result()
  if count%10==0:print(f'{count}/{len(futures)} chunks verified',flush=True)
out=ROOT/'qwen2.5-1.5b-instruct-q4_k_m.gguf'
with out.open('wb') as dest:
 for i in range(len(futures)):dest.write((PARTS/str(i)).read_bytes())
if hashlib.sha256(out.read_bytes()).hexdigest()!=EXPECTED:raise RuntimeError('SHA-256 mismatch')
print('Model complete; official SHA-256 verified.',flush=True)
