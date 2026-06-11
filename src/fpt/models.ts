// SPDX-License-Identifier: AGPL-3.0-or-later
import * as CFB from 'cfb';
import type { CFB$Container } from 'cfb';
import { logMsg } from './log';

export function extractMS3DModelsFromCFB(arrayBuffer: ArrayBuffer): Map<string, Uint8Array> {
  const models = new Map<string, Uint8Array>();

  let cfb: CFB$Container;
  try { cfb = CFB.read(new Uint8Array(arrayBuffer), { type: 'array' }); }
  catch(e: any) { logMsg(`CFB Parse-Fehler beim Model-Extract: ${e.message}`, 'warn'); return models; }

  const entries = (cfb.FileIndex || []).filter((e) => e.size > 0 && e.name && e.name !== 'Root Entry');

  for (const entry of entries) {
    const name: string = entry.name || '';
    const raw = entry.content;
    const bytes: Uint8Array = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
    const nameL = name.toLowerCase();

    const isModelStream = nameL.includes('mesh') ||
                         nameL.includes('model') ||
                         nameL.endsWith('.ms3d') ||
                         nameL.startsWith('_3d');

    if (!isModelStream) continue;

    if (bytes.length >= 4) {
      const header = new TextDecoder().decode(bytes.slice(0, 4));
      if (header === 'MS3D') {
        models.set(name, bytes);
        logMsg(`  MS3D Model: "${name}" (${(bytes.length/1024).toFixed(0)} KB)`, 'ok');
      }
    }
  }

  return models;
}

export function extractAnimationSequencesFromCFB(arrayBuffer: ArrayBuffer): Map<string, any> {
  const animations = new Map<string, any>();

  let cfb: CFB$Container;
  try { cfb = CFB.read(new Uint8Array(arrayBuffer), { type: 'array' }); }
  catch(e: any) { logMsg(`CFB Parse-Fehler beim Animation-Extract: ${e.message}`, 'warn'); return animations; }

  const entries = (cfb.FileIndex || []).filter((e) => e.size > 0 && e.name && e.name !== 'Root Entry');

  for (const entry of entries) {
    const name: string = entry.name || '';
    const raw = entry.content;
    const bytes: Uint8Array = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
    const nameL = name.toLowerCase();

    const isAnimationStream = /animation|sequence|anim|frame|motion|action|keyframe|\.seq/i.test(nameL);

    if (!isAnimationStream) continue;

    try {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

      if (/FRAME|FRAMERATE|POS|ROT|SCALE|DURATION/i.test(text)) {
        const sequence = parseSequenceFormat(text, name);
        if (sequence && sequence.frames && sequence.frames.length > 0) {
          animations.set(name, sequence);
          logMsg(`  Animation: "${name}" (${sequence.frames.length} Frames, ${sequence.duration}ms)`, 'ok');
        }
      } else if (text.includes('{') && text.includes('}')) {
        try {
          const json = JSON.parse(text);
          if (json.frames && Array.isArray(json.frames)) {
            animations.set(name, json);
            logMsg(`  Animation (JSON): "${name}" (${json.frames.length} Frames)`, 'ok');
          }
        } catch { void 0; }
      }
    } catch (e: any) {
      if (nameL.includes('anim')) {
        logMsg(`  ⚠ Animation-Stream "${name}" konnte nicht dekodiert werden`, 'warn');
      }
    }
  }

  return animations;
}

function parseSequenceFormat(text: string, sequenceName: string): any {
  try {
    const lines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    let name = sequenceName.replace(/\.seq$/i, '');
    let frameRate = 60;
    const frames: any[] = [];

    let currentFrame: any = null;
    let frameIndex = 0;

    for (const line of lines) {
      const tokens = line.split(/\s+/);
      const cmd = tokens[0].toUpperCase();

      if (cmd === 'NAME') {
        name = tokens.slice(1).join(' ') || name;
      } else if (cmd === 'FRAMERATE') {
        frameRate = parseInt(tokens[1]) || 60;
      } else if (cmd === 'FRAME') {
        if (currentFrame) {
          currentFrame.duration = currentFrame.duration || 0;
          frames.push(currentFrame);
        }
        frameIndex = parseInt(tokens[1]) || frames.length;
        currentFrame = {
          time: (frameIndex / frameRate) * 1000,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          duration: 0,
        };
      } else if (currentFrame) {
        if (cmd === 'POS' && tokens.length >= 4) {
          currentFrame.position = {
            x: parseFloat(tokens[1]) || 0,
            y: parseFloat(tokens[2]) || 0,
            z: parseFloat(tokens[3]) || 0,
          };
        } else if (cmd === 'ROT' && tokens.length >= 4) {
          currentFrame.rotation = {
            x: parseFloat(tokens[1]) || 0,
            y: parseFloat(tokens[2]) || 0,
            z: parseFloat(tokens[3]) || 0,
          };
        } else if (cmd === 'SCALE' && tokens.length >= 4) {
          currentFrame.scale = {
            x: parseFloat(tokens[1]) || 1,
            y: parseFloat(tokens[2]) || 1,
            z: parseFloat(tokens[3]) || 1,
          };
        } else if (cmd === 'DURATION' && tokens.length >= 2) {
          currentFrame.duration = parseInt(tokens[1]) || 0;
        }
      }
    }

    if (currentFrame) {
      frames.push(currentFrame);
    }

    if (frames.length === 0) return null;

    const duration = frames.reduce((sum, f) => sum + f.duration, 0);

    return {
      name,
      frameRate,
      frames,
      looping: false,
      duration,
    };
  } catch (e: any) {
    logMsg(`  ⚠ Fehler beim Parsen von ${sequenceName}: ${e.message}`, 'warn');
    return null;
  }
}
