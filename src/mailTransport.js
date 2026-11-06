// Same deployment used by the existing production app; no register integration.
export const LEGACY_MAIL_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwQ4iCoCwQIqLfOFzkq8QHfZfgORdCrag4myM-S8G59zfnH4UeLijBQQsuhLwrmmFLR/exec';

// The pending payload is durably stored by the caller before this function runs.
export async function postInspection(url, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(url, { method: 'POST', body: new URLSearchParams(payload), signal: controller.signal });
    const text = await response.text();
    if (!response.ok || text.trim() !== 'OK') {
      throw new Error('Der Maildienst hat den Versand nicht bestätigt. Bitte manuell klären; nicht erneut senden.');
    }
  } finally { clearTimeout(timeout); }
}
