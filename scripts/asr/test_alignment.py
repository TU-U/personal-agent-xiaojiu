import unittest
from alignment import align_segments

class AlignmentTests(unittest.TestCase):
    def test_speaker_changes_keep_words_and_anonymous_ids(self):
        segments = [{'startMs': 0, 'endMs': 2000, 'text': '你好 world!', 'words': [
            {'startMs': 0, 'endMs': 900, 'text': '你好'},
            {'startMs': 1000, 'endMs': 2000, 'text': ' world'},
            {'startMs': 2000, 'endMs': 2000, 'text': '!'}]}]
        turns = [{'startMs': 0, 'endMs': 900, 'speakerId': '7'}, {'startMs': 1000, 'endMs': 2000, 'speakerId': '3'}]
        result = align_segments(segments, turns, 2000)
        self.assertEqual(''.join(x['text'] for x in result), '你好 world!')
        self.assertEqual([x['speakerId'] for x in result], ['speaker_1', 'speaker_2'])

    def test_missing_word_text_and_uncovered_audio_are_not_guessed(self):
        segment = {'startMs': 0, 'endMs': 1000, 'text': '完整原文', 'words': [{'startMs': 0, 'endMs': 1000, 'text': '部分'}]}
        result = align_segments([segment], [], 1000)
        self.assertEqual(result[0]['text'], '完整原文')
        self.assertIsNone(result[0]['speakerId'])
        with self.assertRaises(ValueError):
            align_segments([segment], [], 500)

if __name__ == '__main__':
    unittest.main()
