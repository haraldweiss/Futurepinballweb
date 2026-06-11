// SPDX-License-Identifier: AGPL-3.0-or-later
import { fptResources, globalAssetCatalog, setGlobalAssetCatalog } from '../game';
import { AssetCatalog } from '../assets/asset-catalog';
import { logMsg } from './log';

export function mapFPTSounds(sounds: Record<string, AudioBuffer>): void {
  const names = Object.keys(sounds);
  const find  = (p: RegExp) => names.find(n => p.test(n));
  const bk = find(/bump|pop|kick|hit|knock/i);
  const fk = find(/flip|solenoid|arm|coil/i);
  const dk = find(/drain|ball.?lost|out|gutter/i);
  if (bk) { fptResources.mapped.bumper  = sounds[bk]; logMsg(`  Bumper-Sound: "${bk}"`, 'ok'); }
  if (fk) { fptResources.mapped.flipper = sounds[fk]; logMsg(`  Flipper-Sound: "${fk}"`, 'ok'); }
  if (dk) { fptResources.mapped.drain   = sounds[dk]; logMsg(`  Drain-Sound: "${dk}"`, 'ok'); }
  if (!fptResources.mapped.bumper  && names[0]) fptResources.mapped.bumper  = sounds[names[0]];
  if (!fptResources.mapped.flipper && names[1]) fptResources.mapped.flipper = sounds[names[1]];

  if (!fptResources.musicTrack) {
    for (const [, buf] of Object.entries(sounds)) {
      if (typeof buf === 'string') continue;
      const duration = (buf as AudioBuffer).duration;
      if (typeof duration === 'number' && duration > 8) {
        fptResources.musicTrack = buf;
        break;
      }
    }
  }
}

export function populateCatalogFromFPTResources(): void {
  let cat = globalAssetCatalog();
  if (!cat) {
    cat = new AssetCatalog();
    setGlobalAssetCatalog(cat);
  }

  cat.clear();

  for (const [name, tex] of Object.entries(fptResources.textures)) {
    cat.registerTexture(name, tex);
  }
  if (fptResources.playfield) {
    cat.registerTexture('playfield', fptResources.playfield);
  }

  if (fptResources.models) {
    for (const [name, mesh] of fptResources.models.entries()) {
      if (mesh) cat.registerModel(name, mesh);
    }
  }

  for (const [name, snd] of Object.entries(fptResources.sounds)) {
    if (typeof snd !== 'string') {
      cat.registerSound(name, snd);
    }
  }
}
