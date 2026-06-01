// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import type { VideoConfig, VideoEvent, VideoPlaybackState } from './types';
import { devLog } from '../utils/dev-log';

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
    devLog('✓ VideoManager initialized');
  }

  private initializeVideoElements(): void {
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

    this.setupVideoEventListeners();
  }

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

  registerVideo(config: VideoConfig): void {
    this.videoLibrary.set(config.id, config);
    devLog(`✓ Registered video: ${config.id} (${config.type})`);
  }

  registerVideos(videos: VideoConfig[]): void {
    for (const video of videos) {
      this.registerVideo(video);
    }
  }

  bindVideoToEvent(eventBinding: VideoEvent): void {
    if (!this.eventBindings.has(eventBinding.trigger)) {
      this.eventBindings.set(eventBinding.trigger, []);
    }
    this.eventBindings.get(eventBinding.trigger)!.push(eventBinding);
    devLog(`✓ Bound video ${eventBinding.videoId} to event ${eventBinding.trigger}`);
  }

  triggerVideoForEvent(trigger: string): void {
    const bindings = this.eventBindings.get(trigger);
    if (!bindings || bindings.length === 0) return;

    const binding = bindings[0];
    const video = this.videoLibrary.get(binding.videoId);

    if (!video) {
      console.warn(`Video not found: ${binding.videoId}`);
      return;
    }

    if (binding.delay && binding.delay > 0) {
      this.queueVideoPlayback(binding.videoId, binding.delay);
    } else {
      this.playVideo(binding.videoId);
    }
  }

  private queueVideoPlayback(videoId: string, delay: number): void {
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

    videoElement.src = video.url;
    videoElement.loop = video.loop ?? false;
    videoElement.muted = video.muted ?? false;
    videoElement.volume = video.volume ?? 1.0;
    videoElement.playbackRate = video.playbackRate ?? 1.0;
    videoElement.currentTime = 0;

    container.style.display = 'block';

    if (video.type === 'backglass') {
      this.isBackglassVideoMode = true;
    } else {
      this.isDmdVideoMode = true;
    }

    if (video.autoPlay !== false) {
      videoElement.play().catch(err => {
        console.warn(`Failed to autoplay video ${videoId}:`, err);
      });
    }

    devLog(`▶ Playing video: ${videoId} (${video.type})`);
  }

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

    devLog(`⏹ Stopped video: ${type}`);
  }

  pauseVideo(type: 'backglass' | 'dmd'): void {
    const videoElement = type === 'backglass' ? this.backglassVideo : this.dmdVideo;
    if (videoElement) {
      videoElement.pause();
    }
  }

  resumeVideo(type: 'backglass' | 'dmd'): void {
    const videoElement = type === 'backglass' ? this.backglassVideo : this.dmdVideo;
    if (videoElement) {
      videoElement.play();
    }
  }

  private onVideoEnded(type: 'backglass' | 'dmd'): void {
    devLog(`✓ Video finished: ${type}`);
    this.stopVideo(type);
    this.playbackState.currentVideoId = null;
    this.playbackState.isPlaying = false;
  }

  setVolume(volume: number): void {
    const vol = Math.max(0, Math.min(1, volume));
    this.playbackState.volume = vol;

    if (this.backglassVideo) this.backglassVideo.volume = vol;
    if (this.dmdVideo) this.dmdVideo.volume = vol;
  }

  setMuted(muted: boolean): void {
    this.playbackState.muted = muted;

    if (this.backglassVideo) this.backglassVideo.muted = muted;
    if (this.dmdVideo) this.dmdVideo.muted = muted;
  }

  setQualityPreset(preset: 'low' | 'medium' | 'high' | 'ultra'): void {
    this.qualityPreset = preset;
    devLog(`✓ Video quality preset: ${preset}`);
  }

  getPlaybackState(): VideoPlaybackState {
    return { ...this.playbackState };
  }

  getVideos(): VideoConfig[] {
    return Array.from(this.videoLibrary.values());
  }

  getEventBindings(): Map<string, VideoEvent[]> {
    return new Map(this.eventBindings);
  }

  isBackglassVideoModeActive(): boolean {
    return this.isBackglassVideoMode;
  }

  isDmdVideoModeActive(): boolean {
    return this.isDmdVideoMode;
  }

  clear(): void {
    this.stopVideo('backglass');
    this.stopVideo('dmd');
    this.videoLibrary.clear();
    this.eventBindings.clear();
    this.playbackState.currentVideoId = null;
    devLog('✓ VideoManager cleared');
  }

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

    devLog('✓ VideoManager disposed');
  }
}
