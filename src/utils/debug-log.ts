/**
 * Debug-gated logging.
 *
 * Production builds default to silent. Enable verbose output by:
 *   - URL query: ?debug=1
 *   - localStorage: localStorage.setItem('fpw.debug', '1')
 *   - Vite env (build time): VITE_FPW_DEBUG=1
 *
 * Use `dlog`/`dwarn` for development noise. Reserve `console.error` (always on)
 * for genuine failures the user benefits from seeing.
 */

let enabled = false;
try {
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  if (params.has('debug')) enabled = params.get('debug') !== '0';
  if (!enabled && globalThis.localStorage?.getItem('fpw.debug') === '1') enabled = true;
  // Vite inlines import.meta.env at build time. Guarded for non-Vite contexts.
  if (!enabled && (import.meta as ImportMeta & { env?: { VITE_FPW_DEBUG?: string } }).env?.VITE_FPW_DEBUG === '1') enabled = true;
} catch {
  // Non-browser context (worker without location, SSR, tests) — leave disabled.
}

export const isDebugEnabled = (): boolean => enabled;

export function setDebugEnabled(on: boolean): void {
  enabled = on;
  try { globalThis.localStorage?.setItem('fpw.debug', on ? '1' : '0'); } catch { /* ignore */ }
}

export function dlog(...args: unknown[]): void {
  if (enabled) console.log('[fpw]', ...args);
}

export function dwarn(...args: unknown[]): void {
  if (enabled) console.warn('[fpw]', ...args);
}
