/**
 * Responsive Display Scaling System
 * Auto-adjusts playfield, DMD, and backglass to screen dimensions
 * Handles window resize and multi-screen setups
 */

export interface DisplayDimensions {
  width: number;
  height: number;
  pixelRatio: number;
  aspectRatio: number;
  isMobile: boolean;
  isPortrait: boolean;
}

export interface CanvasScaling {
  canvasWidth: number;
  canvasHeight: number;
  displayWidth: number;
  displayHeight: number;
  scale: number;
}

/**
 * Get current display dimensions with DPI awareness
 */
export function getDisplayDimensions(): DisplayDimensions {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 3); // Cap at 3x for performance
  const aspectRatio = width / height;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  const isPortrait = height > width;

  return {
    width,
    height,
    pixelRatio,
    aspectRatio,
    isMobile,
    isPortrait,
  };
}

/**
 * Calculate optimal canvas size for playfield (main 3D canvas)
 * Uses full window size with DPI scaling
 */
export function getPlayfieldCanvasSize(): CanvasScaling {
  const dims = getDisplayDimensions();
  const canvasWidth = dims.width * dims.pixelRatio;
  const canvasHeight = dims.height * dims.pixelRatio;

  return {
    canvasWidth,
    canvasHeight,
    displayWidth: dims.width,
    displayHeight: dims.height,
    scale: dims.pixelRatio,
  };
}

/**
 * Calculate optimal size for DMD display (128x32 native resolution)
 * Scales to fit available space while maintaining 4:1 aspect ratio
 */
export function getDMDSize(containerWidth?: number, containerHeight?: number): CanvasScaling {
  // Default to window dimensions if container not specified
  const width = containerWidth || window.innerWidth;
  const height = containerHeight || window.innerHeight;

  // DMD native aspect ratio: 128/32 = 4:1
  const DMD_NATIVE_WIDTH = 128;
  const DMD_NATIVE_HEIGHT = 32;
  const DMD_ASPECT = DMD_NATIVE_WIDTH / DMD_NATIVE_HEIGHT; // 4:1

  // Calculate max size while maintaining aspect ratio
  let dmdWidth = width * 0.25; // Default to 25% of width
  let dmdHeight = dmdWidth / DMD_ASPECT;

  // If height is constraint, scale by height
  if (dmdHeight > height * 0.3) {
    dmdHeight = height * 0.3;
    dmdWidth = dmdHeight * DMD_ASPECT;
  }

  // Minimum size for readability
  const minWidth = 256; // 128 * 2
  if (dmdWidth < minWidth) {
    dmdWidth = minWidth;
    dmdHeight = dmdWidth / DMD_ASPECT;
  }

  // Create canvas at 2x native resolution for crisp dots
  const scale = 2;
  const canvasWidth = DMD_NATIVE_WIDTH * scale;
  const canvasHeight = DMD_NATIVE_HEIGHT * scale;

  return {
    canvasWidth,
    canvasHeight,
    displayWidth: Math.floor(dmdWidth),
    displayHeight: Math.floor(dmdHeight),
    scale,
  };
}

/**
 * Calculate optimal size for backglass display
 * Handles both inline and popup window scenarios
 */
export function getBackglassSize(containerWidth?: number, containerHeight?: number): CanvasScaling {
  const width = containerWidth || window.innerWidth;
  const height = containerHeight || window.innerHeight;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  // Backglass aspect ratio: typically 4:3 or 16:9
  const BACKGLASS_ASPECT = 16 / 9;

  // Use full available space
  let bgWidth = width;
  let bgHeight = width / BACKGLASS_ASPECT;

  // If height is constraint
  if (bgHeight > height) {
    bgHeight = height;
    bgWidth = bgHeight * BACKGLASS_ASPECT;
  }

  // Scale for DPI
  const canvasWidth = Math.floor(bgWidth * pixelRatio);
  const canvasHeight = Math.floor(bgHeight * pixelRatio);

  return {
    canvasWidth,
    canvasHeight,
    displayWidth: Math.floor(bgWidth),
    displayHeight: Math.floor(bgHeight),
    scale: pixelRatio,
  };
}

/**
 * Calculate optimal renderer size with multi-screen awareness
 * For main playfield in multi-screen mode
 */
export function getPlayfieldRendererSize(screenRole?: 'primary' | 'secondary'): CanvasScaling {
  const dims = getDisplayDimensions();

  // For secondary/popup windows, might be smaller
  const widthFactor = screenRole === 'secondary' ? 0.9 : 1.0;
  const heightFactor = screenRole === 'secondary' ? 0.9 : 1.0;

  const displayWidth = Math.floor(dims.width * widthFactor);
  const displayHeight = Math.floor(dims.height * heightFactor);
  const canvasWidth = displayWidth * dims.pixelRatio;
  const canvasHeight = displayHeight * dims.pixelRatio;

  return {
    canvasWidth,
    canvasHeight,
    displayWidth,
    displayHeight,
    scale: dims.pixelRatio,
  };
}

/**
 * Watch for resize events and trigger callback
 */
export function onDisplayResize(callback: (dims: DisplayDimensions) => void): () => void {
  let resizeTimeout: number;

  const handleResize = () => {
    clearTimeout(resizeTimeout);
    // Debounce resize events
    resizeTimeout = window.setTimeout(() => {
      callback(getDisplayDimensions());
    }, 150);
  };

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
  };
}

/**
 * Detect if display has changed (e.g., moved to different monitor)
 */
export function onDisplayChange(callback: () => void): () => void {
  let lastWidth = window.innerWidth;
  let lastHeight = window.innerHeight;
  let checkInterval: number;

  // Check periodically for display changes
  checkInterval = window.setInterval(() => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    if (newWidth !== lastWidth || newHeight !== lastHeight) {
      lastWidth = newWidth;
      lastHeight = newHeight;
      callback();
    }
  }, 500);

  // Also listen for resize events
  const unsubscribeResize = onDisplayResize(() => callback());

  // Return cleanup function
  return () => {
    clearInterval(checkInterval);
    unsubscribeResize();
  };
}

/**
 * Apply CSS scaling to canvas element
 */
export function applyCanvasScaling(
  canvas: HTMLCanvasElement,
  scaling: CanvasScaling
): void {
  // Set internal resolution for rendering
  canvas.width = scaling.canvasWidth;
  canvas.height = scaling.canvasHeight;

  // Set display size via CSS
  canvas.style.width = `${scaling.displayWidth}px`;
  canvas.style.height = `${scaling.displayHeight}px`;

  // Set context scale for crisp rendering
  const ctx = canvas.getContext('2d');
  if (ctx && scaling.scale !== 1) {
    ctx.scale(scaling.scale, scaling.scale);
  }
}

/**
 * Apply CSS scaling to WebGL renderer
 */
export function applyRendererScaling(
  renderer: any, // THREE.WebGLRenderer
  scaling: CanvasScaling
): void {
  renderer.setSize(scaling.canvasWidth, scaling.canvasHeight, false);
  renderer.setPixelRatio(1); // We handle pixel ratio in scaling
}

/**
 * Responsive font size for DMD display
 */
export function getDMDFontSize(dmdHeight: number): number {
  // Scale font size based on DMD height
  // Example: 256px height → ~32px font, 512px height → ~64px font
  return Math.max(8, Math.floor(dmdHeight / 8));
}

/**
 * Calculate optimal dot size for DMD based on container
 */
export function getDMDDotSize(containerHeight: number): { dotSize: number; gap: number } {
  // DMD has 32 pixels vertically
  const pixelsPerHeight = 32;
  const baseDotSize = Math.floor(containerHeight / pixelsPerHeight);

  // Ensure minimum readability
  const dotSize = Math.max(4, baseDotSize);
  const gap = Math.max(1, Math.floor(dotSize * 0.25)); // 25% gap

  return { dotSize, gap };
}
