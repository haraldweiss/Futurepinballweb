// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * Dev-mode procedural 3D model fixtures.
 *
 * When no FPL/FPM models are loaded, these generate simple 3D models
 * so the table elements (bumpers, targets, etc.) use proper 3D geometry
 * instead of flat procedural shapes.
 *
 * Gated behind `import.meta.env.DEV` — no-op in production.
 */

import * as THREE from 'three';

/**
 * Register dev-mode 3D model fixtures in the AssetCatalog.
 * Only activates in DEV mode — no-op otherwise.
 */
export async function registerDevModels(): Promise<void> {
  if (!import.meta.env.DEV) return;

  const { globalAssetCatalog } = await import('../game');
  const cat = globalAssetCatalog();
  if (!cat) {
    setTimeout(registerDevModels, 500);
    return;
  }
  try {
    let count = 0;

    if (!cat.hasModel('bumper')) {
      cat.registerModel('bumper', createBumperModel());
      count++;
    }
    if (!cat.hasModel('target')) {
      cat.registerModel('target', createTargetModel());
      count++;
    }
    if (!cat.hasModel('flipper')) {
      cat.registerModel('flipper', createFlipperModel());
      count++;
    }
    if (!cat.hasModel('plunger')) {
      cat.registerModel('plunger', createPlungerModel());
      count++;
    }

    if (count > 0) {
      if (import.meta.env.DEV) console.log('[DEV] Registered ' + count + ' procedural 3D models');
    }
  } catch {
    // Game module not yet loaded — retry
    setTimeout(registerDevModels, 500);
  }
}

/**
 * Create a 3D bumper model with proper geometry.
 * Hemisphere body with a torus ring and decorative top.
 */
function createBumperModel(): THREE.Mesh {
  const group = new THREE.Group();

  // Main body: hemisphere with high segment count for smooth reflections
  const bodyGeo = new THREE.SphereGeometry(0.5, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x4488ff,
    metalness: 0.3,
    roughness: 0.4,
    envMapIntensity: 0.8,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = -0.5;
  body.castShadow = true;
  group.add(body);

  // Base ring
  const ringGeo = new THREE.TorusGeometry(0.55, 0.06, 12, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.6,
    roughness: 0.3,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.02;
  ring.castShadow = true;
  group.add(ring);

  // Inner ring
  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.03, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.7, roughness: 0.2 })
  );
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = 0.08;
  innerRing.castShadow = true;
  group.add(innerRing);

  // Top cap
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.1, emissive: 0x4488ff, emissiveIntensity: 0.2 })
  );
  cap.position.y = 0.15;
  cap.castShadow = true;
  group.add(cap);

  // Merge into single mesh for AssetCatalog
  const merged = mergeGroupToMesh(group, 'bumper');
  return merged;
}

/**
 * Create a 3D drop-target model.
 */
function createTargetModel(): THREE.Mesh {
  const group = new THREE.Group();

  // Main rectangular body
  const bodyGeo = new THREE.BoxGeometry(0.4, 0.6, 0.2);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    metalness: 0.2,
    roughness: 0.6,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Highlight border
  const edgeGeo = new THREE.BoxGeometry(0.42, 0.62, 0.04);
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0xffaaaa,
    metalness: 0.8,
    roughness: 0.2,
  });
  const edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.position.set(0, 0, 0.12);
  group.add(edge);

  return mergeGroupToMesh(group, 'target');
}

/**
 * Create a 3D flipper model.
 */
function createFlipperModel(): THREE.Mesh {
  const group = new THREE.Group();

  // Main flipper paddle shape
  const shape = new THREE.Shape();
  shape.moveTo(-0.6, -0.08);
  shape.quadraticCurveTo(-0.4, -0.12, 0, -0.08);
  shape.quadraticCurveTo(0.3, -0.04, 0.5, 0);
  shape.quadraticCurveTo(0.3, 0.04, 0, 0.08);
  shape.quadraticCurveTo(-0.4, 0.12, -0.6, 0.08);
  shape.quadraticCurveTo(-0.65, 0, -0.6, -0.08);

  const extrudeSettings = { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.01, bevelSegments: 4 };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2266cc,
    metalness: 0.4,
    roughness: 0.5,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Rubber tip
  const tipGeo = new THREE.SphereGeometry(0.06, 8, 6);
  const tipMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.9,
    metalness: 0,
  });
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.position.set(0.52, 0, 0.05);
  group.add(tip);

  return mergeGroupToMesh(group, 'flipper');
}

/**
 * Create a 3D plunger model.
 */
function createPlungerModel(): THREE.Mesh {
  const group = new THREE.Group();

  // Plunger shaft
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8),
    new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 })
  );
  shaft.castShadow = true;
  group.add(shaft);

  // Plunger tip
  const tip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.06, 0.06, 12),
    new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 })
  );
  tip.position.y = 0.43;
  tip.castShadow = true;
  group.add(tip);

  // Plunger handle
  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xcc4444, metalness: 0.1, roughness: 0.6 })
  );
  handle.position.y = -0.43;
  handle.castShadow = true;
  group.add(handle);

  return mergeGroupToMesh(group, 'plunger');
}

/**
 * Merge a THREE.Group into a single Mesh using BufferGeometryUtils.
 * Falls back to returning group children as individual meshes.
 */
function mergeGroupToMesh(group: THREE.Group, name: string): THREE.Mesh {
  const meshes: THREE.Mesh[] = [];
  group.children.forEach((child: THREE.Object3D) => {
    if (child instanceof THREE.Mesh) {
      meshes.push(child);
    }
  });

  if (meshes.length === 0) {
    // Fallback: create a simple box
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    return mesh;
  }

  if (meshes.length === 1) {
    meshes[0].name = name;
    return meshes[0];
  }

  // Merge all meshes into one via geometry merge
  const mergedGeo = mergeBufferGeometries(meshes.map(m => m.geometry));
  if (mergedGeo) {
    // Use first mesh material (assume all materials are similar)
    const mat = meshes[0].material as THREE.MeshStandardMaterial;
    const merged = new THREE.Mesh(mergedGeo, mat.clone());
    merged.name = name;
    merged.castShadow = true;
    merged.receiveShadow = true;
    return merged;
  }

  // Fallback: return first mesh
  meshes[0].name = name;
  return meshes[0];
}

/**
 * Merge multiple BufferGeometry into one.
 * Simple implementation that concatenates position + index arrays.
 */
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geometries.length === 0) return null;
  if (geometries.length === 1) return geometries[0].clone();

  const totalVertices = geometries.reduce((sum, g) => sum + (g.getAttribute('position')?.count ?? 0), 0);
  const totalIndices = geometries.reduce((sum, g) => sum + (g.index?.count ?? 0), 0);

  if (totalVertices === 0) return null;

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  const indices = totalIndices > 0 ? new Uint16Array(totalIndices) : null;

  let vertexOffset = 0;
  let indexOffset = 0;

  for (const geo of geometries) {
    const pos = geo.getAttribute('position');
    if (pos) {
      positions.set(pos.array as Float32Array, vertexOffset * 3);
    }

    const norm = geo.getAttribute('normal');
    if (norm) {
      normals.set(norm.array as Float32Array, vertexOffset * 3);
    }

    if (indices && geo.index) {
      const idxArr = geo.index.array as Uint16Array;
      for (let i = 0; i < idxArr.length; i++) {
        indices[indexOffset + i] = idxArr[i] + vertexOffset;
      }
      indexOffset += idxArr.length;
    }

    vertexOffset += pos?.count ?? 0;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  if (indices) {
    merged.setIndex(new THREE.BufferAttribute(indices, 1));
  }
  merged.computeVertexNormals();
  merged.computeBoundingSphere();

  return merged;
}
