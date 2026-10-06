import "@testing-library/jest-dom";

// Recent Node versions expose an experimental global `localStorage` that is
// undefined without --localstorage-file and shadows jsdom's. Provide an in-memory one.
const memoryStorage = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => memoryStorage.get(key) ?? null,
    setItem: (key: string, value: string) => void memoryStorage.set(key, String(value)),
    removeItem: (key: string) => void memoryStorage.delete(key),
    clear: () => memoryStorage.clear(),
    key: (i: number) => Array.from(memoryStorage.keys())[i] ?? null,
    get length() {
      return memoryStorage.size;
    },
  },
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
