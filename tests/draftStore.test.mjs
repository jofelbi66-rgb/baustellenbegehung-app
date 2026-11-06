import assert from 'node:assert/strict';
import { test } from 'node:test';
// Install fake-indexeddb in an external QA directory; no production dependency needed.
await import(process.env.FAKE_INDEXEDDB_MODULE || '/tmp/baustellen-qa/node_modules/fake-indexeddb/auto/index.mjs');
const { readDraft, writeDraft, packChecklist, unpackChecklist, checkSchema } = await import('../src/draftStore.js');
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
  const db = await new Promise((resolve, reject) => { const r = indexedDB.open('baustellenbegehung-drafts', 1); r.onsuccess = () => resolve(r.result); r.onerror = reject; });
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
