import assert from 'node:assert/strict';
import { test } from 'node:test';
// Install fake-indexeddb in an external QA directory; no production dependency needed.
await import(process.env.FAKE_INDEXEDDB_MODULE || '/tmp/baustellen-qa/node_modules/fake-indexeddb/auto/index.mjs');
const { readDraft, writeDraft, packChecklist, unpackChecklist, checkSchema, migrateDraft, isScriptEndpoint, DRAFT_DB_NAME } = await import('../src/draftStore.js');
const categories = [{ key: 'safety', items: ['First', 'Second'] }];
const checklist = { safety: [{ rating: 'defect', note: 'Repair', photos: ['data:image/png;base64,abc'] }, { rating: 'ok', note: '', photos: [] }] };
const data = { version: 1, form: { project: 'Site A' }, images: ['image'], inspectionAreas: ['bau'], checklist: packChecklist(categories, checklist), signatureDataURL: 'signature', signatureCapturedAt: 'time' };

test('all draft data survives a database close/reopen; reorder preserves identity', async () => {
  assert.equal(await readDraft(), null);
  assert.equal(await writeDraft(data, 0), 1);
  assert.deepEqual((await readDraft()).data, data);
  const reordered = [{ key: 'safety', items: ['Second', 'First'] }];
  assert.equal(unpackChecklist(reordered, data.checklist).safety[1].note, 'Repair');
  checkSchema(data, reordered);
});
test('concurrent writers: exactly one succeeds, stale writer cannot overwrite', async () => {
  const results = await Promise.allSettled([writeDraft({ ...data, marker: 'A' }, 1), writeDraft({ ...data, marker: 'B' }, 1)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await readDraft()).revision, 2);
  await assert.rejects(writeDraft(data, 1), /anderer Tab/);
});
test('new inspection archives full previous draft atomically, retains personal signature', async () => {
  const previous = await readDraft();
  const next = { ...data, form: { project: '' }, images: [] };
  await writeDraft(next, 2, true);
  const active = await readDraft();
  assert.equal(active.data.signatureDataURL, data.signatureDataURL);
  assert.equal(active.data.signatureCapturedAt, data.signatureCapturedAt);
  const db = await new Promise((resolve, reject) => { const r = indexedDB.open(DRAFT_DB_NAME, 1); r.onsuccess = () => resolve(r.result); r.onerror = reject; });
  const records = await new Promise((resolve) => { const r = db.transaction('drafts').objectStore('drafts').getAll(); r.onsuccess = () => resolve(r.result); });
  db.close();
  assert.deepEqual(records.find(r => r.id.startsWith('archive:')).data, previous.data);
});
test('changed wording or unknown format is blocked rather than misassigned', () => {
  assert.throws(() => checkSchema(data, [{ key: 'safety', items: ['Changed', 'Second'] }]), /Checkliste/);
  assert.throws(() => checkSchema({ ...data, version: 99 }, categories), /Format/);
});
test('failed structured clone leaves last saved record intact', async () => {
  const before = await readDraft();
  await assert.rejects(writeDraft({ ...data, invalid: () => {} }, before.revision));
  assert.deepEqual(await readDraft(), before);
});

test('legacy migration preserves data and requires unknown send history confirmation; current local identity remains stable', () => {
  let ids = 0;
  const migrated = migrateDraft(data, () => `ID-${++ids}`);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.begehungsId, 'ID-1');
  assert.deepEqual(migrated.dispatch, { state: 'unverified' });
  assert.deepEqual(migrated.checklist, data.checklist);
  assert.equal(migrated.signatureDataURL, data.signatureDataURL);
  assert.equal(migrateDraft(migrated, () => `ID-${++ids}`), migrated);
  assert.equal(ids, 1);
  checkSchema(migrated, categories);
  assert.throws(() => checkSchema({ ...migrated, dispatch: { state: 'pending', payload: { begehungsId: 'wrong' } } }, categories), /Versanddaten/);
});

test('mail target must be an explicit Apps Script web-app endpoint', () => {
  assert.equal(isScriptEndpoint(''), false);
  assert.equal(isScriptEndpoint('https://script.google.com/macros/s/TEST-NO-REAL-SERVICE/exec'), true);
  assert.equal(isScriptEndpoint('https://example.invalid/macros/s/test/exec'), false);
  assert.equal(isScriptEndpoint('https://user:password@script.google.com/macros/s/test/exec'), false);
});

test('previous register test drafts keep their identity and pending payload without being reopened for sending', () => {
  const pending = { ...data, version: 2, begehungsId: 'old-local-id', dispatch: { state: 'pending', endpoint: 'https://script.google.com/macros/s/OLD-DEMO/exec', payload: { begehungsId: 'old-local-id', pdfBase64: 'pdf', feststellungen: '[]', anzahlBewertet: '0', project: 'Test', location: 'Test', inspector: 'Test' } } };
  checkSchema(pending, categories);
  const migrated = migrateDraft(pending, () => { throw new Error('must not replace known ID'); });
  assert.equal(migrated.version, 3);
  assert.equal(migrated.begehungsId, 'old-local-id');
  assert.deepEqual(migrated.dispatch, pending.dispatch);
  checkSchema(migrated, categories);
});

test('storage paths separate GitHub project pages on the same host', async () => {
  const { storagePath, preferenceKey } = await import('../src/storageScope.js');
  assert.equal(storagePath('/baustellenbegehung-app/', 'https://example.github.io/baustellenbegehung-app/'), '/baustellenbegehung-app/');
  assert.equal(storagePath('./', 'https://example.github.io/baustellenbegehung-test/site/index.html'), '/baustellenbegehung-test/site/');
  assert.equal(storagePath('./', 'https://example.netlify.app/'), '/');
  assert.notEqual(preferenceKey('app.ccEmail'), 'app.ccEmail');
});
