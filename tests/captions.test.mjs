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
  assert.equal(form.get('model'), 'whisper-large-v3');
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
test('auto detection retains the spoken language and never forces an English language hint', async () => {
  const result=await transcribeAudio(new Uint8Array(44),{key:'test-only',fetchImpl:async(url,options)=>{
    assert(url.endsWith('/transcriptions'));assert.equal(options.body.has('language'),false);
    return {ok:true,json:async()=>({language:'hindi',segments:[{start:0,end:2,text:'नमस्ते दुनिया'}]})};
  }});
  assert.equal(result.language,'hindi');assert.equal(result.segments[0].text,'नमस्ते दुनिया');assert.equal(result.outputLanguage,'original');
});
test('English translates with the supported model while preserving detected source language and original captions',async()=>{
  const requests=[];
  const result=await transcribeAudio(new Uint8Array(44),{key:'test-only',output:'english',fetchImpl:async(url,options)=>{
    requests.push(url);const translation=url.endsWith('/translations');
    assert.equal(options.body.get('model'),translation?'whisper-large-v3':'whisper-large-v3');
    assert.equal(options.body.has('language'),false);
    if(translation)assert.equal(options.body.has('timestamp_granularities[]'),false);
    return {ok:true,json:async()=>({language:translation?'english':'hindi',segments:[{start:0,end:2,text:translation?'Hello world':'नमस्ते दुनिया'}]})};
  }});
  assert.equal(requests.length,2);assert.equal(result.language,'hindi');assert.equal(result.outputLanguage,'english');assert.equal(result.segments[0].text,'Hello world');assert.equal(result.originalSegments[0].text,'नमस्ते दुनिया');
});
test('missing translation timestamps fails clearly instead of inventing caption timing',async()=>{
  await assert.rejects(transcribeAudio(new Uint8Array(44),{key:'test-only',output:'english',fetchImpl:async url=>({ok:true,json:async()=>url.endsWith('/translations')?{text:'Hello'}:{language:'hindi',segments:[{start:0,end:1,text:'नमस्ते'}]}})}),/timestamps/);
});
test('explicit Hindi source is sent as hi and remains Hindi rather than translating',async()=>{
 let calls=0;
 const result=await transcribeAudio(new Uint8Array(44),{key:'test-only',language:'hi',output:'original',fetchImpl:async(url,options)=>{
 calls++;assert(url.endsWith('/transcriptions'));assert.equal(options.body.get('language'),'hi');assert.equal(options.body.get('model'),'whisper-large-v3');
 return {ok:true,json:async()=>({language:'hindi',segments:[{start:0,end:3,text:'नमस्ते यह हिंदी में एक उदाहरण है',no_speech_prob:.01}]})};
 }});
 assert.equal(calls,1);assert.equal(result.language,'hindi');assert.match(result.segments[0].text,/नमस्ते/);
});
test('long speech segments retain all text instead of truncating the end',async()=>{
 const text=Array.from({length:400},(_,i)=>'शब्द'+i).join(' ');
 const result=await transcribeAudio(new Uint8Array(44),{key:'test-only',fetchImpl:async()=>({ok:true,json:async()=>({segments:[{start:0,end:30,text}]})})});
 assert.equal(result.segments.map(s=>s.text).join(' '),text);
 assert.equal(result.segments.at(-1).end,30);
});
