import { DRAFT_DB_NAME, LEGACY_DRAFT_DB_NAME, mayImportLegacyDrafts } from './storageScope.js';
export { DRAFT_DB_NAME } from './storageScope.js';
// Transactions compare the revision before writing: tabs cannot silently overwrite each other.
export function openDraftDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DRAFT_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'id' });
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Datenbank blockiert. Andere App-Tabs schließen.'));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}
async function legacyRecords() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DRAFT_DB_NAME);
    let absent = false;
    request.onupgradeneeded = () => { absent = true; request.transaction.abort(); };
    request.onerror = event => { event.preventDefault(); absent ? resolve([]) : reject(request.error); };
    request.onblocked = () => reject(new Error('Alte Testdatenbank blockiert. Andere Test-Tabs schließen.'));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      if (!db.objectStoreNames.contains('drafts')) { db.close(); resolve([]); return; }
      const tx = db.transaction('drafts', 'readonly');
      const all = tx.objectStore('drafts').getAll();
      tx.oncomplete = () => { db.close(); resolve(all.result); };
      tx.onabort = () => { db.close(); reject(tx.error); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}
export async function readDraft() {
  const db = await openDraftDB();
  try {
    const current = await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const request = tx.objectStore('drafts').get('active');
      tx.oncomplete = () => resolve(request.result || null);
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
    if (current || !mayImportLegacyDrafts) return current;
    const previous = await legacyRecords();
    if (!previous.length) return null;
    // Copy only into an entirely empty test scope, under one atomic write lock.
    // Original records and archives remain untouched in the legacy database.
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      const store = tx.objectStore('drafts');
      let result = null;
      const active = store.get('active');
      active.onsuccess = () => { result = active.result || null; };
      const count = store.count();
      count.onsuccess = () => {
        if (count.result !== 0) return;
        for (const record of previous) store.add(record);
        result = previous.find(record => record.id === 'active') || null;
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export async function writeDraft(data, expectedRevision, archive = false) {
  const db = await openDraftDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      const store = tx.objectStore('drafts');
      let failure;
      const request = store.get('active');
      request.onsuccess = () => {
        const previous = request.result;
        if ((previous?.revision || 0) !== expectedRevision) {
          failure = new Error('Ein anderer Tab hat den Entwurf geändert. Dieser Tab speichert nicht mehr. Eingaben sichern und die App neu laden.');
          tx.abort();
          return;
        }
        try {
        if (archive && previous) store.put({ ...previous, id: `archive:${crypto.randomUUID()}` });
        store.put({ id: 'active', revision: expectedRevision + 1, updatedAt: new Date().toISOString(), data });
        } catch (e) { failure = e; tx.abort(); }
      };
      tx.oncomplete = () => resolve(expectedRevision + 1);
      tx.onabort = () => reject(failure || tx.error || new Error('Speicherung abgebrochen'));
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}

// Identity uses the full category key and wording, never the mutable array position.
export const itemKey = (category, label) => JSON.stringify([category, label]);
export function packChecklist(categories, checklist) {
  return Object.fromEntries(categories.flatMap(cat => cat.items.map((label, i) =>
    [itemKey(cat.key, label), checklist[cat.key][i]])));
}
export function unpackChecklist(categories, saved) {
  return Object.fromEntries(categories.map(cat => [cat.key, cat.items.map(label =>
    saved[itemKey(cat.key, label)] || { rating: '', note: '', photos: [] })]));
}
export function checkSchema(data, categories) {
  if (![1, 2, 3].includes(data?.version) || !data.checklist || !data.form || !Array.isArray(data.images) || !Array.isArray(data.inspectionAreas)) {
    throw new Error('Der gespeicherte Entwurf hat ein unbekanntes Format. Er bleibt unverändert erhalten.');
  }
  if (typeof data.checklist !== 'object' || Array.isArray(data.checklist) ||
      Object.values(data.form).some(value => typeof value !== 'string') ||
      data.images.some(value => typeof value !== 'string') ||
      Object.values(data.checklist).some(row => !row || !['', 'ok', 'defect', 'note'].includes(row.rating) || typeof row.note !== 'string' || !Array.isArray(row.photos) || row.photos.some(photo => typeof photo !== 'string'))) {
    throw new Error('Der gespeicherte Entwurf ist beschädigt. Er bleibt unverändert erhalten.');
  }
  if (data.version >= 2) {
    const validStates = ['draft', 'unverified', 'pending', 'sent', 'closed'];
    if (typeof data.begehungsId !== 'string' || !data.begehungsId.trim() || !validStates.includes(data.dispatch?.state)) {
      throw new Error('Begehungs-ID oder Versandstatus ungültig. Der gespeicherte Entwurf bleibt erhalten.');
    }
    if (['pending', 'sent', 'closed'].includes(data.dispatch.state)) {
      const payload = data.dispatch.payload;
      const validEndpoint = isScriptEndpoint(data.dispatch.endpoint);
      if (!validEndpoint || !payload || (payload.begehungsId !== undefined && payload.begehungsId !== data.begehungsId) || Object.values(payload).some(value => typeof value !== 'string') ||
          !['pdfBase64', 'project', 'location', 'inspector'].every(key => typeof payload[key] === 'string')) {
        throw new Error('Gesicherte Versanddaten unvollständig. Bitte manuell prüfen lassen; die Daten bleiben erhalten.');
      }
    }
  }
  const keys = new Set(categories.flatMap(cat => cat.items.map(label => itemKey(cat.key, label))));
  if (Object.keys(data.checklist).some(key => !keys.has(key))) {
    throw new Error('Die Checkliste wurde geändert. Der alte Entwurf bleibt erhalten; eine Zuordnung durch die Betreuung ist erforderlich.');
  }
}

// Keep earlier test drafts and ambiguous pending requests; never resend them.
export function migrateDraft(data, newId) {
  if (data.version === 3) return data;
  if (data.version === 2) return { ...data, version: 3 };
  return { ...data, version: 3, begehungsId: newId(), dispatch: { state: 'unverified' } };
}

export function isScriptEndpoint(value) {
  try {
    const endpoint = new URL(value);
    return endpoint.origin === 'https://script.google.com' && !endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash && /^\/macros\/s\/[^/]+\/exec$/.test(endpoint.pathname);
  } catch { return false; }
}
