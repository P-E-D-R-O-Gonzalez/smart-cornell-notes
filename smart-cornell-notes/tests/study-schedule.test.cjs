/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness matches existing CJS tests. */
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
  vm.runInNewContext(js, { exports, require: name => { if (!(name in dependencies)) throw new Error(name); return dependencies[name]; }, Response });
  return exports;
}
const { getStudyReview, studyDay } = load('src/lib/study-schedule.ts');
const note = { study_enabled: true, created_at: '2026-09-21T17:00:00Z', last_opened_at: null };
const review = (date, opened) => getStudyReview({ ...note, last_opened_at: opened }, new Date(date));

test('creation is day zero; next Pacific midnight makes day 1 due', () => {
  assert.equal(review('2026-09-22T06:59:59Z').isDue, false);
  assert.equal(review('2026-09-22T07:00:00Z').isDue, true);
});
test('early and same-day opens do not move the schedule', () => {
  const result = review('2026-09-22T17:00:00Z', '2026-09-21T21:00:00Z');
  assert.equal(result.milestone, 1);
  assert.equal(result.isDue, true);
});
test('opening on day 1 leaves day 3, then day 7', () => {
  assert.equal(review('2026-09-22T18:00:00Z', '2026-09-22T17:00:00Z').milestone, 3);
  assert.equal(review('2026-09-24T18:00:00Z', '2026-09-24T17:00:00Z').milestone, 7);
  assert.equal(review('2026-09-28T18:00:00Z', '2026-09-28T17:00:00Z'), null);
});
test('overdue review remains due and catch-up clears only elapsed milestones', () => {
  assert.equal(review('2026-09-25T17:00:00Z').overdueDays, 3);
  assert.equal(review('2026-09-25T18:00:00Z', '2026-09-25T17:00:00Z').milestone, 7);
  assert.equal(review('2026-10-01T17:00:00Z', '2026-10-01T17:00:00Z'), null);
});
test('legacy notes do not participate and invalid dates are ignored', () => {
  assert.equal(getStudyReview({ ...note, study_enabled: false }), null);
  assert.equal(getStudyReview({ created_at: note.created_at }), null);
  assert.equal(getStudyReview({ ...note, created_at: 'invalid' }), null);
});
test('calendar days survive both daylight-saving transitions', () => {
  assert.equal(studyDay('2026-03-09T07:00:00Z') - studyDay('2026-03-08T08:00:00Z'), 1);
  assert.equal(studyDay('2026-11-02T08:00:00Z') - studyDay('2026-11-01T07:00:00Z'), 1);
});

function route({ userId = 'owner', data = '2026-09-22T17:00:00Z', error = null } = {}) {
  const calls = [];
  const api = load('src/app/api/notes/[id]/opened/route.ts', {
    '@clerk/nextjs/server': { auth: async () => ({ userId }) },
    'next/server': { NextResponse: Response },
    '@/lib/supabase/admin': { createAdminClient: () => ({ rpc: async (name, args) => { calls.push({ name, args }); return { data, error }; } }) },
  });
  return { calls, open: (id = '42') => api.POST(new Request('http://localhost'), { params: Promise.resolve({ id }) }) };
}
test('open endpoint rejects signed-out and invalid-id requests before database access', async () => {
  const signedOut = route({ userId: null });
  assert.equal((await signedOut.open()).status, 401);
  assert.equal(signedOut.calls.length, 0);
  const api = route();
  assert.equal((await api.open('bad')).status, 404);
  assert.equal(api.calls.length, 0);
});
test('open endpoint passes the authenticated owner and accepts only database timestamps', async () => {
  const api = route();
  const response = await api.open();
  assert.equal(response.status, 200);
  assert.equal(api.calls[0].args.p_user_id, 'owner');
  assert.equal(api.calls[0].args.p_note_id, 42);
  assert.deepEqual(await response.json(), { last_opened_at: '2026-09-22T17:00:00Z' });
});
test('missing or unowned notes and database failures are not recorded as success', async () => {
  assert.equal((await route({ data: null }).open()).status, 404);
  assert.equal((await route({ error: { message: 'offline' } }).open()).status, 500);
});
