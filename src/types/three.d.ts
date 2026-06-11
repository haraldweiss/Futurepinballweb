declare module 'three' {
  type _<T = any> = T;
  export type Mesh = _;
  export type Scene = _;
  export type Camera = _;
  export type PerspectiveCamera = _;
  export type WebGLRenderer = _;
  export type Vector2 = _;
  export type Vector3 = _;
  export type Group = _;
  export type Object3D = _;
  export type Light = _;
  export type SpotLight = _;
  export type AmbientLight = _;
  export type PointLight = _;
  export type DirectionalLight = _;
  export type Sprite = _;
  export type SpriteMaterial = _;
  export type CanvasTexture = _;
  export type Texture = _;
  export type Material = _;
  export type MeshStandardMaterial = _;
  export type MeshPhysicalMaterial = _;
  export type MeshBasicMaterial = _;
  export type PointsMaterial = _;
  export type LineBasicMaterial = _;
  export type BufferGeometry = _;
  export type BufferAttribute = _;
  export type BoxGeometry = _;
  export type SphereGeometry = _;
  export type CylinderGeometry = _;
  export type TorusGeometry = _;
  export type IcosahedronGeometry = _;
  export type PlaneGeometry = _;
  export type ExtrudeGeometry = _;
  export type Shape = _;
  export type Points = _;
  export type Line = _;
  export type Color = _;
  export type Fog = _;
  export type MathUtils = _;
  export type Quaternion = _;
  export type Clock = _;
  export type FullScreenQuad = _;
  export type ShaderMaterial = _;
  export type Shader = _;
  export type OrthographicCamera = _;
  export type Euler = _;
  export type WebGLRenderTarget = _;
  export type EffectComposer = _;
  export type RenderPass = _;
  export type UnrealBloomPass = _;
  export type ShaderPass = _;
  export type FXAAShader = _;
  export type LineSegments = _;
  export type EdgesGeometry = _;
  export type WireframeGeometry = _;
  export type LineLoop = _;
  export type RingGeometry = _;
  export type FileLoader = _;
  export type Loader = _;
  export type LoadingManager = _;
  export type DataTexture = _;
  export type NearestFilter = _;
  export type RGBAFormat = _;
  export type UnsignedByteType = _;
  export type RepeatWrapping = _;
  export type MirroredRepeatWrapping = _;
  export type ClampToEdgeWrapping = _;
  export type LinearFilter = _;
  export type NearestMipmapLinearFilter = _;
  export type LinearMipmapLinearFilter = _;
  export type LinearMipmapNearestFilter = _;
  export type NearestMipmapNearestFilter = _;
  export type SRGBColorSpace = _;
  export type LinearSRGBColorSpace = _;
  export type ACESFilmicToneMapping = _;
  export type PCFSoftShadowMap = _;
  export type FrontSide = _;
  export type DoubleSide = _;
  export type AdditiveBlending = _;
  export type NormalBlending = _;
  export type EquirectangularReflectionMapping = _;
  export type CubeTextureLoader = _;
  export type HalfFloatType = _;
  export type FloatType = _;
  export type RedFormat = _;
  export type DepthFormat = _;
  export type DepthStencilFormat = _;
  export type Data3DTexture = _;
  export type Matrix4 = _;

  const THREE: any;
  export = THREE;
}

declare module 'three/addons/postprocessing/EffectComposer' {
  interface EffectComposer { [key: string]: any }
  const EffectComposer: new (...args: any[]) => EffectComposer;
  export { EffectComposer };
}
declare module 'three/addons/postprocessing/RenderPass' {
  interface RenderPass { [key: string]: any }
  const RenderPass: new (...args: any[]) => RenderPass;
  export { RenderPass };
}
declare module 'three/addons/postprocessing/UnrealBloomPass' {
  interface UnrealBloomPass { [key: string]: any }
  const UnrealBloomPass: new (...args: any[]) => UnrealBloomPass;
  export { UnrealBloomPass };
}
declare module 'three/addons/postprocessing/ShaderPass' {
  interface ShaderPass { [key: string]: any }
  const ShaderPass: new (...args: any[]) => ShaderPass;
  export { ShaderPass };
}
declare module 'three/addons/shaders/FXAAShader' {
  const FXAAShader: any;
  export { FXAAShader };
}
declare module 'three/addons/postprocessing/EffectComposer.js' {
  interface EffectComposer { [key: string]: any }
  const EffectComposer: new (...args: any[]) => EffectComposer;
  export { EffectComposer };
}
declare module 'three/addons/postprocessing/RenderPass.js' {
  interface RenderPass { [key: string]: any }
  const RenderPass: new (...args: any[]) => RenderPass;
  export { RenderPass };
}
declare module 'three/addons/postprocessing/UnrealBloomPass.js' {
  interface UnrealBloomPass { [key: string]: any }
  const UnrealBloomPass: new (...args: any[]) => UnrealBloomPass;
  export { UnrealBloomPass };
}
declare module 'three/addons/postprocessing/ShaderPass.js' {
  interface ShaderPass { [key: string]: any }
  const ShaderPass: new (...args: any[]) => ShaderPass;
  export { ShaderPass };
}
declare module 'three/addons/shaders/FXAAShader.js' {
  const FXAAShader: any;
  export { FXAAShader };
}
declare module 'three/examples/jsm/postprocessing/EffectComposer.js' {
  interface EffectComposer { [key: string]: any }
  const EffectComposer: new (...args: any[]) => EffectComposer;
  export { EffectComposer };
}
declare module 'three/examples/jsm/postprocessing/RenderPass.js' {
  interface RenderPass { [key: string]: any }
  const RenderPass: new (...args: any[]) => RenderPass;
  export { RenderPass };
}
declare module 'three/examples/jsm/postprocessing/UnrealBloomPass.js' {
  interface UnrealBloomPass { [key: string]: any }
  const UnrealBloomPass: new (...args: any[]) => UnrealBloomPass;
  export { UnrealBloomPass };
}
declare module 'three/examples/jsm/postprocessing/ShaderPass.js' {
  interface ShaderPass { [key: string]: any }
  const ShaderPass: new (...args: any[]) => ShaderPass;
  export { ShaderPass };
}
declare module 'three/examples/jsm/shaders/FXAAShader.js' {
  const FXAAShader: any;
  export { FXAAShader };
}

// Extend Performance with Chrome-specific memory API
interface PerformanceMemory {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}
interface Performance {
  memory?: PerformanceMemory;
}

// Safari/older WebKit fullscreen API
interface Document {
  webkitFullscreenElement?: Element | null;
}
