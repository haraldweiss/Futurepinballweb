export function devLog(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
}

export function devWarn(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
}
