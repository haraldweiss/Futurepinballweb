// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsed: number;
  memoryTotal: number;
  drawCalls: number;
  triangles: number;
}
