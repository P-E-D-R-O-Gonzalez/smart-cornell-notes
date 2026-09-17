const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(js, {
    exports, require: name => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    Response, ReadableStream, TextEncoder, TextDecoder, Buffer, performance,
    crypto: require('node:crypto').webcrypto,
    process: { env: { OPENAI_API_KEY: 'test-only' } },
    console: { error() {}, warn() {} },
  });
  return exports;
}

const { readGenerationStream } = load('src/lib/generation-progress.ts');
function route(options = {}) {
  const calls = [];
  const saved = { id: 'note-1', notes: ['Café physics'], summary: '', cues: [] };
  const client = {
    storage: { from: () => ({ upload: async () => ({ data: options.storageError ? null : { path: 'source' }, error: options.storageError }) }) },
    from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: saved, error: options.saveError }) }) }) }),
  };
  const api = load('src/app/api/generate/route.ts', {
    'next/server': { NextResponse: Response },
    '@clerk/nextjs/server': { auth: async () => ({ userId: options.signedOut ? null : 'user-1' }) },
    '@/lib/supabase/admin': { createAdminClient: () => client },
    './extract': { extractTextFromImage: async () => { calls.push('extraction'); return options.extract ? options.extract() : 'Café physics'; } },
    './questions': { generateQuestions: async () => { calls.push('questions'); return ['Why?']; } },
    './summary': { generateSummary: async () => { calls.push('summary'); return 'A short summary'; } },
  });
  return { ...api, calls };
}
function request(body = {}, stream = true) {
  return new Request('http://localhost/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: stream ? 'application/x-ndjson' : 'application/json' },
    body: JSON.stringify({ image: 'data:image/jpeg;base64,YQ==', ...body }),
  });
}

test('reports actual extraction start before extraction resolves, then completion', async () => {
  let release;
  const extraction = new Promise(resolve => { release = resolve; });
  const api = route({ extract: () => extraction });
  const response = await api.POST(request());
  const reader = response.body.getReader();
  const events = [];
  while (!events.some(e => e.step === 'extraction')) {
    const { value } = await reader.read();
    events.push(...new TextDecoder().decode(value).trim().split('\n').map(JSON.parse));
  }
  assert.equal(events.find(e => e.step === 'extraction').status, 'running');
  assert.ok(!events.some(e => e.step === 'save'));
  release('Two words');
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    events.push(...new TextDecoder().decode(value).trim().split('\n').map(JSON.parse));
  }
  assert.equal(events.at(-1).type, 'complete');
  assert.equal(events.find(e => e.step === 'extraction' && e.status === 'complete').detail, '2 words extracted · 1 note sections');
  assert.ok(events.filter(e => e.status === 'complete').every(e => e.durationMs >= 0));
});

test('only selected optional steps run; JSON callers remain supported', async () => {
  for (const includeQuestions of [false, true]) for (const includeSummary of [false, true]) {
    const api = route();
    const response = await api.POST(request({ includeQuestions, includeSummary }));
    const events = [];
    const note = await readGenerationStream(response.body, e => events.push(e));
    assert.equal(note.id, 'note-1');
    assert.equal(api.calls.includes('questions'), includeQuestions);
    assert.equal(api.calls.includes('summary'), includeSummary);
    assert.equal(events.filter(e => e.status === 'complete').length, 3 + Number(includeQuestions) + Number(includeSummary));
  }
  const response = await route().POST(request({}, false));
  assert.equal((await response.json()).id, 'note-1');
});

test('storage warning is honest; failed save and extraction reject instead of reporting success', async () => {
  const events = [];
  const response = await route({ storageError: true }).POST(request());
  await readGenerationStream(response.body, e => events.push(e));
  assert.ok(events.some(e => e.step === 'storage' && e.status === 'warning'));
  for (const options of [{ saveError: true }, { extract: () => { throw new Error('failed'); } }]) {
    const failed = await route(options).POST(request());
    await assert.rejects(readGenerationStream(failed.body, () => {}));
  }
  assert.equal((await route({ signedOut: true }).POST(request())).status, 401);
});

test('decoder handles split UTF-8, multiple events, and unexpected disconnects', async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ type: 'progress', step: 'extraction', status: 'complete', detail: 'Café' }) + '\n' + JSON.stringify({ type: 'complete', note: { id: '1' } }));
  const stream = new ReadableStream({ start(controller) {
    for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
    controller.close();
  } });
  const events = [];
  assert.equal((await readGenerationStream(stream, e => events.push(e))).id, '1');
  assert.equal(events[0].detail, 'Café');
  await assert.rejects(readGenerationStream(new ReadableStream({ start(c) { c.close(); } }), () => {}), /before your note was saved/);
});
