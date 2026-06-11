// SPDX-License-Identifier: AGPL-3.0-or-later
import { currentTableConfig, state } from '../game';
import { getTopScores } from '../highscore';
import { dmdCanvas } from '../dmd';

export interface InlineBackglassApi {
  /** Show the on-playfield backglass panel (1-screen mode) and size its canvas. */
  init: () => void;
  /** Hide the panel. */
  stop: () => void;
  /** Render one backglass frame (no-op when inactive). Called from the animate loop. */
  draw: () => void;
  /** Re-size the canvas to the current viewport (no-op when inactive). Called on resize. */
  resize: () => void;
}

function getResponsiveBackglassWidth(): string {
  const width = window.innerWidth;

  if (width < 768) {
    return '20vw';  // Mobile: minimal (80% for playfield)
  } else if (width < 1200) {
    return '25vw';  // Tablet: moderate
  } else if (width < 1800) {
    return '30vw';  // Desktop: original
  } else {
    return '35vw';  // Large desktop: more backglass space
  }
}

/**
 * Inline (single-screen) backglass panel: a 2D-canvas score/art board drawn
 * beside the playfield when no dedicated backglass window is open.
 *
 * Extracted from main.ts. Owns the active flag and self-gates draw()/resize().
 * Reads live game state / top scores / the DMD canvas via direct imports.
 */
export function createInlineBackglass(): InlineBackglassApi {
  let active = false;

  const sizeCanvas = (): void => {
    const canvas = document.getElementById('backglass-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const bgWidthVw = parseFloat(getResponsiveBackglassWidth());
    canvas.width = Math.round(innerWidth * (bgWidthVw / 100));
    canvas.height = innerHeight;
  };

  const init = (): void => {
    active = true;
    document.body.classList.add('show-bg-panel');
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
  };

  const stop = (): void => {
    active = false;
    document.body.classList.remove('show-bg-panel');
  };

  const resize = (): void => {
    if (!active) return;
    sizeCanvas();
  };

  const draw = (): void => {
    if (!active) return;
    const canvas = document.getElementById('backglass-canvas') as HTMLCanvasElement;
    if (!canvas || !canvas.width) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const toHex = (n: number) => `#${  (`000000${n.toString(16)}`).slice(-6)}`;
    const accent = currentTableConfig ? toHex(currentTableConfig.accentColor) : '#00ff66';
    const tcolor = currentTableConfig ? toHex(currentTableConfig.tableColor)  : '#1a4a15';

    const bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#0a0a14'); bg.addColorStop(0.5,`${tcolor}44`); bg.addColorStop(1,'#050508');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    const bw = Math.max(4,W*0.025);
    [0,W-bw].forEach(x => {
      const g=ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'transparent'); g.addColorStop(0.3,accent);
      g.addColorStop(0.7,accent); g.addColorStop(1,'transparent');
      ctx.fillStyle=g; ctx.fillRect(x,0,bw,H);
    });

    ctx.save(); ctx.shadowColor=accent; ctx.shadowBlur=22; ctx.fillStyle=accent;
    ctx.font=`bold ${Math.min(H*0.052,W*0.09)}px "Courier New",monospace`;
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText((currentTableConfig?.name||'FUTURE PINBALL').toUpperCase(), W/2, H*0.02);
    ctx.restore();

    ctx.save(); ctx.strokeStyle=accent; ctx.lineWidth=1.5; ctx.globalAlpha=0.45;
    ctx.beginPath(); ctx.moveTo(W*0.08,H*0.11); ctx.lineTo(W*0.92,H*0.11); ctx.stroke(); ctx.restore();

    ctx.save(); ctx.fillStyle='#553300'; ctx.font=`${H*0.030}px "Courier New",monospace`;
    ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText('SCORE',W/2,H*0.13); ctx.restore();

    ctx.save(); ctx.shadowColor='#ff6600'; ctx.shadowBlur=28; ctx.fillStyle='#ff6600';
    ctx.font=`bold ${Math.min(H*0.12,W*0.13)}px "Courier New",monospace`;
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText(state.score.toLocaleString(),W/2,H*0.16); ctx.restore();

    const ms=Math.min(H*0.06,W*0.10);
    ctx.save(); ctx.shadowColor='#ffcc00'; ctx.shadowBlur=14; ctx.fillStyle='#ffcc00';
    ctx.font=`bold ${ms}px "Courier New",monospace`; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText('MULT',W*0.08,H*0.34); ctx.restore();
    ctx.save(); ctx.shadowColor='#ffcc00'; ctx.shadowBlur=14; ctx.fillStyle='#ffcc00';
    ctx.font=`bold ${ms*1.35}px "Courier New",monospace`; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(`×${state.multiplier}`,W*0.08,H*0.375); ctx.restore();

    const ballR=Math.min(W*0.065,H*0.038), bx0=W*0.52, by0=H*0.375;
    ctx.save(); ctx.fillStyle='#334'; ctx.font=`${H*0.028}px "Courier New",monospace`;
    ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillText('BALL',bx0,H*0.344); ctx.restore();
    for (let i=0;i<3;i++) {
      ctx.save(); ctx.shadowColor=i<state.ballNum?'#00aaff':'transparent'; ctx.shadowBlur=i<state.ballNum?12:0;
      ctx.fillStyle=i<state.ballNum?'#00aaff':'#1a2a3a';
      ctx.beginPath(); ctx.arc(bx0+i*(ballR*2.3)+ballR, by0+ballR, ballR, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }

    const scores = getTopScores();
    if (scores.length>0) {
      ctx.save(); ctx.fillStyle='#446'; ctx.font=`${H*0.026}px "Courier New",monospace`;
      ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillText('HIGH SCORES',W*0.08,H*0.51); ctx.restore();
      scores.slice(0,3).forEach((s,i) => {
        ctx.save(); ctx.fillStyle=i===0?'#ffcc00':'#556';
        ctx.shadowColor=i===0?'#ffcc00':'transparent'; ctx.shadowBlur=i===0?8:0;
        ctx.font=`${H*0.032}px "Courier New",monospace`; ctx.textAlign='left'; ctx.textBaseline='top';
        ctx.fillText(`#${i+1} ${s.toLocaleString()}`,W*0.08,H*(0.545+i*0.045)); ctx.restore();
      });
    }

    const dY=H*0.74, dH=H*0.23, dW=W*0.86, dX=W*0.07;
    ctx.fillStyle='#050200'; ctx.strokeStyle='#5a2200'; ctx.lineWidth=2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(dX,dY,dW,dH,5); else ctx.rect(dX,dY,dW,dH);
    ctx.fill(); ctx.stroke();
    if (dmdCanvas) { ctx.save(); ctx.globalAlpha=0.92; ctx.drawImage(dmdCanvas,dX+4,dY+4,dW-8,dH-8); ctx.restore(); }
  };

  return { init, stop, draw, resize };
}
