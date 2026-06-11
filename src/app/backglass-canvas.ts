// SPDX-License-Identifier: AGPL-3.0-or-later

export function drawBGCanvas(canvas: HTMLCanvasElement, bgState: any, showEmbedDMD: boolean, dmdCanvas?: HTMLCanvasElement | null): void {
  const ctx = canvas.getContext('2d')!;
  if (!canvas.width) return;
  const W = canvas.width, H = canvas.height;
  const toHex = (n: number) => `#${(`000000${n.toString(16)}`).slice(-6)}`;
  const accent = toHex(bgState.tableAccent || 0x00ff66), tcolor = toHex(bgState.tableColor || 0x1a4a15);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a0a14');
  bg.addColorStop(0.5, `${tcolor}44`);
  bg.addColorStop(1, '#050508');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = 25;
  ctx.fillStyle = accent;
  ctx.font = `bold ${Math.min(H * 0.06, W * 0.07)}px "Courier New",monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText((bgState.tableName || 'FUTURE PINBALL').toUpperCase(), W / 2, H * 0.03);
  ctx.restore();
  ctx.save();
  ctx.shadowColor = '#ff6600';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ff6600';
  ctx.font = `bold ${Math.min(H * 0.14, W * 0.12)}px "Courier New",monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText((bgState.score || 0).toLocaleString(), W / 2, H * 0.15);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = '#ffcc00';
  ctx.font = `bold ${Math.min(H * 0.07, W * 0.06)}px "Courier New",monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`×${bgState.multiplier || 1}`, W * 0.08, H * 0.38);
  ctx.restore();
  if (showEmbedDMD && dmdCanvas) {
    const dY = H * 0.72, dH = H * 0.25, dW = W * 0.86, dX = W * 0.07;
    ctx.fillStyle = '#050200';
    ctx.strokeStyle = '#5a2200';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(dX, dY, dW, dH, 6);
    else ctx.rect(dX, dY, dW, dH);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(dmdCanvas, dX + 4, dY + 4, dW - 8, dH - 8);
    ctx.restore();
  }
}
