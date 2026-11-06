import { useEffect, useRef, useState } from 'react';
import { readDraft, writeDraft, packChecklist, unpackChecklist, checkSchema, migrateDraft } from '../draftStore';

export function useInspectionDraft(categories, values, restore, fresh) {
  const [ready, setReady] = useState(false);
  const [resettingState, setResettingState] = useState(false);
  const [status, setStatus] = useState('Entwurf wird geladen …');
  const [error, setError] = useState('');
  const revision = useRef(0);
  const skipRestoredWrite = useRef(false);
  const queue = useRef(Promise.resolve());
  const saveSequence = useRef(0);
  const stopped = useRef(false);
  const resetting = useRef(false);
  const latest = useRef(null);
  const mounted = useRef(true);
  const initialRestore = useRef(restore);
  const schema = useRef(categories);
  const snapshot = { version: 2, ...values, checklist: packChecklist(categories, values.checklist) };
  latest.current = snapshot;
  const fail = (e) => {
    stopped.current = true;
    if (mounted.current) {
      const reason = e?.name === 'QuotaExceededError' ? 'Der Gerätespeicher ist voll. Bitte Speicherplatz freigeben.' : (e?.message || 'Gerätespeicher nicht verfügbar.');
      setError(`Entwurf nicht gesichert: ${reason} Bitte diese Seite offen lassen. Bereits gespeicherte Daten bleiben erhalten.`);
      setStatus('');
    }
  };
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    readDraft().then(async record => {
      if (cancelled) return;
      if (record) {
        checkSchema(record.data, schema.current);
        if (!Number.isSafeInteger(record.revision) || record.revision < 1) throw new Error('Ungültige Entwurfsrevision. Gespeicherte Daten bleiben erhalten.');
        skipRestoredWrite.current = true;
        revision.current = record.revision;
        const data = migrateDraft(record.data, () => crypto.randomUUID());
        if (data !== record.data) {
          revision.current = await writeDraft(data, revision.current);
        }
        if (cancelled) return;
        latest.current = data;
        initialRestore.current({ ...data, checklist: unpackChecklist(schema.current, data.checklist) });
      }
      setReady(true);
      setStatus(record ? 'Auf diesem Gerät gespeichert – Entwurf wiederhergestellt' : 'Automatische Sicherung aktiv');
    }).catch(e => { if (!cancelled) fail(e); });
    return () => { cancelled = true; mounted.current = false; };
  }, []);

  function persist(data, archive = false) {
    const sequence = ++saveSequence.current;
    const operation = queue.current.then(async () => {
      if (stopped.current) throw new Error('Automatische Speicherung wurde angehalten.');
      revision.current = await writeDraft(data, revision.current, archive);
      if (mounted.current && sequence === saveSequence.current) setStatus('Auf diesem Gerät gespeichert');
    });
    queue.current = operation.catch(fail);
    return operation;
  }
  useEffect(() => {
    if (!ready || stopped.current || resetting.current) return;
    if (skipRestoredWrite.current) { skipRestoredWrite.current = false; return; }
    setStatus('Wird gespeichert …');
    // No debounce: changes are queued immediately, including photos and signatures.
    persist(snapshot).catch(() => {});
  }, [ready, ...Object.values(values)]);

  async function newInspection() {
    if (!ready || stopped.current || resetting.current || latest.current.dispatch.state === 'pending') return;
    if (!window.confirm('Neue Begehung beginnen? Der aktuelle Entwurf wird auf diesem Gerät archiviert. Die persönliche Unterschrift bleibt erhalten.')) return;
    resetting.current = true;
    setResettingState(true);
    try {
      await persist(latest.current);
      const next = fresh();
      await persist({ version: 2, ...next, checklist: packChecklist(categories, next.checklist) }, true);
      restore(next);
    } catch (e) { fail(e); }
    finally { resetting.current = false; setResettingState(false); }
  }
  async function checkpointDispatch(dispatch) {
    if (!ready || stopped.current || resetting.current) throw new Error('Entwurfsspeicherung ist nicht verfügbar.');
    resetting.current = true;
    try {
      const data = { ...latest.current, dispatch };
      await persist(data);
      latest.current = data;
      restore({ ...data, checklist: unpackChecklist(categories, data.checklist) });
      return dispatch;
    } finally { resetting.current = false; }
  }
  return { ready, status, error, newInspection, resetting: resettingState, checkpointDispatch };
}
