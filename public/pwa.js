/**
 * PWA Registration & Installation Handler
 *
 * Handles:
 * - Service Worker registration
 * - Install prompt display
 * - Update notifications
 * - Offline detection
 */

class PWAManager {
  constructor() {
    this.swRegistration = null;
    this.deferredPrompt = null;
    this.installButton = null;

    this.init();
  }

  /**
   * Initialize PWA features
   */
  async init() {
    console.log('[PWA] Initializing...');

    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        console.log('[PWA] Service Worker registered:', this.swRegistration);

        // Listen for updates
        this.swRegistration.addEventListener('updatefound', () => {
          this.onUpdateFound();
        });

        // Check for updates periodically
        setInterval(() => {
          this.swRegistration.update();
        }, 60000); // Every minute
      } catch (err) {
        console.error('[PWA] Service Worker registration failed:', err);
      }
    }

    // Handle install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.deferredPrompt = null;
      this.hideInstallPrompt();
    });

    // Handle offline/online
    window.addEventListener('online', () => {
      console.log('[PWA] Back online');
      this.notifyOnline();
    });

    window.addEventListener('offline', () => {
      console.log('[PWA] Going offline');
      this.notifyOffline();
    });

    // Check initial online status
    if (!navigator.onLine) {
      this.notifyOffline();
    }

    console.log('[PWA] Initialization complete');
  }

  /**
   * Show install prompt
   */
  showInstallPrompt() {
    // Create install button if it doesn't exist
    if (!this.installButton) {
      this.installButton = document.createElement('button');
      this.installButton.id = 'pwa-install-btn';
      this.installButton.innerHTML = '📥 Install App';
      this.installButton.className = 'pwa-install-btn';
      this.installButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 10000;
        padding: 8px 16px;
        background: linear-gradient(145deg, #1a1a2e, #16213e);
        border: 2px solid #00aaff;
        border-radius: 6px;
        color: #00aaff;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        font-weight: bold;
        text-shadow: 0 0 8px #00aaff;
        box-shadow: 0 0 20px rgba(0,170,255,0.3);
        transition: all 0.3s;
      `;

      this.installButton.addEventListener('mouseover', () => {
        this.installButton.style.boxShadow = '0 0 30px rgba(0,170,255,0.5)';
      });

      this.installButton.addEventListener('mouseout', () => {
        this.installButton.style.boxShadow = '0 0 20px rgba(0,170,255,0.3)';
      });

      this.installButton.addEventListener('click', () => {
        this.installApp();
      });

      document.body.appendChild(this.installButton);
    }

    this.installButton.style.display = 'block';
  }

  /**
   * Hide install prompt
   */
  hideInstallPrompt() {
    if (this.installButton) {
      this.installButton.style.display = 'none';
    }
  }

  /**
   * Install the app
   */
  async installApp() {
    if (!this.deferredPrompt) {
      console.warn('[PWA] Install prompt not available');
      return;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log('[PWA] User choice:', outcome);

    this.deferredPrompt = null;

    if (outcome === 'accepted') {
      console.log('[PWA] App installation started');
    }
  }

  /**
   * Handle service worker update
   */
  onUpdateFound() {
    const newWorker = this.swRegistration.installing;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('[PWA] New version available');
        this.notifyUpdate();
      }
    });
  }

  /**
   * Notify user of update
   */
  notifyUpdate() {
    const updateNotif = document.createElement('div');
    updateNotif.id = 'pwa-update-notif';
    updateNotif.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        background: linear-gradient(145deg, #1a1a2e, #16213e);
        border: 2px solid #ffcc00;
        border-radius: 8px;
        padding: 16px 24px;
        color: #ffcc00;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        text-shadow: 0 0 8px #ffcc00;
        box-shadow: 0 0 30px rgba(255,204,0,0.3);
        display: flex;
        gap: 12px;
        align-items: center;
        animation: slideUp 0.3s ease-out;
      ">
        <span>⬇️ New version available</span>
        <button id="pwa-update-btn" style="
          padding: 6px 12px;
          background: rgba(255,204,0,0.2);
          border: 1px solid #ffcc00;
          border-radius: 4px;
          color: #ffcc00;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          font-weight: bold;
          transition: all 0.2s;
        ">Update Now</button>
      </div>
      <style>
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      </style>
    `;

    document.body.appendChild(updateNotif);

    document.getElementById('pwa-update-btn').addEventListener('click', () => {
      this.applyUpdate();
    });

    setTimeout(() => {
      updateNotif.remove();
    }, 10000); // Auto-remove after 10 seconds
  }

  /**
   * Apply pending update
   */
  applyUpdate() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Reload once the new service worker activates
      let reloadPromptShown = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloadPromptShown) {
          reloadPromptShown = true;
          // Small delay to ensure update is applied
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      });
    }
  }

  /**
   * Notify user they're offline
   */
  notifyOffline() {
    const offlineNotif = document.createElement('div');
    offlineNotif.id = 'pwa-offline-notif';
    offlineNotif.innerHTML = `
      <div style="
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9998;
        background: rgba(200, 50, 0, 0.2);
        border: 2px solid #ff6655;
        border-radius: 6px;
        padding: 12px 20px;
        color: #ff9999;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        font-weight: bold;
        text-shadow: 0 0 8px rgba(255,102,85,0.5);
        box-shadow: 0 0 20px rgba(255,102,85,0.2);
      ">
        ⚠️ You are offline — using cached data
      </div>
    `;

    // Remove any existing offline notif
    const existing = document.getElementById('pwa-offline-notif');
    if (existing) existing.remove();

    document.body.appendChild(offlineNotif);
  }

  /**
   * Notify user they're back online
   */
  notifyOnline() {
    const offlineNotif = document.getElementById('pwa-offline-notif');
    if (offlineNotif) {
      offlineNotif.remove();
    }

    const onlineNotif = document.createElement('div');
    onlineNotif.innerHTML = `
      <div style="
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9998;
        background: rgba(0, 150, 0, 0.2);
        border: 2px solid #00ff66;
        border-radius: 6px;
        padding: 12px 20px;
        color: #66ff99;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        font-weight: bold;
        text-shadow: 0 0 8px rgba(0,255,102,0.5);
        box-shadow: 0 0 20px rgba(0,255,102,0.2);
        animation: slideDown 0.3s ease-out;
      ">
        ✅ Back online
      </div>
      <style>
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      </style>
    `;

    document.body.appendChild(onlineNotif);

    setTimeout(() => {
      onlineNotif.remove();
    }, 3000);
  }

  /**
   * Clear cache (for debugging)
   */
  async clearCache() {
    if (this.swRegistration) {
      this.swRegistration.active.postMessage({ type: 'CLEAR_CACHE' });
      console.log('[PWA] Clearing cache...');
    }
  }

  /**
   * Get installation status
   */
  getStatus() {
    return {
      registered: !!this.swRegistration,
      online: navigator.onLine,
      installable: !!this.deferredPrompt,
      displayMode: window.matchMedia('(display-mode: standalone)').matches
        ? 'standalone'
        : 'browser',
    };
  }
}

// Initialize PWA on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.pwaManager = new PWAManager();
  });
} else {
  window.pwaManager = new PWAManager();
}

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAManager;
}
