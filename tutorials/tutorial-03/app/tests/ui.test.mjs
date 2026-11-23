import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the browser script with a small DOM fixture and a mocked HTTP response.
test('renders five squares, prevents repeated clicks, and preserves colors on failure', async () => {
  function element() {
    return {
      value: '노을', textContent: '', disabled: false, style: {}, children: [], attrs: {},
      classList: { add() {} }, addEventListener() {}, focus() {},
      setAttribute(key, value) { this.attrs[key] = value; },
      append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children = children; },
    };
  }
  const selectors = ['#palette-form', '#keyword', '#generate', '#shuffle', '.palette-output', '#status', '#palette-caption'];
  const nodes = Object.fromEntries(selectors.map(selector => [selector, element()]));
  let finish;
  let calls = 0;
  const context = vm.createContext({
    document: { querySelector: selector => nodes[selector], createElement: element },
    location: { protocol: 'http:' }, AbortSignal,
    fetch: () => { calls++; return new Promise(resolve => { finish = resolve; }); },
  });
  vm.runInContext(await readFile(new URL('../app.js', import.meta.url), 'utf8'), context);
  const pending = vm.runInContext('generate()', context);
  assert.equal(nodes['#generate'].disabled, true);
  await vm.runInContext('generate()', context);
  assert.equal(calls, 1);
  const colors = ['#FF8844', '#338855', '#2277AA', '#8855CC', '#FFCC33'];
  finish({ ok: true, json: async () => ({ colors }) });
  await pending;
  const output = nodes['.palette-output'];
  assert.equal(output.children.length, 5);
  output.children.forEach((item, i) => assert.equal(item.children[0].style.backgroundColor, colors[i]));
  assert.equal(nodes['#generate'].disabled, false);
  assert.equal(output.attrs['aria-busy'], 'false');
  const previous = output.children;
  const retry = vm.runInContext('generate()', context);
  finish({ ok: false, json: async () => ({ error: '요청 한도에 도달했어요.' }) });
  await retry;
  assert.equal(output.children, previous);
  assert.equal(nodes['#shuffle'].disabled, false);
  assert.equal(nodes['#status'].textContent, '요청 한도에 도달했어요.');
  const fallback = vm.runInContext('generate()', context);
  finish({ ok: true, json: async () => ({ colors, model: 'gemini-3.5-flash-lite', fallback: true }) });
  await fallback;
  assert.ok(nodes['#status'].textContent.includes('대체 모델(gemini-3.5-flash-lite)'));
});
