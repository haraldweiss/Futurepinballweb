// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from 'three';
import { getPlayfieldVisualEnhancement } from '../graphics/playfield-visual-enhancement';
import { devLog } from '../utils/dev-log';

export function applyEnhancedVisualsToTable(sceneTarget: THREE.Scene): void {
  const enhancement = getPlayfieldVisualEnhancement();
  if (!enhancement) return;

  sceneTarget.traverse((obj: THREE.Object3D) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const mesh = obj as THREE.Mesh;
    const name = mesh.name.toLowerCase();

    if (name.includes('bumper')) {
      enhancement.applyEnhancedMaterial(mesh, 'bumper', mesh.material instanceof THREE.MeshStandardMaterial ? (mesh.material as THREE.MeshStandardMaterial).color : '#ff6600');
    } else if (name.includes('target')) {
      enhancement.applyEnhancedMaterial(mesh, 'target', mesh.material instanceof THREE.MeshStandardMaterial ? (mesh.material as THREE.MeshStandardMaterial).color : '#00ff00');
    } else if (name.includes('ramp')) {
      enhancement.applyEnhancedMaterial(mesh, 'ramp', mesh.material instanceof THREE.MeshStandardMaterial ? (mesh.material as THREE.MeshStandardMaterial).color : '#ccb366');
    } else if (name.includes('flipper')) {
      enhancement.applyEnhancedMaterial(mesh, 'flipper', mesh.material instanceof THREE.MeshStandardMaterial ? (mesh.material as THREE.MeshStandardMaterial).color : '#ff6600');
    } else if (name.includes('ball')) {
      enhancement.applyEnhancedMaterial(mesh, 'ball', '#ffffff');
    } else if (name.includes('playfield') || name.includes('table')) {
      enhancement.applyEnhancedMaterial(mesh, 'playfield', mesh.material instanceof THREE.MeshStandardMaterial ? (mesh.material as THREE.MeshStandardMaterial).color : '#8b7355');
    }
  });

  devLog('✓ Enhanced visuals applied to table');
}
