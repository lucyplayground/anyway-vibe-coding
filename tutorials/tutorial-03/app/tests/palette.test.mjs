import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePalette } from '../gemini.mjs';
import { createPaletteServer } from '../server.mjs';

const colors = ['#FF8844', '#338855', '#2277AA', '#8855CC', '#FFCC33'];
// Single-model, no-wait options so error tests check one request without retry delays.
const single = { fallbackModel: null, attempts: 1, sleep: async () => {} };
const answer = (value = colors) => Response.json({
  status: 'completed',
  steps: [
    { type: 'thought', signature: 'ignored' },
    { type: 'model_output', content: [{ type: 'text', text: JSON.stringify({ colors: value }) }] },
  ],
});

test('sends the theme and schema to Gemini, returning exactly five colors', async () => {
  const result = await generatePalette(' 노을 ', {
    apiKey: 'fake-test-key',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
      assert.equal(options.headers['x-goog-api-key'], 'fake-test-key');
      assert.equal(options.headers['Api-Revision'], '2026-05-20');
      const body = JSON.parse(options.body);
      assert.ok(body.input.includes('"노을"'));
      assert.equal(body.store, false);
      assert.equal(body.generation_config.thinking_level, 'low');
      assert.equal(body.response_format.schema.properties.colors.minItems, 5);
      assert.equal(body.response_format.schema.properties.colors.maxItems, 5);
      assert.equal(body.model, 'gemini-3.8-flash');
      return answer();
    },
  });
  assert.deepEqual(result, { colors, model: 'gemini-3.8-flash', fallback: false });
});

test('rejects missing keys and invalid input without contacting Gemini', async () => {
  const fetchImpl = () => assert.fail('Should not call Gemini');
  await assert.rejects(generatePalette(' ', { apiKey: 'fake', fetchImpl }), { status: 400 });
  await assert.rejects(generatePalette('x'.repeat(101), { apiKey: 'fake', fetchImpl }), { status: 400 });
  await assert.rejects(generatePalette('노을', { fetchImpl }), { status: 503 });
});

test('rejects malformed, duplicate, missing and incomplete colors', async () => {
  for (const value of [[], colors.slice(1), [...colors, '#112233'], [...colors.slice(0, 4), '#ff8844'], ['red', ...colors.slice(1)]]) {
    await assert.rejects(generatePalette('노을', { ...single, apiKey: 'fake', fetchImpl: async () => answer(value) }), { status: 502 });
  }
  for (const response of [Response.json({ status: 'failed' }), new Response('bad json')]) {
    await assert.rejects(generatePalette('노을', { ...single, apiKey: 'fake', fetchImpl: async () => response }), { status: 502 });
  }
});

test('handles quota, authentication and connection errors without leaking upstream data', async () => {
  for (const status of [403, 429, 500, 503, 504]) {
    await assert.rejects(generatePalette('노을', {
      ...single, apiKey: 'fake', fetchImpl: async () => new Response('private-upstream-message', { status }),
    }), error => error.status === ([429, 503, 504].includes(status) ? status : 502) && !error.message.includes('private-upstream'));
  }
  await assert.rejects(generatePalette('노을', {
    ...single, apiKey: 'fake', fetchImpl: async () => { throw new DOMException('test', 'TimeoutError'); },
  }), { status: 504 });
});

test('reports timeout while reading a response body as a timeout', async () => {
  await assert.rejects(generatePalette('노을', {
    ...single, apiKey: 'fake',
    fetchImpl: async () => ({ ok: true, json: async () => { throw new DOMException('test', 'AbortError'); } }),
  }), { status: 504 });
});

test('HTTP route serves public assets and keeps server configuration private', async t => {
  const server = createPaletteServer({ apiKey: 'fake-test-key', fetchImpl: async () => answer() });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(origin)).status, 200);
  for (const file of ['.env', '.env.example', 'server.mjs', 'gemini.mjs', 'package.json']) {
    assert.equal((await fetch(`${origin}/${file}`)).status, 404);
  }
  const response = await fetch(`${origin}/api/palette`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ keyword: '노을' }),
  });
  assert.deepEqual(await response.json(), { colors, model: 'gemini-3.8-flash', fallback: false });
  const blocked = await fetch(`${origin}/api/palette`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://other.example' },
    body: JSON.stringify({ keyword: '노을' }),
  });
  assert.equal(blocked.status, 403);
  const malformed = await fetch(`${origin}/api/palette`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(malformed.status, 400);
});

// Records which model each request used and replies with the next scripted result.
function scripted(results) {
  const models = [];
  const fetchImpl = async (url, options) => {
    models.push(JSON.parse(options.body).model);
    const next = results.shift();
    if (next instanceof Error) throw next;
    return typeof next === 'number' ? new Response('upstream', { status: next }) : answer();
  };
  return { models, fetchImpl };
}

test('retries the primary model with backoff and succeeds without the fallback', async () => {
  const { models, fetchImpl } = scripted([503, 503, 'ok']);
  const delays = [];
  const result = await generatePalette('노을', { apiKey: 'fake', fetchImpl, sleep: async ms => { delays.push(ms); } });
  assert.deepEqual(models, ['gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.8-flash']);
  assert.deepEqual(result, { colors, model: 'gemini-3.8-flash', fallback: false });
  assert.equal(delays.length, 2);
  assert.ok(delays[0] >= 1000 && delays[1] >= 2000);
});

test('switches to the fallback model after three failed attempts', async () => {
  const timeout = new DOMException('test', 'TimeoutError');
  const { models, fetchImpl } = scripted([503, timeout, 429, 'ok']);
  const result = await generatePalette('노을', { apiKey: 'fake', fetchImpl, sleep: async () => {} });
  assert.deepEqual(models, ['gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite']);
  assert.deepEqual(result, { colors, model: 'gemini-3.5-flash-lite', fallback: true });
});

test('uses configured models and reports when the fallback also fails', async () => {
  const { models, fetchImpl } = scripted([503, 503, 503, 503]);
  await assert.rejects(generatePalette('노을', {
    apiKey: 'fake', model: 'main-model', fallbackModel: 'backup-model', fetchImpl, sleep: async () => {},
  }), error => error.status === 503 && error.message.startsWith('기본 모델과 대체 모델 모두'));
  assert.deepEqual(models, ['main-model', 'main-model', 'main-model', 'backup-model']);
});

test('skips straight to the fallback when the primary model is not found', async () => {
  const { models, fetchImpl } = scripted([404, 'ok']);
  const result = await generatePalette('노을', { apiKey: 'fake', fetchImpl, sleep: async () => {} });
  assert.deepEqual(models, ['gemini-3.8-flash', 'gemini-3.5-flash-lite']);
  assert.equal(result.fallback, true);
});

test('does not retry or fall back on authentication errors', async () => {
  for (const status of [400, 401, 403]) {
    const { models, fetchImpl } = scripted([status, 'ok']);
    await assert.rejects(generatePalette('노을', { apiKey: 'fake', fetchImpl, sleep: async () => {} }), { status: 502 });
    assert.deepEqual(models, ['gemini-3.8-flash']);
  }
});

test('does not call the same model twice as a fallback', async () => {
  const { models, fetchImpl } = scripted([503, 503, 503, 'ok']);
  await assert.rejects(generatePalette('노을', {
    apiKey: 'fake', model: 'gemini-3.5-flash-lite', fetchImpl, sleep: async () => {},
  }), { status: 503 });
  assert.equal(models.length, 3);
});
