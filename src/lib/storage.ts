const hasWindow = typeof window !== "undefined";

export function readStorage<T>(key: string, fallback: T): T {
  if (!hasWindow) {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T) {
  if (!hasWindow) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeStorage(key: string) {
  if (!hasWindow) {
    return;
  }

  window.localStorage.removeItem(key);
}
