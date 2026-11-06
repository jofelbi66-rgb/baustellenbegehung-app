// Transactions compare the revision before writing: tabs cannot silently overwrite each other.
export function openDraftDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('baustellenbegehung-drafts', 1);
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
export async function readDraft() {
  const db = await openDraftDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const request = tx.objectStore('drafts').get('active');
      tx.oncomplete = () => resolve(request.result || null);
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
  if (![1, 2].includes(data?.version) || !data.checklist || !data.form || !Array.isArray(data.images) || !Array.isArray(data.inspectionAreas)) {
    throw new Error('Der gespeicherte Entwurf hat ein unbekanntes Format. Er bleibt unverändert erhalten.');
  }
  if (typeof data.checklist !== 'object' || Array.isArray(data.checklist) ||
      Object.values(data.form).some(value => typeof value !== 'string') ||
      data.images.some(value => typeof value !== 'string') ||
      Object.values(data.checklist).some(row => !row || !['', 'ok', 'defect', 'note'].includes(row.rating) || typeof row.note !== 'string' || !Array.isArray(row.photos) || row.photos.some(photo => typeof photo !== 'string'))) {
    throw new Error('Der gespeicherte Entwurf ist beschädigt. Er bleibt unverändert erhalten.');
  }
  if (data.version === 2) {
    const validStates = ['draft', 'unverified', 'pending', 'sent'];
    if (typeof data.begehungsId !== 'string' || !data.begehungsId.trim() || !validStates.includes(data.dispatch?.state)) {
      throw new Error('Begehungs-ID oder Versandstatus ungültig. Der gespeicherte Entwurf bleibt erhalten.');
    }
    if (['pending', 'sent'].includes(data.dispatch.state)) {
      const payload = data.dispatch.payload;
      const validEndpoint = isScriptEndpoint(data.dispatch.endpoint);
      if (!validEndpoint || !payload || payload.begehungsId !== data.begehungsId || Object.values(payload).some(value => typeof value !== 'string') ||
          !['pdfBase64', 'feststellungen', 'anzahlBewertet', 'project', 'location', 'inspector'].every(key => typeof payload[key] === 'string')) {
        throw new Error('Gesicherte Versanddaten unvollständig. Bitte vor erneutem Versand prüfen lassen.');
      }
    }
  }
  const keys = new Set(categories.flatMap(cat => cat.items.map(label => itemKey(cat.key, label))));
  if (Object.keys(data.checklist).some(key => !keys.has(key))) {
    throw new Error('Die Checkliste wurde geändert. Der alte Entwurf bleibt erhalten; eine Zuordnung durch die Betreuung ist erforderlich.');
  }
}

// Older local-only drafts have no reliable register identity or send history.
export function migrateDraft(data, newId) {
  if (data.version === 2) return data;
  return { ...data, version: 2, begehungsId: newId(), dispatch: { state: 'unverified' } };
}

export function isScriptEndpoint(value) {
  try {
    const endpoint = new URL(value);
    return endpoint.origin === 'https://script.google.com' && !endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash && /^\/macros\/s\/[^/]+\/exec$/.test(endpoint.pathname);
  } catch { return false; }
}
