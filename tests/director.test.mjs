import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directAnimation } from '../server/director.mjs';
const storyboard = {
  scenes: ['Introduce', 'Explore', 'Try it'].map((headline) => ({
    headline,
    caption: 'A clear story',
    motion: 'slide',
  })),
};
const fullStoryboard = (count) => ({
  scenes: Array.from({ length: count }, (_, i) => ({
    headline: `Scene ${i + 1}`,
    caption: `Supporting detail ${i + 1}`,
    motion: 'slide',
  })),
});
test('one bounded text request builds exactly thirty seconds locally', async () => {
  const calls = [];
  const result = await directAnimation(
    {
      images: ['SECRET_IMAGE'],
      assetCount: 2,
      brief: 'Creative demo',
      evidence: {
        brand: 'Product',
        description: 'x'.repeat(10000),
        sections: Array(100).fill('Feature'),
      },
    },
    {
      key: 'test',
      fetchImpl: async (_, o) => {
        calls.push(JSON.parse(o.body));
        return Response.json({
          choices: [{ message: { content: JSON.stringify(fullStoryboard(8)) } }],
        });
      },
    },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].max_completion_tokens, 2400);
  assert.ok(JSON.stringify(calls[0]).length < 4000);
  assert.ok(!JSON.stringify(calls[0]).includes('SECRET_IMAGE'));
  assert.equal(
    result.plan.scenes.reduce((n, s) => n + s.duration, 0),
    30,
  );
  assert.equal(result.plan.scenes.length, 8);
  assert.ok(result.plan.scenes.every((s) => s.duration <= 4));
  assert.ok(result.plan.scenes.every((s) => s.components.length >= 5));
  assert.ok(
    result.plan.scenes.every((s) =>
      s.components.every((c) => c.elements.every((e) => e.kind !== 'image')),
    ),
  );
  assert.ok(result.plan.scenes.at(-1).components.some((c) => c.name === 'Animated cursor'));
});
test('invalid output is rejected without another API call', async () => {
  let calls = 0;
  await assert.rejects(
    directAnimation(
      {},
      {
        key: 'test',
        fetchImpl: async () => {
          calls++;
          return Response.json({ choices: [{ message: { content: '{}' } }] });
        },
      },
    ),
    /invalid storyboard/,
  );
  assert.equal(calls, 1);
});
test('rate limits preserve existing animation', async () => {
  await assert.rejects(
    directAnimation(
      {},
      { key: 'test', fetchImpl: async () => new Response('{}', { status: 429 }) },
    ),
    /preserved/,
  );
});
test('source favicon becomes a separately animated image in every scene', async () => {
  const result = await directAnimation(
    { assetCount: 3, brandIconAsset: 2 },
    {
      key: 'test',
      fetchImpl: async () =>
        Response.json({ choices: [{ message: { content: JSON.stringify(fullStoryboard(8)) } }] }),
    },
  );
  for (const scene of result.plan.scenes) {
    const icon = scene.components.find((c) => c.name === 'Website icon');
    assert.equal(icon.elements.find((e) => e.kind === 'image').asset, 2);
    assert.ok(icon.keyframes.length >= 4);
  }
});

test('creative choices produce different local layouts and palettes within the same budget', async () => {
  const { buildStoryboard } = await import('../shared/directorStoryboard.mjs');
  const variants = new Set();
  for (const style of ['sage', 'ocean', 'sunset', 'violet', 'mono'])
    for (const energy of ['calm', 'balanced', 'snappy'])
      for (let seed = 0; seed < 8; seed++) {
        const plan = buildStoryboard({
          ...storyboard,
          style,
          energy,
          seed,
          scenes: storyboard.scenes.map((s, i) => ({
            ...s,
            layout: ['type', 'network', 'spotlight'][i],
          })),
        });
        assert.equal(
          plan.scenes.reduce((n, s) => n + s.duration, 0),
          30,
        );
        assert.equal(plan.scenes.length, 8);
        assert.ok(
          plan.scenes.some((s) => s.components.some((c) => c.name === 'Typographic statement')),
        );
        assert.ok(plan.scenes.some((s) => s.components.some((c) => c.name === 'Spotlight halo')));
        variants.add(JSON.stringify(plan));
      }
  assert.ok(variants.size > 30);
});
test('restyling preserves manually edited timing, captions, pointers, icons and text', async () => {
  const { buildStoryboard, restyleStoryboard } = await import('../shared/directorStoryboard.mjs');
  const plan = buildStoryboard(storyboard, 3, 2);
  plan.scenes.splice(2, 1);
  const old = plan.scenes[0];
  old.title = 'My edited title';
  old.components.push(
    { ...structuredClone(old.components[0]), name: 'User caption' },
    { ...structuredClone(old.components[1]), name: 'User pointer' },
  );
  const result = restyleStoryboard(plan, 3, 2, { style: 'ocean', seed: 4 });
  assert.deepEqual(
    result.scenes.map((s) => s.duration),
    plan.scenes.map((s) => s.duration),
  );
  assert.equal(result.scenes[0].title, old.title);
  for (const name of ['User caption', 'User pointer'])
    assert.deepEqual(
      result.scenes[0].components.find((c) => c.name === name).keyframes,
      old.components.find((c) => c.name === name).keyframes,
    );
  assert.equal(
    result.scenes[0].components
      .find((c) => c.name === 'Website icon')
      .elements.find((e) => e.kind === 'image').asset,
    2,
  );
  assert.notEqual(result.scenes[0].background, old.background);
});
test('transparent website icons have no backing shape and text edits survive restyle', async () => {
  const { buildStoryboard, restyleStoryboard } = await import('../shared/directorStoryboard.mjs');
  const plan = buildStoryboard(storyboard, 3, 2);
  for (const scene of plan.scenes)
    assert.deepEqual(
      scene.components.find((c) => c.name === 'Website icon').elements.map((e) => e.kind),
      ['image'],
    );
  plan.scenes[1].title = 'Edited headline';
  plan.scenes[1].components.find((c) => c.name === 'Headline').elements[0].text = 'Edited headline';
  plan.scenes[1].components.find((c) => c.name === 'Caption').elements[0].text = 'Edited caption';
  const next = restyleStoryboard(plan, 3, 2, { style: 'violet', seed: 8 });
  assert.equal(
    next.scenes[1].components.find((c) => c.name === 'Headline').elements[0].text,
    'Edited headline',
  );
  assert.equal(
    next.scenes[1].components.find((c) => c.name === 'Caption').elements[0].text,
    'Edited caption',
  );
});

test('selected durations add screens at a constant 2.5-second pace and restyle safely', async () => {
  const { buildStoryboard, restyleStoryboard } = await import('../shared/directorStoryboard.mjs');
  for (const durationSeconds of [5, 10, 15, 20, 25, 30]) {
    const plan = buildStoryboard({ ...storyboard, durationSeconds, seed: 3 });
    assert.equal(plan.scenes.length, durationSeconds / 2.5);
    assert.equal(
      plan.scenes.reduce((n, s) => n + s.duration, 0),
      durationSeconds,
    );
    assert.ok(plan.scenes.every((s) => s.duration === 2.5));
    assert.equal(restyleStoryboard(plan, 0, -1, { seed: 6 }).scenes.length, plan.scenes.length);
  }
  assert.throws(() => buildStoryboard({ ...storyboard, durationSeconds: 35 }));
});
test('duration selection keeps one small AI request while expanding locally', async () => {
  let calls = 0;
  const result = await directAnimation(
    { durationSeconds: 30 },
    {
      key: 'test',
      fetchImpl: async () => {
        calls++;
        return Response.json({
          choices: [{ message: { content: JSON.stringify(fullStoryboard(12)) } }],
        });
      },
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.plan.scenes.length, 12);
});

test('every requested scene keeps its own headline and supporting copy', async () => {
  const { buildStoryboard, restyleStoryboard } = await import('../shared/directorStoryboard.mjs');
  const copy = fullStoryboard(12);
  const plan = buildStoryboard({ ...copy, durationSeconds: 30 });
  for (const [i, scene] of plan.scenes.entries()) {
    assert.equal(scene.title, copy.scenes[i].headline);
    assert.equal(
      scene.components.find((c) => c.name === 'Headline').elements[0].text,
      copy.scenes[i].headline,
    );
    assert.equal(
      scene.components.find((c) => c.name === 'Caption').elements[0].text,
      copy.scenes[i].caption,
    );
    assert.equal(
      scene.components.flatMap((c) => c.elements).filter((e) => e.text === scene.title).length,
      1,
    );
  }
  const restyled = restyleStoryboard(plan);
  assert.deepEqual(
    restyled.scenes.map((s) => s.title),
    plan.scenes.map((s) => s.title),
  );
});
test('repeated AI scene copy is rejected', async () => {
  await assert.rejects(
    directAnimation(
      {},
      {
        key: 'test',
        fetchImpl: async () =>
          Response.json({
            choices: [
              {
                message: {
                  content: JSON.stringify({ scenes: Array(8).fill(storyboard.scenes[0]) }),
                },
              },
            ],
          }),
      },
    ),
    /invalid storyboard/,
  );
});
