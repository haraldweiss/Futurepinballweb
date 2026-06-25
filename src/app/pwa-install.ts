/**
 * pwa-install.ts — PWA install prompt management.
 *
 * Handles the beforeinstallprompt event, shows/hides the install button,
 * and provides the installPWA() function for manual invocation.
 *
 * Extracted from main.ts.
 */

// Non-standard BeforeInstallPromptEvent API (Chromium only)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Install prompt event, set by beforeinstallprompt listener. */
let _installPrompt: BeforeInstallPromptEvent | null = null;

/** Initialize PWA install prompt handling. Call once on app startup. */
export function initPWAInstall(): void {
  if ('serviceWorker' in navigator && !import.meta.env.DEV) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }

  const installBtn = document.getElementById('install-btn') as HTMLButtonElement | null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _installPrompt = e as BeforeInstallPromptEvent;
    installBtn?.classList.add('visible');
  });

  window.addEventListener('appinstalled', () => {
    installBtn?.classList.remove('visible');
    _installPrompt = null;
  });
}

/** Show the PWA install prompt (called from install button). */
export function installPWA(): void {
  if (!_installPrompt) return;
  _installPrompt.prompt();
  _installPrompt.userChoice.then(() => { _installPrompt = null; });
}
