import { dmdEvent } from '../dmd';

export function showNotification(msg: string): void {
  const n = document.getElementById('notification') as HTMLElement;
  n.textContent = msg; n.style.opacity = '1';
  setTimeout(() => n.style.opacity = '0', 2500);
  const clean = msg.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  if (clean.length > 1) dmdEvent(clean.substring(0, 22).toUpperCase());
}
