"""Independent local inference probes using the application's model loaders."""
import argparse
import json
import pathlib
from transcribe import decode_bounded, create_whisper, create_diarizer

parser = argparse.ArgumentParser()
parser.add_argument('capability', choices=['asr', 'diarization'])
parser.add_argument('--model', choices=['small', 'large-v3-turbo'], required=True)
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[2] / '.local-runtime' / 'asr-models'
try:
    # Fixed public test asset; never read a user's recording during settings tests.
    audio = decode_bounded(str(root / '1-two-speakers-en.wav'), 1800)[:16000 * 15]
    if args.capability == 'asr':
        model = create_whisper(root, args.model)
        segments, info = model.transcribe(audio, language='en', beam_size=5, word_timestamps=True, vad_filter=True)
        text = ' '.join(s.text.strip() for s in segments if s.text.strip())
        if not text:
            raise ValueError('No usable speech text')
        result = {'response': text[:300], 'notice': '公开英语样本转写返回非空内容；不代表中文识别质量已验收。'}
    else:
        turns = list(create_diarizer(root).process(audio).sort_by_start_time())
        if not turns:
            raise ValueError('No speaker segments')
        result = {'segments': len(turns), 'speakers': len(set(t.speaker for t in turns)), 'notice': '公开样本返回说话人时间段；人数准确性及中文分离质量需另行核对。'}
    print(json.dumps({'ok': True, 'detail': result}, ensure_ascii=False))
except Exception as error:
    # Dependency failures can contain private paths; return only an error class.
    print(json.dumps({'ok': False, 'errorType': type(error).__name__}))
