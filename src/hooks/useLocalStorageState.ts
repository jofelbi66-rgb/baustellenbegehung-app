import { useEffect, useState } from "react";

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Falls iOS Safari localStorage blockiert (z.B. Privatmodus),
      // bleibt es nur für diese Sitzung gespeichert.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
