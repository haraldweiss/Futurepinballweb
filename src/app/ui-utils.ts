export const switchTab = (tab: string) => {
  document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', ['demo', 'import', 'browser', 'info', 'script'][i] === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  (document.getElementById(`tab-${tab}`) as HTMLElement)?.classList.add('active');
};

export const closeLoader = async () => {
  const el = document.getElementById('loader-modal');
  if (el) el.style.display = 'none';
};

export const toggleFullscreen = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => { });
  else document.exitFullscreen?.();
};

export const toggleViewPanel = () => document.getElementById('view-panel')!.classList.toggle('open');
