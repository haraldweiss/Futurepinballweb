// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { getAudioCtx } from '../audio-system';

export enum AudioCategory {
  SFX = 'sfx',
  MUSIC = 'music',
  AMBIENCE = 'ambience',
  UI = 'ui',
}

export class AudioMixer {
  private masterVolume = 1.0;
  private categoryVolumes = {
    [AudioCategory.SFX]: 0.8,
    [AudioCategory.MUSIC]: 0.6,
    [AudioCategory.AMBIENCE]: 0.3,
    [AudioCategory.UI]: 0.5,
  };

  private activeGainNodes: Array<{
    gainNode: GainNode;
    category: AudioCategory;
  }> = [];

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  setCategoryVolume(category: AudioCategory, volume: number): void {
    this.categoryVolumes[category] = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  calculateVolume(baseVolume: number, category: AudioCategory): number {
    const categoryVol = this.categoryVolumes[category] || 1.0;
    return baseVolume * categoryVol * this.masterVolume;
  }

  createGainNode(category: AudioCategory): GainNode {
    const ctx = getAudioCtx();
    const gainNode = ctx.createGain();
    gainNode.gain.value = this.calculateVolume(1.0, category);
    this.activeGainNodes.push({ gainNode, category });
    return gainNode;
  }

  private updateAllVolumes(): void {
    this.activeGainNodes = this.activeGainNodes.filter(item => {
      try {
        item.gainNode.gain.value = this.calculateVolume(
          item.gainNode.gain.value / (this.categoryVolumes[item.category] * this.masterVolume),
          item.category
        );
        return true;
      } catch (e) {
        console.debug('[audio-enhanced] Node may have been removed:', (e || 'unknown'));
        return false;
      }
    });
  }

  getVolumes(): { master: number; categories: Record<AudioCategory, number> } {
    return {
      master: this.masterVolume,
      categories: { ...this.categoryVolumes },
    };
  }
}
