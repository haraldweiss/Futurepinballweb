import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  document.body.innerHTML = `<div id="quick-menu" class="open">
    <div class="quick-actions">
      <button class="quick-action-btn">Import</button>
      <button class="quick-action-btn">Browser</button>
      <button class="quick-action-btn">Info</button>
    </div></div><div id="loader-modal" style="display:none"></div>`;
  window.switchTab = vi.fn();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('quick menu navigation', () => {
  it.each(['import', 'browser', 'info'])('closes the quick menu when opening %s', async (tab) => {
    const { initializeEventHandlers } = await import('../event-handlers-init');
    initializeEventHandlers();
    const index = ['import', 'browser', 'info'].indexOf(tab);
    (document.querySelectorAll('.quick-action-btn')[index] as HTMLButtonElement).click();
    expect(window.switchTab).toHaveBeenCalledWith(tab);
    expect(document.getElementById('loader-modal')?.style.display).toBe('flex');
    expect(document.getElementById('quick-menu')?.classList.contains('open')).toBe(false);
  });
});
