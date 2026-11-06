// The pending payload is durably stored by the caller before this function runs.
export async function postInspection(url, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(url, { method: 'POST', body: new URLSearchParams(payload), signal: controller.signal });
    const text = await response.text();
    if (!response.ok || text.trim() !== 'OK') {
      throw new Error('Google hat die Verarbeitung nicht bestätigt. Bitte Versandstatus im Register prüfen.');
    }
  } finally { clearTimeout(timeout); }
}
