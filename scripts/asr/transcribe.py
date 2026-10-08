"""One local audio job. JSON lines on stdout; no network/model downloads."""
import argparse
import ctypes
import json
import os
import pathlib
import signal
import sys

def emit(stage, **value):
    print(json.dumps({'stage': stage, **value}, ensure_ascii=False), flush=True)

def decode_bounded(filename, max_seconds):
    import av
    import numpy as np
    chunks = []
    count = 0
    with av.open(filename) as container:
        if not container.streams.audio:
            raise ValueError('原件没有音轨')
        resampler = av.AudioResampler(format='flt', layout='mono', rate=16000)
        for frame in container.decode(audio=0):
            for converted in resampler.resample(frame):
                data = converted.to_ndarray().reshape(-1)
                count += len(data)
                if count > max_seconds * 16000:
                    raise ValueError(f'当前本地转写上限为{max_seconds // 60}分钟，请拆分原件后重试')
                chunks.append(data)
        for converted in resampler.resample(None):
            data = converted.to_ndarray().reshape(-1)
            count += len(data)
            if count > max_seconds * 16000:
                raise ValueError('音频超过转写时长上限')
            chunks.append(data)
    if not count:
        raise ValueError('音轨为空')
    return np.concatenate(chunks)

def create_diarizer(root, speakers=-1, threshold=0.7):
    import sherpa_onnx
    config = sherpa_onnx.OfflineSpeakerDiarizationConfig(
        segmentation=sherpa_onnx.OfflineSpeakerSegmentationModelConfig(
            pyannote=sherpa_onnx.OfflineSpeakerSegmentationPyannoteModelConfig(model=str(root / 'segmentation.onnx')), num_threads=2),
        embedding=sherpa_onnx.SpeakerEmbeddingExtractorConfig(model=str(root / 'speaker.onnx'), num_threads=2),
        clustering=sherpa_onnx.FastClusteringConfig(num_clusters=speakers, threshold=threshold),
        min_duration_on=0.3, min_duration_off=0.5)
    if not config.validate():
        raise ValueError('分离模型配置不可用')
    diarizer = sherpa_onnx.OfflineSpeakerDiarization(config)
    return diarizer

def create_whisper(root, model):
    from faster_whisper import WhisperModel
    return WhisperModel(str(root / ('whisper-' + model)), device='cpu', compute_type='int8',
                        cpu_threads=4, local_files_only=True)

def run(args):
    from alignment import align_segments
    root = pathlib.Path(__file__).resolve().parents[2] / '.local-runtime' / 'asr-models'
    emit('decoding')
    audio = decode_bounded(args.audio, args.max_seconds)
    duration = round(len(audio) / 16)
    emit('transcribing', durationMs=duration)
    model = create_whisper(root, args.model)
    segments, info = model.transcribe(audio, language=args.language, beam_size=5, word_timestamps=True, vad_filter=True)
    transcript = []
    for segment in segments:
        if not segment.text.strip():
            continue
        transcript.append({'startMs': round(segment.start * 1000), 'endMs': round(segment.end * 1000), 'text': segment.text,
                           'words': [{'startMs': round(w.start * 1000), 'endMs': round(w.end * 1000), 'text': w.word} for w in (segment.words or [])]})
        emit('transcribing', processedMs=round(segment.end * 1000), durationMs=duration)
    if not transcript:
        raise ValueError('未识别到可用语音文字；原件保留，请检查录音或重试')
    emit('diarizing', durationMs=duration)
    turns = []
    diarization = {'state': 'completed'}
    try:
        diarizer = create_diarizer(root, args.speakers, args.threshold)
        turns = [{'startMs': round(t.start * 1000), 'endMs': round(t.end * 1000), 'speakerId': str(t.speaker)}
                 for t in diarizer.process(audio).sort_by_start_time()]
        if not turns:
            raise ValueError('未得到说话人时间段')
    except Exception as error:
        print('Diarization error: ' + type(error).__name__, file=sys.stderr, flush=True)
        diarization = {'state': 'failed', 'error': '说话人分离未成功，已保留转写文字；可以重试分离或手动修订。'}
    aligned = align_segments(transcript, turns, duration)
    emit('completed', result={'durationMs': duration, 'language': info.language, 'model': 'faster-whisper/' + args.model,
                              'segments': aligned, 'diarization': diarization})

if __name__ == '__main__':
    # Stop inference if its Node worker is killed, including SIGKILL/restart.
    if sys.platform.startswith('linux') and os.environ.get('ASR_PARENT_GUARD') == '1':
        parent = os.getppid()
        ctypes.CDLL(None).prctl(1, signal.SIGTERM)
        if parent == 1 or os.getppid() != parent:
            sys.exit(1)
    parser = argparse.ArgumentParser()
    parser.add_argument('audio')
    parser.add_argument('--model', choices=['small', 'large-v3-turbo'], default='large-v3-turbo')
    parser.add_argument('--language', choices=['zh', 'en'])
    parser.add_argument('--speakers', type=int, choices=[-1, *range(1, 21)], default=-1)
    parser.add_argument('--threshold', type=float, default=0.7)
    parser.add_argument('--max-seconds', type=int, choices=range(1, 1801), default=1800)
    try:
        run(parser.parse_args())
    except Exception as error:
        emit('failed', error=str(error)[:500])
        sys.exit(1)
