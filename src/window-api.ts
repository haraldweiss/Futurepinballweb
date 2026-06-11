// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * window-api.ts — Typed Window API surface for HTML inline event handlers.
 *
 * All functions / values that used to live as bare `(window as any).X = …`
 * assignments in `main.ts` are now registered through a single typed entry
 * point.  This eliminates global‑namespace pollution and gives us full
 * type‑safety for the dozens of properties that HTML `onclick`/etc. handlers
 * rely on.
 *
 * Usage
 * -----
 *   import { setupWindowAPI, type WindowAPI } from './window-api';
 *   setupWindowAPI(window, {
 *     showNotification,
 *     switchTab,
 *     // … every other property listed below …
 *   });
 */

// ─── Global interface augmentation ─────────────────────────────────────────────
// Every property that may be accessed via `window.X` in HTML or in script.
// ─── Debug / INIT flags (DEV only) ──────────────────────────────────────────
// Typed bag for the ~22 startup-phase instrumentation flags set during the
// async IIFE in main.ts.  All properties are optional because they only exist
// when `import.meta.env.DEV` is true.
export interface DebugWindow {
  // ── Async IIFE startup phases ─────────────────────────────────────────
  INIT_ASYNC_IIFE_STARTED?:   boolean;
  INIT_IN_ASYNC_IIFE?:        boolean;
  INIT_PHYSICS_START?:        boolean;
  INIT_PHYSICS_OK?:           boolean;
  INIT_PHYSICS_WORKER_START?: boolean;
  INIT_PHYSICS_WORKER_OK?:    boolean;
  INIT_PHYSICS_ERROR?:        string;
  INIT_TABLE_LOAD_START?:     boolean;
  INIT_TABLE_LOAD_OK?:        boolean;
  INIT_BAM_ENGINE_START?:     boolean;
  INIT_BAM_ENGINE_OK?:        boolean;
  INIT_BAM_BRIDGE_START?:     boolean;
  INIT_BAM_BRIDGE_OK?:        boolean;
  INIT_ANIM_LOAD_START?:      boolean;
  INIT_ANIM_LOAD_OK?:         boolean;
  INIT_ANIM_BINDING_START?:   boolean;
  INIT_ANIM_BINDING_OK?:      boolean;
  INIT_ANIM_DEBUGGER_START?:  boolean;
  INIT_ANIM_DEBUGGER_OK?:     boolean;
  INIT_BEFORE_QUALITY_PRESET?: boolean;
  INIT_QUALITY_PRESET_OK?:    boolean;
  INIT_QUALITY_PRESET_ERROR?: string;
  INIT_BEFORE_ANIMATE_CALL?:  boolean;
  INIT_ANIMATE_CALLED?:       boolean;
  INIT_ANIMATE_ERROR?:        string;

  // ── Physics worker setup phases ───────────────────────────────────────
  SETUP_WORKER_START?:         number;
  SETUP_WORKER_INIT_START?:    number;
  SETUP_WORKER_INIT_OK?:       number;
  SETUP_WORKER_INIT_TIME?:     number;
  SETUP_WORKER_CONFIG_START?:  number;
  SETUP_WORKER_CONFIG_OK?:     number;
  SETUP_WORKER_CALLBACK_START?: number;
  SETUP_WORKER_CALLBACK_OK?:   number;
  SETUP_WORKER_COMPLETE?:      boolean;
  SETUP_WORKER_NO_PHYSICS?:    boolean;
  SETUP_WORKER_ERROR?:         string;
  SETUP_WORKER_END?:           number;

  // ── Table build / physics worker timing ───────────────────────────────
  BUILD_TABLE_START?:          number;
  BUILD_TABLE_OK?:             number;
  BUILD_TABLE_TIME_MS?:        number;
  PHYSICS_WORKER_START?:       number;
  PHYSICS_WORKER_OK?:          number;
  PHYSICS_WORKER_TIME_MS?:     number;
  PHYSICS_WORKER_ERROR?:       string;
  LOAD_TABLE_COMPLETE?:        boolean;
}

// ─── Electron preload API ──────────────────────────────────────────────────────
// Exposed by electron-preload.cjs via contextBridge.  All properties are
// optional because they only exist in the Electron renderer, not in the browser.
export interface ElectronAPI {
  getAllDisplays:       () => Promise<any>;
  openWindow:           (options: any) => Promise<any>;
  closeWindow:          (id: any) => Promise<void>;
  closeAllChildWindows: () => Promise<void>;
  broadcastState:       (data: any) => void;
  onStateBroadcast:     (callback: (data: any) => void) => () => void;
  scanFPTDirectory:     (dirPath: string) => Promise<any>;
  pickFPTDirectory:     () => Promise<any>;
  readFPTFile:          (filePath: string) => Promise<any>;
  openFile:             (options: any) => Promise<any>;
  saveFile:             (options: any) => Promise<any>;
  selectDirectory:      () => Promise<any>;
  getVersion:           () => Promise<any>;
  getPath:              (name: string) => Promise<any>;
  checkForUpdates:      () => Promise<any>;
  quitAndInstall:       () => Promise<void>;
  onUpdateAvailable:    (callback: (...args: any[]) => void) => void;
  onUpdateDownloaded:   (callback: (...args: any[]) => void) => void;
  onUpdateError:        (callback: (message: string) => void) => void;
  removeUpdateListeners: () => void;
}

declare global {
  interface Window {
    // ── Debug / INIT flags (DEV only) ────────────────────────────────────
    debugWindow?:           DebugWindow;
    electronAPI?:           ElectronAPI;

    // ── Startup flags ──────────────────────────────────────────────────────
    FPW_MODULE_LOADED:      boolean;
    FPW_ROLE:               string;
    FPW_SCREEN_INDEX:       string;
    FPW_DEVICE:             'mobile' | 'tablet' | 'desktop';
    _startupScreenConfig:   number | 'auto' | undefined;

    // ── View / Tab ─────────────────────────────────────────────────────────
    switchTab:              (tab: string) => void;
    toggleViewPanel:        () => void;
    applyViewSettings:      () => void;
    resetViewSettings:      () => void;

    // ── File browsing ──────────────────────────────────────────────────────
    browseTableDirectory:   () => Promise<void>;
    browseLibraryDirectory: () => Promise<void>;
    loadSelectedTable:      () => Promise<void>;
    loadDemoTable:          (key: string) => void;
    closeLoader:            () => void;

    // ── Notifications / Selectors ───────────────────────────────────────────
    showNotification:       (msg: string) => void;
    showLibrarySelector:    (lib: any) => void;

    // ── Multi‑screen ──────────────────────────────────────────────────────
    selectMsLayout:         (n: number) => void;
    openMultiscreenModal:   () => void;
    closeMultiscreenModal:  () => void;
    applyMsLayout:          () => Promise<void>;
    autoDetectScreens:      () => Promise<void>;
    applyStartupScreenConfig: () => Promise<void>;

    // ── Screen roles ──────────────────────────────────────────────────────
    resetScreenRoles:        (screenCount: number) => void;
    swapScreenRoles:         (screen1: number, screen2: number) => void;

    // ── Fullscreen / DMD ──────────────────────────────────────────────────
    toggleFullscreen:       () => void;
    toggleDMDMode:          () => void;
    toggleHideDMD:          () => void;

    // ── Cabinet / Rotation ────────────────────────────────────────────────
    changeCabinetProfile:           (profileId: string) => void;
    rotatePlayfield:                (degrees: 0 | 90 | 180 | 270, animated?: boolean) => Promise<void>;
    getCabinetProfiles:             () => { id: string; name: string; description: string; rotation: number }[];
    getCurrentCabinetProfile:       () => { id: string; name: string; rotation: number; screenRatio: 'vertical' | 'horizontal' | 'wide' };
    applyRotationProfile:           (profileId: string) => Promise<void>;
    rotatePlayfieldAnimated:        (degrees: 0 | 90 | 180 | 270) => Promise<void>;
    getCurrentPlayfieldRotation:    () => number;

    // ── Editor ────────────────────────────────────────────────────────────
    openIntegratedEditor:   () => void;
    getIntegratedEditor?:   () => any;

    // ── Audio (legacy APIs) ───────────────────────────────────────────────
    webkitAudioContext?:     typeof AudioContext;

    // ── Coin / DMD internal ───────────────────────────────────────────────
    playSound?:             (name: string) => any;
    __DMD_MODULE__?:        any;

    // ── PWA ────────────────────────────────────────────────────────────────
    installPWA:             () => void;

    // ── Quality / Performance ─────────────────────────────────────────────
    setQualityPreset:           (name: string) => void;
    getQualityPreset:           () => any;
    getAvailableQualityPresets: () => string[];
    toggleAutoQuality:          () => void;
    getPerformanceMetrics:      () => any;
    togglePerformanceMonitor:   () => void;

    // ── Graphics pipeline ──────────────────────────────────────────────────
    getGraphicsPipeline:    () => any;
    getGeometryPool:        () => any;
    getMaterialFactory:     () => any;
    getLightManager:        () => any;

    // ── Resource manager ───────────────────────────────────────────────────
    getResourceManager:     () => any;
    getResourceStats:       () => any;
    logResourceStats:       () => void;
    resetResourceManager:   () => void;

    // ── Library cache ──────────────────────────────────────────────────────
    getLibraryCache:        () => any;
    getLibraryCacheStats:   () => any;
    logLibraryCacheStats:   () => void;
    cleanupLibraryCache:    () => void;
    resetLibraryCache:      () => void;

    // ── Audio source pool ──────────────────────────────────────────────────
    getAudioSourcePool:         () => any;
    getAudioSourcePoolStats:    () => any;
    logAudioSourcePoolStats:    () => void;

    // ── Integration testing ────────────────────────────────────────────────
    runIntegrationTests:    () => Promise<any>;
    benchmark:              any;
    memoryProfiler:         any;

    // ── Performance reports ────────────────────────────────────────────────
    generatePerformanceReport:      () => Promise<any>;
    getPerformanceReportGenerator:  () => any;
    comparePerformanceReports:      (report1: any, report2: any) => any;

    // ── Favourites / Batch ──────────────────────────────────────────────────
    addToFavorites:             (filename: string, type: 'table' | 'library') => void;
    getAdvancedFavoritesCount:  () => number;
    getRecentTables:            () => any[];
    createBatchLoadJob:         (tableNames: string[]) => string;
    getBatchJobStatus:          (jobId: string) => any;
    setupTableDragDrop:         () => void;
    sortTableFiles:             (field: string, files?: any[]) => any[];
    runFullTestSuite:           () => Promise<any>;

    // ── Browser APIs (non-standard / experimental) ─────────────────────────
    showDirectoryPicker?:       () => Promise<any>;
    getScreenDetails?:          () => Promise<any>;
    screens?:                   any[];

    // ── Optional global helpers (assigned by cross-window code) ─────────────
    setDMDResolutionOption?:    (res: string) => void;
    setDMDGlow?:                (enabled: boolean, intensity?: number) => void;
    updateResponsiveDMDScale?:  () => void;
    getCurrentRotation?:        () => number;

    // ── Classic Editor ───────────────────────────────────────────────────
    exportJSON?:            () => void;
    openInGame?:            () => void;
    importJSON?:            () => void;
    loadDemo?:              (key: string) => void;
    setTool?:               (tool: 'select' | 'bumper' | 'target' | 'ramp') => void;
    deleteSelected?:        () => void;
    clearAll?:              () => void;
    toggleSnap?:            () => void;
    cycleColor?:            () => void;
    setProp?:               (key: string, val: string) => void;
    setElemColor?:          (color: number) => void;

    // ── Key Bindings ──────────────────────────────────────────────────
    getKeyBindings?:     () => any;
    setKeyBinding?:      (action: string, key: string) => void;
    resetKeyBindings?:   () => void;
    showKeyBindings?:    () => void;

    // ── Resize timers ─────────────────────────────────────────────────
    resizeTimer?:       ReturnType<typeof setTimeout>;
    dmdResizeTimer?:    ReturnType<typeof setTimeout>;

    // ── DEV-only debug helpers ────────────────────────────────────────
    testGravity?:       (x: number, y: number) => void;
    forceScore?:        (n: number) => void;
    dumpState?:         () => void;

    // ── Diagnostics bags ──────────────────────────────────────────────
    _msDiag?:           Record<string, any>;
    _msStateMessages?:  Record<string, any>;
  }
}

// ─── DEV-only flag helper ──────────────────────────────────────────────────────
// Sets a debug flag on `window.debugWindow`, but only when `import.meta.env.DEV`
// is true, so production builds eliminate both the branch and the assignment.
export function setDevFlag<K extends keyof DebugWindow>(
  flag: K,
  value: NonNullable<DebugWindow[K]>,
): void {
  if (import.meta.env.DEV) {
    const dw = window.debugWindow ??= {} as DebugWindow;
    dw[flag] = value as any;
  }
}

// ─── Typed bag of implementations ──────────────────────────────────────────────
// This lets `main.ts` construct closures (which capture local state like
// `scene`, `profiler`, `camera`, …) and pass them in while retaining full
// type‑safety.
export interface WindowAPI {
  showNotification:               Window['showNotification'];
  showLibrarySelector:            Window['showLibrarySelector'];
  switchTab:                      Window['switchTab'];
  loadDemoTable:                  Window['loadDemoTable'];
  closeLoader:                    Window['closeLoader'];
  toggleViewPanel:                Window['toggleViewPanel'];
  applyViewSettings:              Window['applyViewSettings'];
  resetViewSettings:              Window['resetViewSettings'];
  toggleFullscreen:               Window['toggleFullscreen'];
  toggleDMDMode:                  Window['toggleDMDMode'];
  toggleHideDMD:                  Window['toggleHideDMD'];
  browseTableDirectory:           Window['browseTableDirectory'];
  browseLibraryDirectory:         Window['browseLibraryDirectory'];
  loadSelectedTable:              Window['loadSelectedTable'];
  selectMsLayout:                 Window['selectMsLayout'];
  openMultiscreenModal:           Window['openMultiscreenModal'];
  closeMultiscreenModal:          Window['closeMultiscreenModal'];
  applyMsLayout:                  Window['applyMsLayout'];
  resetScreenRoles:               Window['resetScreenRoles'];
  swapScreenRoles:                Window['swapScreenRoles'];
  autoDetectScreens:              Window['autoDetectScreens'];
  applyStartupScreenConfig:       Window['applyStartupScreenConfig'];
  changeCabinetProfile:           Window['changeCabinetProfile'];
  rotatePlayfield:                Window['rotatePlayfield'];
  getCabinetProfiles:             Window['getCabinetProfiles'];
  getCurrentCabinetProfile:       Window['getCurrentCabinetProfile'];
  applyRotationProfile:           Window['applyRotationProfile'];
  rotatePlayfieldAnimated:        Window['rotatePlayfieldAnimated'];
  getCurrentPlayfieldRotation:    Window['getCurrentPlayfieldRotation'];
  openIntegratedEditor:           Window['openIntegratedEditor'];
  installPWA:                     Window['installPWA'];
  setQualityPreset:               Window['setQualityPreset'];
  getQualityPreset:               Window['getQualityPreset'];
  getAvailableQualityPresets:     Window['getAvailableQualityPresets'];
  toggleAutoQuality:              Window['toggleAutoQuality'];
  getPerformanceMetrics:          Window['getPerformanceMetrics'];
  togglePerformanceMonitor:       Window['togglePerformanceMonitor'];
  getGraphicsPipeline:            Window['getGraphicsPipeline'];
  getGeometryPool:                Window['getGeometryPool'];
  getMaterialFactory:             Window['getMaterialFactory'];
  getLightManager:                Window['getLightManager'];
  getResourceManager:             Window['getResourceManager'];
  getResourceStats:               Window['getResourceStats'];
  logResourceStats:               Window['logResourceStats'];
  resetResourceManager:           Window['resetResourceManager'];
  getLibraryCache:                Window['getLibraryCache'];
  getLibraryCacheStats:           Window['getLibraryCacheStats'];
  logLibraryCacheStats:           Window['logLibraryCacheStats'];
  cleanupLibraryCache:            Window['cleanupLibraryCache'];
  resetLibraryCache:              Window['resetLibraryCache'];
  getAudioSourcePool:             Window['getAudioSourcePool'];
  getAudioSourcePoolStats:        Window['getAudioSourcePoolStats'];
  logAudioSourcePoolStats:        Window['logAudioSourcePoolStats'];
  runIntegrationTests:            Window['runIntegrationTests'];
  benchmark:                      Window['benchmark'];
  memoryProfiler:                 Window['memoryProfiler'];
  generatePerformanceReport:      Window['generatePerformanceReport'];
  getPerformanceReportGenerator:  Window['getPerformanceReportGenerator'];
  comparePerformanceReports:      Window['comparePerformanceReports'];
  addToFavorites:                 Window['addToFavorites'];
  getAdvancedFavoritesCount:      Window['getAdvancedFavoritesCount'];
  getRecentTables:                Window['getRecentTables'];
  createBatchLoadJob:             Window['createBatchLoadJob'];
  getBatchJobStatus:              Window['getBatchJobStatus'];
  setupTableDragDrop:             Window['setupTableDragDrop'];
  sortTableFiles:                 Window['sortTableFiles'];
  runFullTestSuite:               Window['runFullTestSuite'];
}

// ─── Registration helper ───────────────────────────────────────────────────────
// Call once after all implementations are ready, typically at the end of the
// async IIFE in main.ts.
export function setupWindowAPI(win: Window, api: WindowAPI): void {
  win.showNotification          = api.showNotification;
  win.showLibrarySelector       = api.showLibrarySelector;
  win.switchTab                 = api.switchTab;
  win.loadDemoTable             = api.loadDemoTable;
  win.closeLoader               = api.closeLoader;
  win.toggleViewPanel           = api.toggleViewPanel;
  win.applyViewSettings         = api.applyViewSettings;
  win.resetViewSettings         = api.resetViewSettings;
  win.toggleFullscreen          = api.toggleFullscreen;
  win.toggleDMDMode             = api.toggleDMDMode;
  win.toggleHideDMD             = api.toggleHideDMD;
  win.browseTableDirectory      = api.browseTableDirectory;
  win.browseLibraryDirectory    = api.browseLibraryDirectory;
  win.loadSelectedTable         = api.loadSelectedTable;
  win.selectMsLayout            = api.selectMsLayout;
  win.openMultiscreenModal      = api.openMultiscreenModal;
  win.closeMultiscreenModal     = api.closeMultiscreenModal;
  win.applyMsLayout             = api.applyMsLayout;
  win.resetScreenRoles          = api.resetScreenRoles;
  win.swapScreenRoles           = api.swapScreenRoles;
  win.autoDetectScreens         = api.autoDetectScreens;
  win.applyStartupScreenConfig  = api.applyStartupScreenConfig;
  win.changeCabinetProfile      = api.changeCabinetProfile;
  win.rotatePlayfield           = api.rotatePlayfield;
  win.getCabinetProfiles        = api.getCabinetProfiles;
  win.getCurrentCabinetProfile  = api.getCurrentCabinetProfile;
  win.applyRotationProfile      = api.applyRotationProfile;
  win.rotatePlayfieldAnimated   = api.rotatePlayfieldAnimated;
  win.getCurrentPlayfieldRotation = api.getCurrentPlayfieldRotation;
  win.openIntegratedEditor      = api.openIntegratedEditor;
  win.installPWA                = api.installPWA;
  win.setQualityPreset          = api.setQualityPreset;
  win.getQualityPreset          = api.getQualityPreset;
  win.getAvailableQualityPresets = api.getAvailableQualityPresets;
  win.toggleAutoQuality         = api.toggleAutoQuality;
  win.getPerformanceMetrics     = api.getPerformanceMetrics;
  win.togglePerformanceMonitor  = api.togglePerformanceMonitor;
  win.getGraphicsPipeline       = api.getGraphicsPipeline;
  win.getGeometryPool           = api.getGeometryPool;
  win.getMaterialFactory        = api.getMaterialFactory;
  win.getLightManager           = api.getLightManager;
  win.getResourceManager        = api.getResourceManager;
  win.getResourceStats          = api.getResourceStats;
  win.logResourceStats          = api.logResourceStats;
  win.resetResourceManager      = api.resetResourceManager;
  win.getLibraryCache           = api.getLibraryCache;
  win.getLibraryCacheStats      = api.getLibraryCacheStats;
  win.logLibraryCacheStats      = api.logLibraryCacheStats;
  win.cleanupLibraryCache       = api.cleanupLibraryCache;
  win.resetLibraryCache         = api.resetLibraryCache;
  win.getAudioSourcePool        = api.getAudioSourcePool;
  win.getAudioSourcePoolStats   = api.getAudioSourcePoolStats;
  win.logAudioSourcePoolStats   = api.logAudioSourcePoolStats;
  win.runIntegrationTests       = api.runIntegrationTests;
  win.benchmark                 = api.benchmark;
  win.memoryProfiler            = api.memoryProfiler;
  win.generatePerformanceReport = api.generatePerformanceReport;
  win.getPerformanceReportGenerator = api.getPerformanceReportGenerator;
  win.comparePerformanceReports = api.comparePerformanceReports;
  win.addToFavorites            = api.addToFavorites;
  win.getAdvancedFavoritesCount = api.getAdvancedFavoritesCount;
  win.getRecentTables           = api.getRecentTables;
  win.createBatchLoadJob        = api.createBatchLoadJob;
  win.getBatchJobStatus         = api.getBatchJobStatus;
  win.setupTableDragDrop        = api.setupTableDragDrop;
  win.sortTableFiles            = api.sortTableFiles;
  win.runFullTestSuite          = api.runFullTestSuite;
}
