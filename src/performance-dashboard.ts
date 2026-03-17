/**
 * performance-dashboard.ts — Real-time performance monitoring
 * Phase 24: Visibility into game performance & health
 * 
 * For gamers: See FPS, latency
 * For security: Audit logs, anomaly detection
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  inputLatency: number;
  physicsTime: number;
  renderTime: number;
  memoryUsage: number;
  ballVelocity: number;
  flipperResponse: number;
}

export interface GameAuditEvent {
  timestamp: number;
  type: string;  // 'input', 'physics', 'collision', 'score', 'state'
  severity: 'info' | 'warning' | 'error';
  message: string;
  data?: any;
}

/**
 * Performance Dashboard - Real-time metrics collection
 */
export class PerformanceDashboard {
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    inputLatency: 0,
    physicsTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    ballVelocity: 0,
    flipperResponse: 0,
  };

  private auditLog: GameAuditEvent[] = [];
  private frameTimeHistory: number[] = [];
  private lastFrameTime = performance.now();
  private frameCount = 0;
  private enabled = true;

  /**
   * Update performance metrics
   */
  recordFrame(data: {
    frameTime: number;
    inputLatency?: number;
    physicsTime?: number;
    renderTime?: number;
    ballVelocity?: number;
    flipperResponse?: number;
  }): void {
    if (!this.enabled) return;

    this.metrics.frameTime = data.frameTime;
    this.metrics.inputLatency = data.inputLatency ?? 0;
    this.metrics.physicsTime = data.physicsTime ?? 0;
    this.metrics.renderTime = data.renderTime ?? 0;
    this.metrics.ballVelocity = data.ballVelocity ?? 0;
    this.metrics.flipperResponse = data.flipperResponse ?? 0;

    // Track memory usage
    if (performance.memory) {
      this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1048576; // MB
    }

    // Calculate FPS
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= 1000) {
      this.metrics.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    // Keep history for trend analysis
    this.frameTimeHistory.push(data.frameTime);
    if (this.frameTimeHistory.length > 300) {
      this.frameTimeHistory.shift();
    }

    // Check for performance anomalies
    this.checkAnomalies();
  }

  /**
   * Log audit event
   */
  recordAuditEvent(type: string, message: string, severity: 'info' | 'warning' | 'error' = 'info', data?: any): void {
    if (!this.enabled) return;

    const event: GameAuditEvent = {
      timestamp: Date.now(),
      type,
      severity,
      message,
      data,
    };

    this.auditLog.push(event);

    // Keep last 1000 events
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }

    // Log severe events to console
    if (severity === 'error') {
      console.error(`[Audit] ${message}`, data);
    } else if (severity === 'warning') {
      console.warn(`[Audit] ${message}`, data);
    }
  }

  /**
   * Check for performance anomalies
   */
  private checkAnomalies(): void {
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    const currentFrameTime = this.frameTimeHistory[this.frameTimeHistory.length - 1];

    // Detect frame spike
    if (currentFrameTime > avgFrameTime * 2) {
      this.recordAuditEvent(
        'performance',
        `Frame spike detected: ${currentFrameTime.toFixed(2)}ms (avg: ${avgFrameTime.toFixed(2)}ms)`,
        'warning',
        { frameTime: currentFrameTime, average: avgFrameTime }
      );
    }

    // Detect low FPS
    if (this.metrics.fps < 30) {
      this.recordAuditEvent(
        'performance',
        `Low FPS: ${this.metrics.fps}`,
        'warning',
        { fps: this.metrics.fps }
      );
    }

    // Detect input lag
    if (this.metrics.inputLatency > 50) {
      this.recordAuditEvent(
        'input',
        `High input latency: ${this.metrics.inputLatency.toFixed(2)}ms`,
        'warning',
        { latency: this.metrics.inputLatency }
      );
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get formatted metrics string
   */
  getMetricsString(): string {
    return `FPS: ${this.metrics.fps.toFixed(0)} | Frame: ${this.metrics.frameTime.toFixed(1)}ms | Input: ${this.metrics.inputLatency.toFixed(1)}ms | Physics: ${this.metrics.physicsTime.toFixed(1)}ms | Render: ${this.metrics.renderTime.toFixed(1)}ms | Memory: ${this.metrics.memoryUsage.toFixed(1)}MB`;
  }

  /**
   * Get frame time trend (for graphs)
   */
  getFrameTimeTrend(): number[] {
    return [...this.frameTimeHistory];
  }

  /**
   * Get recent audit events
   */
  getAuditLog(type?: string, severity?: string, limit: number = 100): GameAuditEvent[] {
    let events = [...this.auditLog];

    if (type) {
      events = events.filter(e => e.type === type);
    }

    if (severity) {
      events = events.filter(e => e.severity === severity);
    }

    return events.slice(-limit);
  }

  /**
   * Get audit summary
   */
  getAuditSummary(): { info: number; warnings: number; errors: number } {
    return {
      info: this.auditLog.filter(e => e.severity === 'info').length,
      warnings: this.auditLog.filter(e => e.severity === 'warning').length,
      errors: this.auditLog.filter(e => e.severity === 'error').length,
    };
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
    this.frameTimeHistory = [];
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): {
    timestamp: number;
    metrics: PerformanceMetrics;
    auditLog: GameAuditEvent[];
    frameTrend: number[];
  } {
    return {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      auditLog: [...this.auditLog],
      frameTrend: [...this.frameTimeHistory],
    };
  }
}

/**
 * Singleton instance
 */
let dashboard: PerformanceDashboard | null = null;

/**
 * Get performance dashboard singleton
 */
export function getPerformanceDashboard(): PerformanceDashboard {
  if (!dashboard) {
    dashboard = new PerformanceDashboard();
  }
  return dashboard;
}

/**
 * Dispose dashboard
 */
export function disposePerformanceDashboard(): void {
  if (dashboard) {
    dashboard = null;
  }
}

