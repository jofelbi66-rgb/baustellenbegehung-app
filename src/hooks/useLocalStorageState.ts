import { readPreference } from "./usePreferenceState";
import { preferenceKey } from "../storageScope";
import { useEffect, useState } from "react";

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = readPreference(key, null).value;
      return raw != null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(preferenceKey(key), JSON.stringify(value));
    } catch {
      // Falls iOS Safari localStorage blockiert (z.B. Privatmodus),
      // bleibt es nur für diese Sitzung gespeichert.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
