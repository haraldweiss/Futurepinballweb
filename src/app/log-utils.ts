export function appendLogEntry(msg: string, className: string = 'log-info'): void {
  const parseLog = document.getElementById('parse-log');
  if (parseLog) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = `${msg}\n`;
    parseLog.appendChild(span);
    parseLog.scrollTop = parseLog.scrollHeight;
  }
}
