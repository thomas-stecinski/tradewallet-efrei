const isBrowser = typeof window !== 'undefined' && !!window.localStorage;

export const safeStorage = {
  getItem(key: string): string | null {
    if (!isBrowser) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      return;
    }
  },

  removeItem(key: string): void {
    if (!isBrowser) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      return;
    }
  },
};
