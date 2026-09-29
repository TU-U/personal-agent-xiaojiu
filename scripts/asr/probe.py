"""Local sample evaluation; this is not the application's ASR API yet."""
import argparse
import json
import pathlib
import time
import resource

parser = argparse.ArgumentParser()
parser.add_argument('audio')
parser.add_argument('--model', choices=['small', 'large-v3-turbo'], default='small')
parser.add_argument('--threshold', type=float, default=0.5)
parser.add_argument('--language', choices=['zh', 'en'])
parser.add_argument('--speakers', type=int, default=-1)
parser.add_argument('--output', required=True)
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[2] / '.local-runtime' / 'asr-models'
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio
import sherpa_onnx

started = time.monotonic()
audio = decode_audio(args.audio, sampling_rate=16000)
duration = len(audio) / 16000
model = WhisperModel(str(root / ('whisper-' + args.model)), device='cpu', compute_type='int8',
                     cpu_threads=4, local_files_only=True)
segments, info = model.transcribe(audio, language=args.language, beam_size=5,
                                 word_timestamps=True, vad_filter=True)
text = [{'startMs': round(s.start * 1000), 'endMs': round(s.end * 1000), 'text': s.text,
         'words': [{'startMs': round(w.start * 1000), 'endMs': round(w.end * 1000), 'text': w.word}
                   for w in (s.words or [])]} for s in segments]
asr_seconds = time.monotonic() - started
config = sherpa_onnx.OfflineSpeakerDiarizationConfig(
    segmentation=sherpa_onnx.OfflineSpeakerSegmentationModelConfig(
        pyannote=sherpa_onnx.OfflineSpeakerSegmentationPyannoteModelConfig(model=str(root / 'segmentation.onnx')),
        num_threads=2),
    embedding=sherpa_onnx.SpeakerEmbeddingExtractorConfig(model=str(root / 'speaker.onnx'), num_threads=2),
    clustering=sherpa_onnx.FastClusteringConfig(num_clusters=args.speakers, threshold=args.threshold),
    min_duration_on=0.3, min_duration_off=0.5)
if not config.validate():
    raise RuntimeError('Diarization configuration is invalid')
diarizer = sherpa_onnx.OfflineSpeakerDiarization(config)
turns = [{'startMs': round(s.start * 1000), 'endMs': round(s.end * 1000), 'speakerId': str(s.speaker)}
         for s in diarizer.process(audio).sort_by_start_time()]
result = {'audio': pathlib.Path(args.audio).name, 'durationSeconds': duration,
          'language': info.language, 'asrSeconds': asr_seconds, 'totalSeconds': time.monotonic() - started,
          'peakRssKiB': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
          'segments': text, 'speakerTurns': turns}
pathlib.Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2))
print(json.dumps({k: v for k, v in result.items() if k not in ['segments', 'speakerTurns']}, ensure_ascii=False))
print('segments:', len(text), 'speakers:', len(set(t['speakerId'] for t in turns)))
