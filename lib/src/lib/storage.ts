export function safeGetItem(storage: 'localStorage' | 'sessionStorage', key: string): string | null {
  try {
    return window[storage].getItem(key);
  } catch (e) {
    return null;
  }
}

export function safeSetItem(storage: 'localStorage' | 'sessionStorage', key: string, value: string): void {
  try {
    window[storage].setItem(key, value);
  } catch (e) {}
}

export function safeRemoveItem(storage: 'localStorage' | 'sessionStorage', key: string): void {
  try {
    window[storage].removeItem(key);
  } catch (e) {}
}
