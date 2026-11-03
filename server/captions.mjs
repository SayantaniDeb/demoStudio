import { requestGroqKey } from './ai-key.mjs';
export async function transcribeAudio(
  audio,
  { key = process.env.GROQ_API_KEY, fetchImpl = fetch, output = 'original', language = 'auto' } = {},
) {
  if (!key) throw new Error('Add GROQ_API_KEY to enable speech captions.');
  const request = async (translate) => {
    const form = new FormData();
    form.append('file', new Blob([audio], { type: 'audio/wav' }), 'speech.wav');
    form.append('model', 'whisper-large-v3');
    form.append('response_format', 'verbose_json');
    if (!translate) form.append('timestamp_granularities[]', 'segment');
    // Auto remains multilingual; an explicit source hint helps misdetected Hindi/Hinglish.
    if (!translate && language !== 'auto') form.append('language', language);
    const response = await fetchImpl(`https://api.groq.com/openai/v1/audio/${translate ? 'translations' : 'transcriptions'}`, {
      method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form,
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) {
      if (response.status === 429) throw new Error('Speech transcription is rate limited. Try again shortly.');
      throw new Error(`Speech ${translate ? 'translation' : 'transcription'} failed (${response.status}).`);
    }
    return response.json();
  };
  const original = await request(false);
  const data = output === 'english' ? await request(true) : original;
  if (output === 'english' && !Array.isArray(data.segments)) throw new Error('English translation did not return caption timestamps. Try again.');
  const normalize = (data) => {
  const segments = (data.segments || [])
    .filter(
      (s) =>
        Number.isFinite(s.start) &&
        Number.isFinite(s.end) &&
        s.end > s.start &&
        typeof s.text === 'string' &&
        s.text.trim() &&
        (s.no_speech_prob ?? 0) < 0.8,
    )
    .map((s) => ({ start: s.start, end: s.end, text: s.text.trim() }));
  return segments.flatMap((s) => {
      const words = s.text.split(/\s+/),
        result = [];
      for (let i = 0; i < words.length; i += 8)
        result.push({
          start: s.start + ((s.end - s.start) * i) / words.length,
          end: s.start + ((s.end - s.start) * Math.min(words.length, i + 8)) / words.length,
          text: words.slice(i, i + 8).join(' '),
        });
      return result;
    });
  };
  return {
    segments: normalize(data),
    originalSegments: normalize(original),
    language: typeof original.language === 'string' ? original.language.slice(0,80) : null,
    outputLanguage: output === 'english' ? 'english' : 'original',
  };
}
export function captionMiddleware(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'POST required' }));
    return;
  }
  if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) {
    res.statusCode = 403;
    res.end(JSON.stringify({ error: 'Origin rejected' }));
    return;
  }
  if (!req.headers['content-type']?.startsWith('audio/wav')) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'WAV audio required' }));
    return;
  }
  const output = req.headers['x-caption-output'] || 'original';
  if (output !== 'original' && output !== 'english') {
    res.statusCode = 400; res.end(JSON.stringify({ error: 'Choose original or English captions.' })); return;
  }
  const language = req.headers['x-caption-language'] || 'auto';
  if (!['auto','hi','en','bn'].includes(language)) {res.statusCode=400;res.end(JSON.stringify({error:'Choose a supported spoken language.'}));return;}
  const chunks = [];
  let size = 0,
    tooLarge = false;
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > 24000000) {
      tooLarge = true;
      chunks.length = 0;
    } else if (!tooLarge) chunks.push(chunk);
  });
  req.on('end', async () => {
    try {
      if (tooLarge) throw Error('Audio chunk is too large.');
      if (size < 44) throw Error('Audio is empty.');
      res.end(
        JSON.stringify(await transcribeAudio(Buffer.concat(chunks), { key: requestGroqKey(req), output, language })),
      );
    } catch (e) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}
