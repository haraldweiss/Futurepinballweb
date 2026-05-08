// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { globalAssetCatalog } from '../game';
import { textureToDataURL, formatDuration } from './asset-thumbnail';

/**
 * AssetBrowser renders three sections (textures, models, sounds) listing the
 * contents of the global AssetCatalog. Used as a tab in the integrated editor.
 *
 * Safety: All DOM construction uses createElement + textContent. No innerHTML.
 * Asset names from FPT files are treated as untrusted user content.
 */
export class AssetBrowser {
  private container: HTMLElement | null = null;

  attachTo(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.className = 'asset-browser';
    parent.appendChild(this.container);
  }

  refresh(): void {
    if (!this.container) return;
    // Clear safely
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    const cat = globalAssetCatalog();
    if (!cat) {
      this.container.appendChild(this.makeEmptyState('No catalog loaded.'));
      return;
    }

    const textureNames = cat.registeredTextureNames();
    const modelNames   = cat.registeredModelNames();
    const soundNames   = cat.registeredSoundNames();

    if (textureNames.length === 0 && modelNames.length === 0 && soundNames.length === 0) {
      this.container.appendChild(
        this.makeEmptyState('No assets extracted yet. Load a table to see assets here.')
      );
      return;
    }

    this.container.appendChild(this.makeTextureSection(cat, textureNames));
    this.container.appendChild(this.makeModelSection(modelNames));
    this.container.appendChild(this.makeSoundSection(cat, soundNames));
  }

  private makeEmptyState(message: string): HTMLElement {
    const div = document.createElement('div');
    div.className = 'asset-browser-empty';
    div.textContent = message;
    return div;
  }

  private makeSectionHeader(title: string, count: number): HTMLElement {
    const header = document.createElement('header');
    header.className = 'asset-section-header';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    const span = document.createElement('span');
    span.className = 'asset-section-count';
    span.textContent = String(count);
    header.appendChild(h3);
    header.appendChild(span);
    return header;
  }

  private makeTextureSection(cat: NonNullable<ReturnType<typeof globalAssetCatalog>>, names: string[]): HTMLElement {
    const section = document.createElement('section');
    section.className = 'asset-section asset-section-textures';
    section.appendChild(this.makeSectionHeader('Textures', names.length));

    const grid = document.createElement('div');
    grid.className = 'asset-grid';
    for (const name of names) {
      const item = document.createElement('div');
      item.className = 'asset-item asset-item-texture';
      item.dataset.name = name;

      const img = document.createElement('img');
      img.className = 'asset-thumbnail';
      img.src = textureToDataURL(cat.getTexture(name));
      img.alt = name;

      const nameEl = document.createElement('div');
      nameEl.className = 'asset-name';
      nameEl.textContent = name;

      item.appendChild(img);
      item.appendChild(nameEl);
      grid.appendChild(item);
    }
    section.appendChild(grid);
    return section;
  }

  private makeModelSection(names: string[]): HTMLElement {
    const section = document.createElement('section');
    section.className = 'asset-section asset-section-models';
    section.appendChild(this.makeSectionHeader('Models', names.length));

    const list = document.createElement('div');
    list.className = 'asset-list';
    for (const name of names) {
      const item = document.createElement('div');
      item.className = 'asset-item asset-item-model';
      item.dataset.name = name;

      const icon = document.createElement('div');
      icon.className = 'asset-icon';
      icon.textContent = '\u{1F537}';

      const nameEl = document.createElement('div');
      nameEl.className = 'asset-name';
      nameEl.textContent = name;

      item.appendChild(icon);
      item.appendChild(nameEl);
      list.appendChild(item);
    }
    section.appendChild(list);
    return section;
  }

  private makeSoundSection(cat: NonNullable<ReturnType<typeof globalAssetCatalog>>, names: string[]): HTMLElement {
    const section = document.createElement('section');
    section.className = 'asset-section asset-section-sounds';
    section.appendChild(this.makeSectionHeader('Sounds', names.length));

    const list = document.createElement('div');
    list.className = 'asset-list';
    for (const name of names) {
      const item = document.createElement('div');
      item.className = 'asset-item asset-item-sound';
      item.dataset.name = name;

      const icon = document.createElement('div');
      icon.className = 'asset-icon';
      icon.textContent = '\u{1F50A}';

      const nameEl = document.createElement('div');
      nameEl.className = 'asset-name';
      nameEl.textContent = name;

      const buf = cat.getSound(name) as { duration?: number };
      const durEl = document.createElement('div');
      durEl.className = 'asset-duration';
      durEl.textContent = (buf && typeof buf.duration === 'number') ? formatDuration(buf.duration) : '—';

      item.appendChild(icon);
      item.appendChild(nameEl);
      item.appendChild(durEl);
      list.appendChild(item);
    }
    section.appendChild(list);
    return section;
  }

  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
