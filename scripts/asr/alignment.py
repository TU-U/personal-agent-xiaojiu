"""Keep every ASR word; assign anonymous speakers only from overlapping audio."""

def align_segments(segments, turns, duration_ms):
    labels = {}
    for turn in sorted(turns, key=lambda t: t['startMs']):
        if turn['speakerId'] not in labels:
            labels[turn['speakerId']] = 'speaker_' + str(len(labels) + 1)
    output = []
    for segment in segments:
        words = segment.get('words') or []
        # Missing/inconsistent word timing must not discard the original segment.
        if not words or ''.join(w['text'] for w in words).strip() != segment['text'].strip():
            output.append({k: segment[k] for k in ['startMs', 'endMs', 'text']} | {'speakerId': None})
            continue
        parts = []
        for word in words:
            scores = {}
            for turn in turns:
                overlap = max(0, min(word['endMs'], turn['endMs']) - max(word['startMs'], turn['startMs']))
                if overlap:
                    label = labels[turn['speakerId']]
                    scores[label] = scores.get(label, 0) + overlap
            ranked = sorted(scores, key=scores.get, reverse=True)
            speaker = ranked[0] if ranked and (len(ranked) == 1 or scores[ranked[0]] > scores[ranked[1]]) else None
            # Zero-duration tokens (often punctuation) remain part of the text.
            if word['startMs'] == word['endMs'] and parts:
                parts[-1]['text'] += word['text']
                continue
            if parts and parts[-1]['speakerId'] == speaker:
                parts[-1]['text'] += word['text']
                parts[-1]['endMs'] = max(parts[-1]['endMs'], word['endMs'])
            else:
                parts.append({**word, 'speakerId': speaker})
        if any(p['startMs'] >= p['endMs'] for p in parts):
            parts = [{k: segment[k] for k in ['startMs', 'endMs', 'text']} | {'speakerId': None}]
        output.extend(parts)
    for segment in output:
        if not 0 <= segment['startMs'] < segment['endMs'] <= duration_ms:
            raise ValueError('转写时间超出原件时长，未保存不可靠结果')
    return output
