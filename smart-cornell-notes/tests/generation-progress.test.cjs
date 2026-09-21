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
    from: () => ({ insert: data => { Object.assign(saved, data); return ({ select: () => ({ single: async () => ({ data: saved, error: options.saveError }) }) }); } }),
  };
  const api = load('src/app/api/generate/route.ts', {
    '@/lib/ai-actions': load('src/lib/ai-actions.ts'),
    '@/lib/ai-actions-server': { getAiActions: async (userId, cost) => {
      calls.push(`allowance:${userId}:${cost}`);
      if (options.allowanceError) throw new Error('Database unavailable');
      return { allowed: options.remaining === undefined || options.remaining >= cost, remaining: options.remaining ?? 6 - cost, limit: 6, resetsAt: '2099-01-01T08:00:00Z' };
    } },
    'next/server': { NextResponse: Response },
    '@clerk/nextjs/server': { auth: async () => ({ userId: options.signedOut ? null : 'user-1' }) },
    '@/lib/supabase/admin': { createAdminClient: () => client },
    './extract': { extractTextFromImage: async () => { calls.push('extraction'); return options.extract ? options.extract() : 'Café physics'; } },
    './questions': { generateQuestions: async () => { calls.push('questions'); return ['Why?']; } },
    './both': { generateBoth: async () => { calls.push('both'); if (options.bothError) throw new Error('generation failed'); return { summary: 'Combined summary', questions: ['Combined question'] }; } },
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
    assert.equal(api.calls.includes('questions'), includeQuestions && !includeSummary);
    assert.equal(api.calls.includes('both'), includeQuestions && includeSummary);
    assert.equal(api.calls.includes('summary'), includeSummary && !includeQuestions);
    if (includeQuestions && includeSummary) {
      assert.equal(note.summary, 'Combined summary');
      assert.equal(JSON.stringify(note.cues), JSON.stringify(['Combined question']));
    }
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



test('combined failure reports both failures without saving', async () => {
  const events = [];
  const api = route({ bothError: true });
  const response = await api.POST(request({ includeSummary: true, includeQuestions: true }));
  await assert.rejects(readGenerationStream(response.body, e => events.push(e)));
  assert.equal(api.calls.filter(call => call === 'both').length, 1);
  for (const step of ['summary', 'questions']) assert.ok(events.some(e => e.step === step && e.status === 'failed'));
  assert.ok(!events.some(e => e.step === 'save'));
});

test('combined helper validates model output and sends source once', async () => {
  const valid = { summary: 'Summary.', questions: ['Why?', 'How?', 'Compare?', 'Infer?', 'Evaluate?'] };
  let content = JSON.stringify(valid);
  let finish_reason = 'stop';
  let refusal = null;
  const requests = [];
  const { generateBoth } = load('src/app/api/generate/both.ts', {
    '@/lib/openai': { openai: { chat: { completions: { create: async request => {
      requests.push(request);
      return { choices: [{ finish_reason, message: { content, refusal } }] };
    } } } } },
    zod: require('zod'),
    'openai/helpers/zod': require('openai/helpers/zod'),
  });
  assert.equal(JSON.stringify(await generateBoth('Unique source')), JSON.stringify(valid));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].messages.filter(m => m.content.includes('Unique source')).length, 1);
  await assert.rejects(generateBoth('   '));
  for (const invalid of ['{}', 'not json', JSON.stringify({ ...valid, questions: [] }), JSON.stringify({ ...valid, summary: '' })]) {
    content = invalid;
    await assert.rejects(generateBoth('Notes'));
  }
  content = JSON.stringify(valid);
  finish_reason = 'length';
  await assert.rejects(generateBoth('Notes'));
  finish_reason = 'stop';
  refusal = 'Refused';
  await assert.rejects(generateBoth('Notes'));
});

test('daily allowance charges 1 for extraction and 3 for either or both study aids', async () => {
  for (const includeQuestions of [false, true]) for (const includeSummary of [false, true]) {
    const api = route();
    await api.POST(request({ includeQuestions, includeSummary }, false));
    assert.ok(api.calls.includes(`allowance:user-1:${includeQuestions || includeSummary ? 3 : 1}`));
  }
});

test('insufficient actions and allowance outages stop before any model call', async () => {
  for (const stream of [false, true]) {
    for (const remaining of [0, 1, 2]) {
      const api = route({ remaining });
      const response = await api.POST(request({ includeQuestions: true, includeSummary: true }, stream));
      assert.equal(response.status, 429);
      const result = await response.json();
      assert.match(result.error, remaining === 0 ? /Come back tomorrow/ : /Not enough AI actions/);
      assert.equal(result.actions.remaining, remaining);
      assert.ok(Number(response.headers.get('Retry-After')) > 0);
      assert.equal(api.calls.length, 1);
    }
  }
  const api = route({ allowanceError: true });
  assert.equal((await api.POST(request())).status, 503);
  assert.equal(api.calls.length, 1);
  const signedOut = route({ signedOut: true });
  assert.equal((await signedOut.POST(request())).status, 401);
  assert.equal(signedOut.calls.length, 0);
  const invalid = route();
  assert.equal((await invalid.POST(request({ includeQuestions: 'true' }))).status, 400);
  assert.equal(invalid.calls.length, 0);
});

test('users with one or two actions can still extract without boost', async () => {
  for (const remaining of [1, 2]) {
    const api = route({ remaining });
    assert.equal((await api.POST(request({}, false))).status, 200);
    assert.ok(api.calls.includes('extraction'));
    assert.ok(!api.calls.includes('both'));
  }
});

test('allowance endpoint scopes the counter to the signed-in user and disables caching', async () => {
  let userId = 'user-1';
  const balance = { allowed: true, remaining: 4, limit: 6, resetsAt: '2099-01-01T08:00:00Z' };
  const api = load('src/app/api/ai-actions/route.ts', {
    '@clerk/nextjs/server': { auth: async () => ({ userId }) },
    '@/lib/ai-actions-server': { getAiActions: async id => { assert.equal(id, 'user-1'); return balance; } },
  });
  const response = await api.GET();
  assert.deepEqual(await response.json(), balance);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  userId = null;
  assert.equal((await api.GET()).status, 401);
});
