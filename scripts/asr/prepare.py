"""Download public local ASR trial assets; never uploads user recordings."""
import argparse
import hashlib
import json
import pathlib
import tarfile
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('--model', choices=['small', 'large-v3-turbo'], default='small')
args = parser.parse_args()
ROOT = pathlib.Path(__file__).resolve().parents[2] / '.local-runtime' / 'asr-models'
ROOT.mkdir(parents=True, exist_ok=True)
BASE = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/'

def download(url, name):
    dest = ROOT / name
    if not dest.exists():
        print('Downloading', name, flush=True)
        temp = dest.with_suffix(dest.suffix + '.partial')
        with urllib.request.urlopen(url, timeout=120) as source, temp.open('wb') as output:
            while chunk := source.read(1024 * 1024):
                output.write(chunk)
        temp.replace(dest)
    return dest

archive = download(BASE + 'speaker-segmentation-models/sherpa-onnx-pyannote-segmentation-3-0.tar.bz2', 'segmentation.tar.bz2')
with tarfile.open(archive) as bundle:
    member = bundle.getmember('sherpa-onnx-pyannote-segmentation-3-0/model.onnx')
    if not member.isfile() or member.size > 100 * 1024 * 1024:
        raise ValueError('Unexpected segmentation asset')
    with bundle.extractfile(member) as source, (ROOT / 'segmentation.onnx').open('wb') as output:
        output.write(source.read())
download(BASE + 'speaker-recongition-models/3dspeaker_speech_eres2net_base_sv_zh-cn_3dspeaker_16k.onnx', 'speaker.onnx')
for name in ['0-four-speakers-zh.wav', '1-two-speakers-en.wav']:
    download(BASE + 'speaker-segmentation-models/' + name, name)

from huggingface_hub import HfApi, snapshot_download
repo = 'Systran/faster-whisper-small' if args.model == 'small' else 'mobiuslabsgmbh/faster-whisper-large-v3-turbo'
revision = HfApi().model_info(repo, token=False).sha
snapshot_download(repo, revision=revision, token=False, local_dir=ROOT / ('whisper-' + args.model),
                  allow_patterns=['config.json', 'model.bin', 'tokenizer.json', 'vocabulary.txt', 'vocabulary.json', 'preprocessor_config.json'])
files = []
for file in sorted(ROOT.rglob('*')):
    if file.is_file() and '.cache' not in file.parts and file.name != 'manifest.json':
        files.append({'path': str(file.relative_to(ROOT)), 'size': file.stat().st_size,
                      'sha256': hashlib.file_digest(file.open('rb'), 'sha256').hexdigest()})
(ROOT / ('manifest-' + args.model + '.json')).write_text(json.dumps({'whisperRepo': repo, 'whisperRevision': revision,
    'speakerSource': BASE, 'files': files}, ensure_ascii=False, indent=2))
print('Prepared trial assets:', ROOT, flush=True)
