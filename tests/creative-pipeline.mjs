import assert from 'node:assert/strict';
import { validateCreative } from '../shared/creative.mjs';
import { generateCreative } from '../server/creative.mjs';
const node = {
  kind: 'path',
  x: 0,
  y: 0,
  width: 160,
  height: 120,
  fill: '#9876ef',
  path: 'M0 60 Q80 -20 160 60 Q80 150 0 60 Z',
};
const plan = {
  scenes: [
    {
      title: 'Custom curved object',
      duration: 6,
      background: '#f6f4ee',
      components: [
        {
          name: 'Morph-like capsule',
          elements: [node],
          keyframes: [
            { time: 0, x: 100, y: 200, scale: 0.1, rotation: -30, opacity: 0 },
            { time: 2, x: 400, y: 280, scale: 1, rotation: 10, opacity: 1 },
            { time: 6, x: 800, y: 200, scale: 1.2, rotation: 0, opacity: 1 },
          ],
        },
      ],
    },
  ],
};
assert.equal(validateCreative(plan).scenes[0].components[0].elements[0].path, node.path);
const unusedFont = structuredClone(plan);
unusedFont.scenes[0].components[0].elements[0].fontSize = 0;
assert.doesNotThrow(() => validateCreative(unusedFont));
const invalid = structuredClone(plan);
invalid.scenes[0].components[0].elements[0].path = '<script>alert(1)</script>';
assert.throws(() => validateCreative(invalid));
const unordered = structuredClone(plan);
unordered.scenes[0].components[0].keyframes[1].time = 0;
assert.throws(() => validateCreative(unordered));
let calls = 0;
const result = await generateCreative(
  { title: 'Test source' },
  {
    key: 'test',
    fetchImpl: async (_url, options) => {
      calls++;
      assert.ok(JSON.parse(options.body).messages[0].content.includes('SVG path geometry'));
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify(plan) } }] }),
      };
    },
  },
);
assert.equal(calls, 1);
assert.equal(result.scenes[0].components[0].name, 'Morph-like capsule');
console.log(
  'PASS: custom geometry preserved, unsafe markup rejected, timestamp validation, generation response integration.',
);
let retries = 0;
await generateCreative(
  { title: 'Template' },
  {
    key: 'test',
    fetchImpl: async () => {
      retries++;
      return retries === 1
        ? {
            ok: false,
            status: 400,
            json: async () => ({ error: { code: 'json_validate_failed' } }),
          }
        : {
            ok: true,
            json: async () => ({ choices: [{ message: { content: JSON.stringify(plan) } }] }),
          };
    },
  },
);
assert.equal(retries, 2);
await assert.rejects(
  () =>
    generateCreative(
      {},
      {
        key: 'test',
        fetchImpl: async () => ({
          ok: false,
          status: 400,
          json: async () => ({ error: { code: 'model_not_found' } }),
        }),
      },
    ),
  /configured Groq model is unavailable/,
);
await assert.rejects(
  () =>
    generateCreative(
      {},
      { key: 'test', fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({}) }) },
    ),
  /credentials/,
);
console.log('PASS: JSON generation retries, unavailable model and credential errors.');
