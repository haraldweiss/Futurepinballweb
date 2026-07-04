// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * parse-worker-bridge.ts — Main-thread bridge to the FPT parse worker.
 *
 * Manages worker lifecycle, sends file buffers, receives results with
 * Transferable Objects (zero-copy), and forwards progress/log signals
 * to the main-thread UI.
 */

import type { ParseWorkerOutput, WorkerResult, WorkerError } from './parse-worker';

export type ParseProgressCallback = (stage: string, message: string, percent: number) => void;
export type ParseLogCallback = (level: 'info' | 'ok' | 'warn' | 'error', text: string) => void;

interface ParseCallbacks {
  onProgress?: ParseProgressCallback;
  onLog?: ParseLogCallback;
}

/**
 * Parse an FPT/FPL file buffer using the worker.
 * Returns the parsed output when the worker finishes.
 * The worker handles: CFB parsing, LZO decompression, model extraction.
 */
export function parseFileInWorker(
  buffer: ArrayBuffer,
  fileName: string,
  fileSize: number,
  callbacks?: ParseCallbacks,
): Promise<ParseWorkerOutput> {
  return new Promise((resolve, reject) => {
    // Create the worker — Vite handles bundling import.meta.url syntax
    const worker = new Worker(
      new URL('./parse-worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (event) => {
      const msg = event.data;

      if (msg.type === 'result') {
        const result = msg as WorkerResult;
        worker.terminate();
        resolve(result.data);
      } else if (msg.type === 'error') {
        const err = msg as WorkerError;
        worker.terminate();
        reject(new Error(err.message));
      } else if (msg.type === 'progress') {
        callbacks?.onProgress?.(msg.stage, msg.message, msg.percent);
      } else if (msg.type === 'log') {
        callbacks?.onLog?.(msg.level, msg.text);
      }
    };

    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(`Worker error: ${event.message}`));
    };

    worker.onmessageerror = () => {
      worker.terminate();
      reject(new Error('Worker deserialization error'));
    };

    // Send the file buffer with Transferable Object (zero-copy)
    worker.postMessage(
      { type: 'parse-file', buffer, fileName, fileSize },
      [buffer],
    );
  });
}
