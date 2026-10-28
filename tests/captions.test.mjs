import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transcribeAudio } from '../server/captions.mjs';
test('speech segments are validated and split into readable timed captions', async () => {
  let form;
  const result = await transcribeAudio(new Uint8Array(44), {
    key: 'test-only',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.groq.com/openai/v1/audio/transcriptions');
      form = options.body;
      return {
        ok: true,
        json: async () => ({
          segments: [
            {
              start: 0,
              end: 8,
              text: 'one two three four five six seven eight nine ten',
              no_speech_prob: 0.1,
            },
            { start: 9, end: 10, text: 'noise', no_speech_prob: 0.9 },
            { start: NaN, end: 10, text: 'invalid' },
          ],
        }),
      };
    },
  });
  assert.equal(form.get('model'), 'whisper-large-v3-turbo');
  assert.equal(result.segments.length, 2);
  assert.equal(result.segments[0].end, result.segments[1].start);
  assert.equal(result.segments[1].end, 8);
  assert.equal(result.segments[1].text, 'nine ten');
});
test('rate limit gives a usable error', async () => {
  await assert.rejects(
    transcribeAudio(new Uint8Array(44), {
      key: 'test-only',
      fetchImpl: async () => ({ ok: false, status: 429 }),
    }),
    /rate limited/,
  );
});
