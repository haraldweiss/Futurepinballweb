/**
 * gpu-diagnostics.ts — GPU Detection & Diagnostics for Windows Multi-GPU Systems
 *
 * Provides detailed GPU information for cabinets with multiple graphics cards
 * (integrated + discrete GPU configurations on Windows)
 */

export interface GPUInfo {
  renderer: string;
  vendor: string;
  version: string;
  shadingLanguageVersion: string;
  extensions: string[];
  maxTextureSize: number;
  maxCubemapSize: number;
  maxRenderBufferSize: number;
  maxViewportDims: [number, number];
  tier: 'low' | 'mid' | 'high' | 'unknown';
  estimatedVRAM: number;
  webglVersion: number;
  debugInfoAvailable: boolean;
}

/**
 * Detect detailed GPU information
 * Works on Windows with dual GPU (integrated + discrete)
 */
export function detectGPUInfo(): GPUInfo {
  const info: GPUInfo = {
    renderer: 'Unknown',
    vendor: 'Unknown',
    version: 'Unknown',
    shadingLanguageVersion: 'Unknown',
    extensions: [],
    maxTextureSize: 0,
    maxCubemapSize: 0,
    maxRenderBufferSize: 0,
    maxViewportDims: [0, 0],
    tier: 'unknown',
    estimatedVRAM: 0,
    webglVersion: 0,
    debugInfoAvailable: false,
  };

  try {
    const canvas = document.createElement('canvas');

    // Try WebGL 2 first (better support on modern systems)
    let gl = canvas.getContext('webgl2') as WebGLRenderingContext;
    if (gl) {
      info.webglVersion = 2;
    } else {
      gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext;
      if (gl) info.webglVersion = 1;
    }

    if (!gl) {
      console.warn('WebGL not available');
      return info;
    }

    // Get basic info (always available)
    info.renderer = gl.getParameter(gl.RENDERER) as string;
    info.vendor = gl.getParameter(gl.VENDOR) as string;
    info.version = gl.getParameter(gl.VERSION) as string;
    info.shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION) as string;

    // Get renderer limits
    info.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    info.maxCubemapSize = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE) as number;
    info.maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number;
    const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
    info.maxViewportDims = [viewport[0], viewport[1]];

    // Get available extensions
    info.extensions = gl.getSupportedExtensions() || [];

    // Try to get debug renderer info (may be blocked on Windows)
    try {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        info.debugInfoAvailable = true;
        // Attempt to get unmasked values
        try {
          const unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          if (unmaskedRenderer) {
            info.renderer = unmaskedRenderer as string;
          }
          const unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          if (unmaskedVendor) {
            info.vendor = unmaskedVendor as string;
          }
        } catch {
          // Extension blocked - use masked values
        }
      }
    } catch {
      // Debug extension not available
    }

    // Estimate VRAM based on max texture size and GPU type
    info.estimatedVRAM = estimateVRAM(info);

    // Determine GPU tier
    info.tier = classifyGPU(info);

    return info;
  } catch (error) {
    console.error('GPU detection error:', error);
    return info;
  }
}

/**
 * Classify GPU capability tier
 */
function classifyGPU(info: GPUInfo): 'low' | 'mid' | 'high' | 'unknown' {
  const renderer = info.renderer.toLowerCase();
  const vendor = info.vendor.toLowerCase();

  // High-end: Discrete NVIDIA/AMD, Apple GPU, Intel Arc
  if (renderer.includes('rtx') ||
      renderer.includes('gtx') ||
      renderer.includes('geforce') ||
      renderer.includes('radeon') ||
      renderer.includes('rx') ||
      renderer.includes('rdna') ||
      renderer.includes('arc') ||
      renderer.includes('apple') ||
      renderer.includes('metal')) {
    return 'high';
  }

  // Low-end: Mobile chips, Atom
  if (renderer.includes('mali') ||
      renderer.includes('adreno') ||
      renderer.includes('powervr') ||
      renderer.includes('atom')) {
    return 'low';
  }

  // Mid-range: Intel iGPU, UHD, Iris
  if (renderer.includes('intel') ||
      renderer.includes('uhd') ||
      renderer.includes('iris') ||
      renderer.includes('hd graphics')) {
    return info.maxTextureSize >= 16384 ? 'mid' : 'low';
  }

  // Unknown - default to mid
  return 'mid';
}

/**
 * Estimate VRAM in MB based on GPU capabilities
 */
function estimateVRAM(info: GPUInfo): number {
  const tier = classifyGPU(info);

  if (tier === 'high') {
    // Discrete GPUs: 2GB-24GB
    if (info.maxTextureSize >= 16384) {
      return 4096; // Conservative estimate for modern GPU
    }
    return 2048;
  } else if (tier === 'mid') {
    // iGPU/Mobile: typically 512MB-2GB shared
    if (info.maxTextureSize >= 8192) {
      return 1024;
    }
    return 512;
  } else {
    // Low-end: 256-512MB
    return 256;
  }
}

/**
 * Format GPU info for display
 */
export function formatGPUInfo(info: GPUInfo): string {
  let output = '═══════════════════════════════════════════════════════\n';
  output += '  GPU Diagnostics\n';
  output += '═══════════════════════════════════════════════════════\n\n';

  output += `🖥️  Renderer: ${info.renderer}\n`;
  output += `🏢 Vendor: ${info.vendor}\n`;
  output += `📊 Version: ${info.version}\n`;
  output += `✨ GLSL Version: ${info.shadingLanguageVersion}\n`;
  output += `📌 WebGL Version: ${info.webglVersion}\n`;
  output += `🔒 Debug Info Available: ${info.debugInfoAvailable ? '✅' : '❌'}\n\n`;

  output += `📈 Capabilities:\n`;
  output += `   Max Texture Size: ${info.maxTextureSize}x${info.maxTextureSize}px\n`;
  output += `   Max Cubemap Size: ${info.maxCubemapSize}px\n`;
  output += `   Max Renderbuffer: ${info.maxRenderBufferSize}px\n`;
  output += `   Max Viewport: ${info.maxViewportDims[0]}x${info.maxViewportDims[1]}px\n`;
  output += `   Estimated VRAM: ~${info.estimatedVRAM}MB\n\n`;

  output += `⭐ Classification: ${info.tier.toUpperCase()}\n`;
  output += `   Low: Integrated/Mobile GPU\n`;
  output += `   Mid: Mainstream discrete/iGPU\n`;
  output += `   High: High-end discrete (RTX/RX)\n\n`;

  output += `🔌 Supported Extensions: ${info.extensions.length} available\n`;
  if (info.extensions.length > 0) {
    // Show key extensions
    const keyExts = info.extensions.filter(e =>
      e.includes('float') || e.includes('anisotropic') || e.includes('compression') ||
      e.includes('depth') || e.includes('shadow') || e.includes('derivative')
    );
    if (keyExts.length > 0) {
      output += `   Key: ${keyExts.slice(0, 5).join(', ')}\n`;
    }
  }

  output += '\n═══════════════════════════════════════════════════════\n';

  return output;
}

/**
 * Windows multi-GPU detection
 * On Windows with dual GPU (integrated + discrete), shows info about the active GPU
 */
export function detectWindowsGPUSetup(): {
  active: GPUInfo;
  isDiscreteGPU: boolean;
  isDualGPUSystem: boolean;
  recommendation: string;
} {
  const info = detectGPUInfo();
  const isDiscreteGPU = classifyGPU(info) === 'high';
  const isDualGPUSystem = isDiscreteGPU || info.renderer.toLowerCase().includes('intel');

  let recommendation = '';
  if (isDiscreteGPU) {
    recommendation = '✅ Using discrete GPU (optimal for gaming/graphics)';
  } else if (info.renderer.toLowerCase().includes('intel')) {
    recommendation = '⚠️  Using integrated GPU (Intel iGPU). For better performance, enable discrete GPU in Windows Settings → Graphics Settings';
  } else {
    recommendation = 'GPU configuration detected';
  }

  return {
    active: info,
    isDiscreteGPU,
    isDualGPUSystem,
    recommendation,
  };
}

/**
 * Global function for console diagnostics
 */
declare global {
  interface Window {
    diagnoseGPU?: () => void;
  }
}

export function initializeGPUDiagnostics() {
  window.diagnoseGPU = () => {
    const info = detectGPUInfo();
    console.log(formatGPUInfo(info));

    // Check for Windows dual-GPU setup
    const setup = detectWindowsGPUSetup();
    if (setup.isDualGPUSystem) {
      console.log('💡 Windows Multi-GPU System Detected:');
      console.log(setup.recommendation);
    }
  };

  console.log('✓ GPU Diagnostics initialized. Use diagnoseGPU() for details.');
}
