// SPDX-License-Identifier: AGPL-3.0-or-later
export interface FrameState {
  frame: number;
  type: 'state';
  score: number;
  ballNum: number;
  multiplier: number;
  inLane: boolean;
  dmdMode: string;
  dmdEventText: string;
  dmdAnimFrame: number;
  dmdScrollX: number;
  dmdEventTimer: number;
  lastRank: number;
  lastScore: number;
  bumperHits: number;
  tableName: string;
  tableAccent: number;
  tableColor: number;
  highScores: number[];
}

const SYNC_FRAME_INTERVAL = 1000 / 30;
const BC_CHANNEL_NAME = 'fpw-sync';

let _transport: SyncTransportImpl | null = null;
let _lastFrameEmit = 0;
let _frameCounter = 0;
let _receiveHandler: ((data: FrameState) => void) | null = null;

class SyncTransportImpl {
  private bc: BroadcastChannel | null = null;
  private electronAPI: any = null;

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.bc = new BroadcastChannel(BC_CHANNEL_NAME);
    }
    if (typeof window !== 'undefined') {
      this.electronAPI = window.electronAPI;
    }
    this.setupReceiver();
  }

  private setupReceiver(): void {
    if (this.bc) {
      this.bc.onmessage = (ev) => {
        if (_receiveHandler) _receiveHandler(ev.data);
      };
    }
    if (this.electronAPI?.onStateBroadcast) {
      this.electronAPI.onStateBroadcast((data: any) => {
        if (_receiveHandler) _receiveHandler(data);
      });
    }
  }

  send(payload: FrameState): void {
    const now = performance.now();
    if (now - _lastFrameEmit < SYNC_FRAME_INTERVAL) return;
    _lastFrameEmit = now;

    payload.frame = _frameCounter++;

    if (this.electronAPI?.broadcastState) {
      this.electronAPI.broadcastState(payload);
    } else if (this.bc) {
      this.bc.postMessage(payload);
    }
  }

  destroy(): void {
    if (this.bc) this.bc.close();
  }
}

export function initSyncTransport(): void {
  if (!_transport) {
    _transport = new SyncTransportImpl();
  }
}

export function getSyncTransport(): SyncTransportImpl | null {
  return _transport;
}

export function emitSyncFrame(payload: Omit<FrameState, 'frame'>): void {
  _transport?.send(payload as FrameState);
}

export function onSyncFrame(handler: (data: FrameState) => void): void {
  _receiveHandler = handler;
}

export function destroySyncTransport(): void {
  _transport?.destroy();
  _transport = null;
  _receiveHandler = null;
}
