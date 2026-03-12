/**
 * video-manager.ts — Event-Driven Video Playback System for Backglass & DMD
 *
 * Provides centralized video management with support for:
 * - Backglass video overlay (HTML5 video element)
 * - DMD video mode (full screen LED replacement)
 * - Event-driven playback (bumper hit, ramp complete, multiball, etc.)
 * - Quality scaling based on device performance
 * - Seamless fallback to LED/standard display when no video
 */

export interface VideoConfig {
  id: string;
  name: string;
  url: string;           // Video file URL or data URI
  type: 'backglass' | 'dmd';
  duration: number;       // Seconds
  autoPlay?: boolean;
  loop?: boolean;
  volume?: number;        // 0-1
  muted?: boolean;
  playbackRate?: number;  // 0.5-2.0
  quality?: 'low' | 'medium' | 'high' | 'ultra';
}

export interface VideoEvent {
  trigger: 'bumper_hit' | 'target_hit' | 'ramp_complete' | 'multiball_start' |
           'ball_drain' | 'flipper_hit' | 'slingshot' | 'spinner' | 'combo' |
           'level_complete' | 'tilt' | 'game_over' | 'custom';
  videoId: string;
  delay?: number;         // Delay before playing (ms)
  allowInterrupt?: boolean; // Can be interrupted by another event
}

export interface VideoPlaybackState {
  currentVideoId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
}

/**
 * VideoManager — Manages all video playback for backglass and DMD
 */
export class VideoManager {
  private backglassVideo: HTMLVideoElement | null = null;
  private dmdVideo: HTMLVideoElement | null = null;
  private backglassContainer: HTMLElement | null = null;
  private dmdContainer: HTMLElement | null = null;

  private videoLibrary: Map<string, VideoConfig> = new Map();
  private eventBindings: Map<string, VideoEvent[]> = new Map();
  private playbackState: VideoPlaybackState = {
    currentVideoId: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
    muted: false,
  };

  private qualityPreset: 'low' | 'medium' | 'high' | 'ultra' = 'high';
  private isBackglassVideoMode: boolean = false;
  private isDmdVideoMode: boolean = false;
  private pendingPlayback: { videoId: string; delay: number } | null = null;
  private pendingTimer: number | null = null;

  constructor() {
    this.initializeVideoElements();
    console.log('✓ VideoManager initialized');
  }

  /**
   * Initialize video elements and containers
   */
  private initializeVideoElements(): void {
    // Create backglass video element
    this.backglassContainer = document.getElementById('backglass-video-container');
    if (!this.backglassContainer) {
      this.backglassContainer = document.createElement('div');
      this.backglassContainer.id = 'backglass-video-container';
      this.backglassContainer.style.cssText = `
        position: absolute;
        top: 0;
        right: 0;
        width: 30vw;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        z-index: 5;
        overflow: hidden;
      `;
      document.body.appendChild(this.backglassContainer);
    }

    this.backglassVideo = document.createElement('video');
    this.backglassVideo.id = 'backglass-video';
    this.backglassVideo.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;
    this.backglassVideo.controls = false;
    this.backglassContainer.appendChild(this.backglassVideo);

    // Create DMD video element
    this.dmdContainer = document.getElementById('dmd-video-container');
    if (!this.dmdContainer) {
      this.dmdContainer = document.createElement('div');
      this.dmdContainer.id = 'dmd-video-container';
      this.dmdContainer.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        width: 640px;
        height: 160px;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        z-index: 10;
        border: 2px solid #00ff88;
        border-radius: 4px;
        overflow: hidden;
      `;
      document.body.appendChild(this.dmdContainer);
    }

    this.dmdVideo = document.createElement('video');
    this.dmdVideo.id = 'dmd-video';
    this.dmdVideo.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;
    this.dmdVideo.controls = false;
    this.dmdContainer.appendChild(this.dmdVideo);

    // Setup event listeners
    this.setupVideoEventListeners();
  }

  /**
   * Setup video event listeners
   */
  private setupVideoEventListeners(): void {
    if (this.backglassVideo) {
      this.backglassVideo.addEventListener('ended', () => this.onVideoEnded('backglass'));
      this.backglassVideo.addEventListener('play', () => {
        this.playbackState.isPlaying = true;
      });
      this.backglassVideo.addEventListener('pause', () => {
        this.playbackState.isPlaying = false;
      });
      this.backglassVideo.addEventListener('timeupdate', () => {
        this.playbackState.currentTime = this.backglassVideo?.currentTime || 0;
      });
    }

    if (this.dmdVideo) {
      this.dmdVideo.addEventListener('ended', () => this.onVideoEnded('dmd'));
      this.dmdVideo.addEventListener('play', () => {
        this.playbackState.isPlaying = true;
      });
      this.dmdVideo.addEventListener('pause', () => {
        this.playbackState.isPlaying = false;
      });
      this.dmdVideo.addEventListener('timeupdate', () => {
        this.playbackState.currentTime = this.dmdVideo?.currentTime || 0;
      });
    }
  }

  /**
   * Register a video in the library
   */
  registerVideo(config: VideoConfig): void {
    this.videoLibrary.set(config.id, config);
    console.log(`✓ Registered video: ${config.id} (${config.type})`);
  }

  /**
   * Register multiple videos
   */
  registerVideos(videos: VideoConfig[]): void {
    for (const video of videos) {
      this.registerVideo(video);
    }
  }

  /**
   * Bind a video to a game event
   */
  bindVideoToEvent(eventBinding: VideoEvent): void {
    if (!this.eventBindings.has(eventBinding.trigger)) {
      this.eventBindings.set(eventBinding.trigger, []);
    }
    this.eventBindings.get(eventBinding.trigger)!.push(eventBinding);
    console.log(`✓ Bound video ${eventBinding.videoId} to event ${eventBinding.trigger}`);
  }

  /**
   * Trigger a video playback based on game event
   */
  triggerVideoForEvent(trigger: string): void {
    const bindings = this.eventBindings.get(trigger);
    if (!bindings || bindings.length === 0) return;

    // Pick first compatible binding (could implement priority system later)
    const binding = bindings[0];
    const video = this.videoLibrary.get(binding.videoId);

    if (!video) {
      console.warn(`Video not found: ${binding.videoId}`);
      return;
    }

    // If delay specified, queue playback
    if (binding.delay && binding.delay > 0) {
      this.queueVideoPlayback(binding.videoId, binding.delay);
    } else {
      this.playVideo(binding.videoId);
    }
  }

  /**
   * Queue video for delayed playback
   */
  private queueVideoPlayback(videoId: string, delay: number): void {
    // Cancel previous pending playback if not interruptible
    if (this.pendingTimer !== null) {
      clearTimeout(this.pendingTimer);
    }

    this.pendingPlayback = { videoId, delay };
    this.pendingTimer = window.setTimeout(() => {
      if (this.pendingPlayback && this.pendingPlayback.videoId === videoId) {
        this.playVideo(videoId);
        this.pendingPlayback = null;
        this.pendingTimer = null;
      }
    }, delay);
  }

  /**
   * Play a video by ID
   */
  playVideo(videoId: string): void {
    const video = this.videoLibrary.get(videoId);
    if (!video) {
      console.warn(`Video not found: ${videoId}`);
      return;
    }

    this.playbackState.currentVideoId = videoId;
    this.playbackState.duration = video.duration;

    const videoElement = video.type === 'backglass' ? this.backglassVideo : this.dmdVideo;
    const container = video.type === 'backglass' ? this.backglassContainer : this.dmdContainer;

    if (!videoElement || !container) return;

    // Set video properties
    videoElement.src = video.url;
    videoElement.loop = video.loop ?? false;
    videoElement.muted = video.muted ?? false;
    videoElement.volume = video.volume ?? 1.0;
    videoElement.playbackRate = video.playbackRate ?? 1.0;
    videoElement.currentTime = 0;

    // Show container
    container.style.display = 'block';

    // Update mode flags
    if (video.type === 'backglass') {
      this.isBackglassVideoMode = true;
    } else {
      this.isDmdVideoMode = true;
    }

    // Auto-play if configured
    if (video.autoPlay !== false) {
      videoElement.play().catch(err => {
        console.warn(`Failed to autoplay video ${videoId}:`, err);
      });
    }

    console.log(`▶ Playing video: ${videoId} (${video.type})`);
  }

  /**
   * Stop video playback
   */
  stopVideo(type: 'backglass' | 'dmd'): void {
    const videoElement = type === 'backglass' ? this.backglassVideo : this.dmdVideo;
    const container = type === 'backglass' ? this.backglassContainer : this.dmdContainer;

    if (!videoElement || !container) return;

    videoElement.pause();
    videoElement.currentTime = 0;
    container.style.display = 'none';

    if (type === 'backglass') {
      this.isBackglassVideoMode = false;
    } else {
      this.isDmdVideoMode = false;
    }

    console.log(`⏹ Stopped video: ${type}`);
  }

  /**
   * Pause current video
   */
  pauseVideo(type: 'backglass' | 'dmd'): void {
    const videoElement = type === 'backglass' ? this.backglassVideo : this.dmdVideo;
    if (videoElement) {
      videoElement.pause();
    }
  }

  /**
   * Resume current video
   */
  resumeVideo(type: 'backglass' | 'dmd'): void {
    const videoElement = type === 'backglass' ? this.backglassVideo : this.dmdVideo;
    if (videoElement) {
      videoElement.play();
    }
  }

  /**
   * Callback when video finishes playing
   */
  private onVideoEnded(type: 'backglass' | 'dmd'): void {
    console.log(`✓ Video finished: ${type}`);
    this.stopVideo(type);
    this.playbackState.currentVideoId = null;
    this.playbackState.isPlaying = false;
  }

  /**
   * Set video volume
   */
  setVolume(volume: number): void {
    const vol = Math.max(0, Math.min(1, volume));
    this.playbackState.volume = vol;

    if (this.backglassVideo) this.backglassVideo.volume = vol;
    if (this.dmdVideo) this.dmdVideo.volume = vol;
  }

  /**
   * Set muted state
   */
  setMuted(muted: boolean): void {
    this.playbackState.muted = muted;

    if (this.backglassVideo) this.backglassVideo.muted = muted;
    if (this.dmdVideo) this.dmdVideo.muted = muted;
  }

  /**
   * Set quality preset (affects video resolution selection)
   */
  setQualityPreset(preset: 'low' | 'medium' | 'high' | 'ultra'): void {
    this.qualityPreset = preset;

    // Could implement dynamic video quality switching here
    // For now, just log the change
    console.log(`✓ Video quality preset: ${preset}`);
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): VideoPlaybackState {
    return { ...this.playbackState };
  }

  /**
   * Get all registered videos
   */
  getVideos(): VideoConfig[] {
    return Array.from(this.videoLibrary.values());
  }

  /**
   * Get all event bindings
   */
  getEventBindings(): Map<string, VideoEvent[]> {
    return new Map(this.eventBindings);
  }

  /**
   * Check if backglass is in video mode
   */
  isBackglassVideoModeActive(): boolean {
    return this.isBackglassVideoMode;
  }

  /**
   * Check if DMD is in video mode
   */
  isDmdVideoModeActive(): boolean {
    return this.isDmdVideoMode;
  }

  /**
   * Clear all videos and bindings
   */
  clear(): void {
    this.stopVideo('backglass');
    this.stopVideo('dmd');
    this.videoLibrary.clear();
    this.eventBindings.clear();
    this.playbackState.currentVideoId = null;
    console.log('✓ VideoManager cleared');
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.clear();

    if (this.pendingTimer !== null) {
      clearTimeout(this.pendingTimer);
    }

    if (this.backglassVideo) {
      this.backglassVideo.pause();
      this.backglassVideo.src = '';
    }

    if (this.dmdVideo) {
      this.dmdVideo.pause();
      this.dmdVideo.src = '';
    }

    this.backglassContainer?.remove();
    this.dmdContainer?.remove();

    console.log('✓ VideoManager disposed');
  }
}

// Global instance
let videoManager: VideoManager | null = null;

export function initializeVideoManager(): VideoManager {
  if (!videoManager) {
    videoManager = new VideoManager();
  }
  return videoManager;
}

export function getVideoManager(): VideoManager | null {
  return videoManager;
}

export function disposeVideoManager(): void {
  if (videoManager) {
    videoManager.dispose();
    videoManager = null;
  }
}
