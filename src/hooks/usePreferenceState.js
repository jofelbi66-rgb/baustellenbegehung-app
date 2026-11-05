import { useEffect, useState } from 'react';

const warning = 'Voreinstellungen konnten nicht im bisherigen Browserspeicher gelesen oder gespeichert werden. Die Entwurfssicherung wird separat angezeigt.';

// Keep existing raw-string keys readable; never clear storage after an error.
export function readPreference(key, fallback) {
  try {
    return { value: window.localStorage.getItem(key) || fallback, error: '' };
  } catch {
    return { value: fallback, error: warning };
  }
}

export function usePreferenceState(key, fallback, skipEmpty = false) {
  const [initial] = useState(() => readPreference(key, fallback));
  const [value, setValue] = useState(initial.value);
  const [error, setError] = useState(initial.error);
  useEffect(() => {
    if (skipEmpty && !value) return;
    // A failed read must not replace an unknown existing preference with a default.
    if (initial.error && value === initial.value) return;
    try {
      window.localStorage.setItem(key, value);
      setError(initial.error);
    } catch {
      setError(warning);
    }
  }, [key, value, skipEmpty, initial.error, initial.value]);
  return [value, setValue, error];
}
