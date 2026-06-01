// SPDX-License-Identifier: AGPL-3.0-or-later
import { dmdTextRenderer } from '../dmd-text-renderer';
import { dmdBoundsTracker } from '../dmd-bounds-tracker';
import { devLog } from '../utils/dev-log';
import { coinSystemState } from './state';

export function updateCoinDisplay(): void {
  if (!coinSystemState.coinScreenVisible) return;

  try {
    const dmdModule = (window as any).__DMD_MODULE__;
    if (!dmdModule?.renderCoinScreen) {
      renderCoinScreenFallback();
      return;
    }

    dmdModule.renderCoinScreen(coinSystemState);
  } catch (e) {
    devLog('ℹ️ Coin display rendering to canvas fallback');
    renderCoinScreenFallback();
  }
}

function renderCoinScreenFallback(): void {
  const dmdElement = document.getElementById('dmd') as HTMLCanvasElement;
  if (!dmdElement) return;

  const ctx = dmdElement.getContext('2d');
  if (!ctx) return;

  const width = dmdElement.width;
  const height = dmdElement.height;
  const baseWidth = 128;
  const baseHeight = 32;
  const scale = Math.min(width / baseWidth, height / baseHeight);

  const bounds = dmdBoundsTracker.getBounds();
  const debugInfo = dmdBoundsTracker.getDebugInfo();
  if (bounds && !bounds.fullyVisible) {
    console.warn(`⚠️ DMD partially visible: ${debugInfo}`);
  }

  ctx.fillStyle = '#1a1400';
  ctx.fillRect(0, 0, width, height);

  if (width < 200 || height < 50) {
    renderCoinScreenSimplified(ctx, width, height);
    return;
  }

  const paddingX = 2 * scale;
  const paddingY = 2 * scale;
  const availableWidth = width - paddingX * 2;
  const availableHeight = height - paddingY * 2;

  const titleText = 'INSERT COIN';
  const titleLayout = dmdTextRenderer.calculateLayout(titleText, scale, {
    alignment: 'center',
    verticalAlignment: 'top',
    maxLines: 1,
    availableWidth: availableWidth / scale,
    availableHeight: availableHeight / scale / 3
  });

  const titleLine = titleLayout.lines[0];
  if (titleLine) {
    const titleCheckResult = dmdBoundsTracker.checkTextBounds(
      titleLine.width,
      titleLine.height,
      titleLine.x,
      titleLine.y
    );

    if (!titleCheckResult.fits && titleCheckResult.suggestions.reduceFont) {
      console.warn('⚠️ Title text exceeds DMD bounds, adjusting');
    }

    const adjustedPos = dmdBoundsTracker.adjustTextPosition(
      titleLine.x,
      titleLine.y,
      titleLine.width,
      titleLine.height
    );

    ctx.fillStyle = '#ffaa00';
    ctx.font = `bold ${titleLine.fontSize * scale}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(titleLine.text, width / 2, paddingY + (adjustedPos.y * scale));
  }

  const statusText = coinSystemState.coinsInserted > 0
    ? `COINS: ${coinSystemState.coinsInserted}/4  PLAYERS: ${coinSystemState.currentPlayers}`
    : 'PRESS C FOR COIN';

  const statusLayout = dmdTextRenderer.calculateLayout(statusText, scale, {
    alignment: 'center',
    verticalAlignment: 'middle',
    maxLines: 1,
    availableWidth: availableWidth / scale,
    availableHeight: availableHeight / scale / 3
  });

  const statusLine = statusLayout.lines[0];
  if (statusLine) {
    const statusCheckResult = dmdBoundsTracker.checkTextBounds(
      statusLine.width,
      statusLine.height,
      statusLine.x,
      statusLine.y
    );

    if (statusCheckResult.visibleRatio < 1.0) {
      console.warn(`⚠️ Status text ${Math.round(statusCheckResult.visibleRatio * 100)}% visible`);
    }

    ctx.fillStyle = '#00ff88';
    ctx.font = `${statusLine.fontSize * scale}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(statusLine.text, width / 2, height / 2);
  }

  if (coinSystemState.coinsInserted > 0) {
    const iconY = height * 0.70;
    const iconRadius = Math.max(2, Math.round(3 * scale));
    const totalIconsWidth = coinSystemState.coinsInserted * (iconRadius * 2) + ((coinSystemState.coinsInserted - 1) * 4 * scale);
    const iconStartX = (width - totalIconsWidth) / 2;

    ctx.fillStyle = '#ffff00';
    for (let i = 0; i < coinSystemState.coinsInserted; i++) {
      const x = iconStartX + i * (iconRadius * 2 + 4 * scale) + iconRadius;

      if (x - iconRadius >= 0 && x + iconRadius <= width) {
        ctx.beginPath();
        ctx.arc(x, iconY, iconRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (coinSystemState.coinsInserted > 0) {
    const hintText = 'PRESS ENTER';
    const hintLayout = dmdTextRenderer.calculateLayout(hintText, scale, {
      alignment: 'center',
      verticalAlignment: 'bottom',
      maxLines: 1,
      availableWidth: availableWidth / scale,
      availableHeight: availableHeight / scale / 3
    });

    const hintLine = hintLayout.lines[0];
    if (hintLine) {
      const hintCheckResult = dmdBoundsTracker.checkTextBounds(
        hintLine.width,
        hintLine.height,
        hintLine.x,
        hintLine.y
      );

      if (!hintCheckResult.fits) {
        console.warn('⚠️ Hint text exceeds DMD bounds');
      }

      const adjustedHintPos = dmdBoundsTracker.adjustTextPosition(
        hintLine.x,
        hintLine.y,
        hintLine.width,
        hintLine.height
      );

      ctx.fillStyle = '#00ff88';
      ctx.font = `${hintLine.fontSize * scale}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(hintLine.text, width / 2, height - paddingY - (adjustedHintPos.y * scale));
    }
  }
}

function renderCoinScreenSimplified(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const scale = Math.min(width / 128, height / 32);

  const titleText = 'INSERT COIN';
  const titleFontSize = dmdTextRenderer.getExactFitFontSize(titleText, (width * 0.9) / scale) * 0.8;
  ctx.fillStyle = '#ffaa00';
  ctx.font = `bold ${Math.max(3, titleFontSize * scale)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(titleText, width / 2, height / 3);

  const line2Text = coinSystemState.coinsInserted > 0
    ? `COINS: ${coinSystemState.coinsInserted} PL: ${coinSystemState.currentPlayers}`
    : 'PRESS C';
  const line2FontSize = dmdTextRenderer.getExactFitFontSize(line2Text, (width * 0.9) / scale) * 0.8;
  ctx.fillStyle = '#00ff88';
  ctx.font = `${Math.max(2, line2FontSize * scale)}px monospace`;
  ctx.fillText(line2Text, width / 2, (height * 2) / 3);
}
