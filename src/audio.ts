import { fptResources } from './game';
import { initializeAudioSourcePool, getAudioSourcePool } from './audio-source-pool';

// ── Audio Context ─────────────────────────────────────────────────────────────
let _audioCtx: AudioContext | null = null;

export function getAudioCtx(): AudioContext {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return _audioCtx;
}

// ─── Phase 6: Initialize audio source pool on first audio context creation ────
export function initializeAudioPooling(): void {
  const ctx = getAudioCtx();
  initializeAudioSourcePool(ctx, 16);  // Pool of 16 reusable sources
}

// ─── Device Detection (for audio optimization) ───────────────────────────────
const isMobile = /iPhone|iPad|Android|Mobile/.test(navigator.userAgent);
const audioSuppressFlipped = isMobile && window.innerWidth < 600;  // Mute on small mobile

// ─── Sound Effects (optimized for mobile) ────────────────────────────────────
export function playSound(type: 'bumper' | 'flipper' | 'drain' | string): void {
  try {
    // Skip audio on very low-end mobile (battery saver)
    if (audioSuppressFlipped && type !== 'bumper') return;

    const ctx = getAudioCtx();

    // FPT-originaler Sound
    const fptBuf = fptResources.mapped[type as 'bumper' | 'flipper' | 'drain'];
    if (fptBuf) {
      // Phase 6: Use pooled source instead of creating new one
      const pool = getAudioSourcePool();
      const src  = pool.acquireSource();
      const gain = ctx.createGain();
      src.buffer = fptBuf;
      src.connect(gain); gain.connect(ctx.destination);
      gain.gain.value = type === 'flipper' ? 0.35 : 0.6;  // Reduced mobile volume
      // Release back to pool when finished
      src.onended = () => pool.releaseSource(src);
      src.start();
      return;
    }

    // Synthesizer-Fallback (simplified on mobile)
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    const now = ctx.currentTime;
    const volScale = isMobile ? 0.7 : 1.0;  // Mobile: 30% quieter

    if (type === 'bumper') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
      gain.gain.setValueAtTime(0.18 * volScale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'flipper') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);
      gain.gain.setValueAtTime(0.08 * volScale, now);  // Quieter flipper on mobile
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'drain') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.6);
      gain.gain.setValueAtTime(0.15 * volScale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.start(now); osc.stop(now + 0.7);
    }
  } catch { /* Audio nicht verfügbar */ }
}

/**
 * PHASE 9: Play bumper sound with intensity-based pitch and volume variation
 * @param intensity - Normalized impact intensity (0.0 = soft, 1.0 = hard)
 */
export function playBumperSoundWithIntensity(intensity: number): void {
  try {
    // Skip audio on very low-end mobile (battery saver)
    if (audioSuppressFlipped) return;

    const ctx = getAudioCtx();
    const clampedIntensity = Math.min(1.0, Math.max(0.0, intensity));

    // FPT-original sound with volume variation
    const fptBuf = fptResources.mapped['bumper'];
    if (fptBuf) {
      // Phase 6: Use pooled source
      const pool = getAudioSourcePool();
      const src = pool.acquireSource();
      const gain = ctx.createGain();
      src.buffer = fptBuf;
      src.connect(gain);
      gain.connect(ctx.destination);
      // Volume: 0.3 (soft) to 0.6 (hard)
      gain.gain.value = 0.3 + clampedIntensity * 0.3;
      // Pitch shift via playback rate: 0.8x (soft) to 1.2x (hard)
      src.playbackRate.value = 0.8 + clampedIntensity * 0.4;
      // Release back to pool when finished
      src.onended = () => pool.releaseSource(src);
      src.start();
      return;
    }

    // Synthesizer fallback with intensity variation
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    const volScale = isMobile ? 0.7 : 1.0;

    osc.type = 'square';

    // Pitch variation: 0.8x to 1.2x
    const pitchFactor = 0.8 + clampedIntensity * 0.4;
    const baseFreq = 880;
    const endFreq = 220;

    osc.frequency.setValueAtTime(baseFreq * pitchFactor, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq * pitchFactor, now + 0.12);

    // Volume variation: 0.3 to 0.6 (with mobile scaling)
    const baseGain = (0.3 + clampedIntensity * 0.3) * volScale;
    gain.gain.setValueAtTime(baseGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch { /* Audio nicht verfügbar */ }
}

// ── Hintergrundmusik ──────────────────────────────────────────────────────────
let bgMusicActive = false;
let bgMusicGain:   GainNode | null = null;
let bgMusicSource: AudioBufferSourceNode | null = null;
// Phase 3: Support streaming audio via HTML audio element
let bgMusicElement: HTMLAudioElement | null = null;

export function startBGMusic(): void {
  if (bgMusicActive || audioSuppressFlipped) return;  // Don't start on low-end mobile
  bgMusicActive = true;
  const ctx  = getAudioCtx();
  bgMusicGain = ctx.createGain();
  bgMusicGain.gain.value = 0.04;
  bgMusicGain.connect(ctx.destination);

  const MELODY = [220, 246.9, 293.7, 329.6, 392, 329.6, 246.9, 220,
                  261.6, 220, 196, 220, 246.9, 329.6, 392, 440];
  const BASS   = [55, 55, 73.4, 82.4, 55, 55, 73.4, 55];
  const TEMPO  = 0.18;
  let step = 0;

  const tick = () => {
    if (!bgMusicActive || !bgMusicGain) return;
    const now = ctx.currentTime;
    const mOsc = ctx.createOscillator(), mGain = ctx.createGain();
    mOsc.type = isMobile ? 'sine' : 'square';  // Smoother on mobile
    mOsc.frequency.value = MELODY[step % MELODY.length];
    mGain.gain.setValueAtTime(0.06, now);
    mGain.gain.exponentialRampToValueAtTime(0.001, now + TEMPO * 0.75);
    mOsc.connect(mGain); mGain.connect(bgMusicGain);
    mOsc.start(now); mOsc.stop(now + TEMPO);

    // Bass: skip on mobile to save audio context
    if (step % 2 === 0 && !isMobile) {
      const bOsc = ctx.createOscillator(), bGain = ctx.createGain(), bFilt = ctx.createBiquadFilter();
      bOsc.type = 'sawtooth';
      bOsc.frequency.value = BASS[(step / 2) % BASS.length];
      bFilt.type = 'lowpass'; bFilt.frequency.value = 280;
      bGain.gain.setValueAtTime(0.25, now + 0.01);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + TEMPO * 1.8);
      bOsc.connect(bFilt); bFilt.connect(bGain); bGain.connect(bgMusicGain);
      bOsc.start(now + 0.01); bOsc.stop(now + TEMPO * 2);
    }
    step++;
    setTimeout(tick, TEMPO * 1000);
  };
  tick();
}

export function stopBGMusic(): void {
  bgMusicActive = false;
  // Phase 3: Stop BufferSource if active
  if (bgMusicSource) { try { bgMusicSource.stop(); } catch { /* ignore */ } bgMusicSource = null; }
  // Phase 3: Stop streaming audio element if active
  if (bgMusicElement) {
    try { bgMusicElement.pause(); bgMusicElement.currentTime = 0; } catch { /* ignore */ }
    bgMusicElement = null;
  }
  if (bgMusicGain) {
    bgMusicGain.gain.setTargetAtTime(0, getAudioCtx().currentTime, 0.3);
    setTimeout(() => { bgMusicGain = null; }, 800);
  }
}

// Phase 3: Support both AudioBuffer (full decode) and Blob URL string (streaming)
export function playFPTMusic(audioResource: AudioBuffer | string): void {
  stopBGMusic();
  bgMusicActive = true;
  const ctx = getAudioCtx();

  // Phase 3: Check if resource is AudioBuffer or Blob URL string
  if (audioResource instanceof AudioBuffer) {
    // Original path: Full decode in memory
    bgMusicGain  = ctx.createGain();
    bgMusicGain.gain.value = 0.5;
    bgMusicGain.connect(ctx.destination);
    bgMusicSource = ctx.createBufferSource();
    bgMusicSource.buffer = audioResource;
    bgMusicSource.loop   = true;
    bgMusicSource.connect(bgMusicGain);
    bgMusicSource.start();
  } else if (typeof audioResource === 'string') {
    // Phase 3: Streaming path via Blob URL
    bgMusicGain = ctx.createGain();
    bgMusicGain.gain.value = 0.5;
    bgMusicGain.connect(ctx.destination);

    // Create audio element for streaming
    bgMusicElement = new Audio(audioResource);
    bgMusicElement.loop = true;
    bgMusicElement.volume = 0.5;

    // Connect audio element to Web Audio API for effects/control
    // Note: Direct connection requires CORS. Fallback: use element's native volume
    try {
      const source = ctx.createMediaElementAudioSource(bgMusicElement);
      source.connect(bgMusicGain);
    } catch (e) {
      // Fallback: use element volume control directly
      bgMusicElement.volume = 0.5;
    }

    bgMusicElement.play().catch(() => {
      // Autoplay may be blocked, ignore
    });
  }
}

export function toggleMusic(): void {
  if (bgMusicActive) { stopBGMusic(); (window as any).showNotification?.('🔇 MUSIK AUS'); }
  else               { startBGMusic(); (window as any).showNotification?.('🎵 MUSIK AN'); }
}
