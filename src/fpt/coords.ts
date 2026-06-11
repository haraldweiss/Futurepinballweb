// SPDX-License-Identifier: AGPL-3.0-or-later

export function extractFPCoords(bytes: Uint8Array): Array<{x:number;y:number}> {
  const view = new DataView(bytes.buffer);
  const FP_SCALES = [
    { xMax:2100, yMax:4200, scale:1/350 },
    { xMax:800,  yMax:1600, scale:1/133 },
    { xMax:400,  yMax:800,  scale:1/66.7 },
  ];
  const clusters: Array<Array<{x:number;y:number}>> = [];

  for (const sc of FP_SCALES) {
    const found: Array<{fpX:number;fpY:number;i:number}> = [];
    for (let i = 0; i < bytes.length - 8; i += 4) {
      let x: number, y: number;
      try { x = view.getFloat32(i, true); y = view.getFloat32(i+4, true); } catch { continue; }

      if (isFinite(x) && isFinite(y) &&
          x > sc.xMax*0.05 && x < sc.xMax*0.95 &&
          y > sc.yMax*0.05 && y < sc.yMax*0.95)
        found.push({ fpX: x, fpY: y, i });
    }

    if (found.length >= 3 && found.length <= 250) {
      const converted = found.map(p => ({
        x: (p.fpX/sc.xMax)*6-3,
        y: (p.fpY/sc.yMax)*12-6
      }));

      const clustered: Array<{x:number;y:number}> = [];
      for (const p of converted) {
        const existing = clustered.find(c => Math.hypot(c.x-p.x, c.y-p.y) < 0.3);
        if (!existing) clustered.push(p);
      }

      clusters.push(clustered);
    }
  }

  if (clusters.length > 0) {
    const best = clusters.reduce((a, b) => {
      const scoreA = a.filter(p => p.y > -4 && p.y < 5 && Math.abs(p.x) < 2.8).length;
      const scoreB = b.filter(p => p.y > -4 && p.y < 5 && Math.abs(p.x) < 2.8).length;
      return scoreA > scoreB ? a : b;
    });
    return best;
  }
  return [];
}

export function assignBumperSizes(bumpers: Array<{x:number;y:number}>): number[] {
  const sizes: number[] = new Array(bumpers.length).fill(1.0);
  if (bumpers.length <= 1) return sizes;

  const clusters: Array<number[]> = [];
  const used = new Set<number>();

  for (let i = 0; i < bumpers.length; i++) {
    if (used.has(i)) continue;
    const cluster: number[] = [i];
    used.add(i);

    for (let j = i + 1; j < bumpers.length; j++) {
      if (used.has(j)) continue;
      const dist = Math.hypot(bumpers[i].x - bumpers[j].x, bumpers[i].y - bumpers[j].y);
      if (dist < 0.8) {
        cluster.push(j);
        used.add(j);
      }
    }
    clusters.push(cluster);
  }

  clusters.forEach(cluster => {
    const density = cluster.length;
    let size: number;
    if (density >= 4) size = 0.85;
    else if (density === 3) size = 0.92;
    else if (density === 2) size = 1.00;
    else size = 1.12;

    cluster.forEach(idx => {
      const yBoost = Math.max(0, bumpers[idx].y / 5) * 0.08;
      sizes[idx] = size + yBoost;
    });
  });

  return sizes;
}

export function extractFPTPhysics(bytes: Uint8Array, coords: Array<{x:number;y:number}>): Map<string, {restitution:number;friction:number;maxVelocity?:number;gravityScale?:number}> {
  const view = new DataView(bytes.buffer);
  const physicsMap = new Map<string, {restitution:number;friction:number;maxVelocity?:number;gravityScale?:number}>();

  interface PhysicsCandidate {
    i: number;
    rest: number;
    fric: number;
    maxVel?: number;
    gravity?: number;
    score: number;
  }

  const candidates: PhysicsCandidate[] = [];

  for (let i = 0; i < bytes.length - 12; i += 4) {
    try {
      const rest = view.getFloat32(i, true);
      const fric = view.getFloat32(i + 4, true);
      const maxVel = view.getFloat32(i + 8, true);
      const gravity = view.getFloat32(i + 12, true);

      if (!isFinite(rest) || !isFinite(fric) ||
          rest < 0.3 || rest > 1.6 || fric < -0.1 || fric > 0.9) {
        continue;
      }

      const candidate: PhysicsCandidate = { i, rest, fric, score: 15 };

      if (rest >= 0.6 && rest <= 1.2) candidate.score += 10;
      if (fric >= 0.1 && fric <= 0.5) candidate.score += 10;

      if (isFinite(maxVel) && maxVel >= 5 && maxVel <= 30) {
        candidate.maxVel = maxVel;
        candidate.score += 5;
      }

      if (isFinite(gravity) && gravity >= 0.7 && gravity <= 1.3) {
        candidate.gravity = gravity;
        candidate.score += 5;
      }

      for (const coord of coords) {
        const distX = Math.abs(rest - (0.7 + coord.x * 0.02));
        const distY = Math.abs(fric - (0.3 + coord.y * 0.02));
        const totalDist = Math.sqrt(distX * distX + distY * distY);
        if (totalDist < 0.25) {
          candidate.score += 20;
        } else if (totalDist < 0.5) {
          candidate.score += 10;
        }
      }

      const isDuplicate = candidates.some(
        c => Math.abs(c.rest - rest) < 0.02 && Math.abs(c.fric - fric) < 0.02
      );
      if (!isDuplicate) {
        candidates.push(candidate);
      }
    } catch { void 0; }
  }

  candidates.sort((a, b) => b.score - a.score);
  const selected = candidates.slice(0, Math.min(15, candidates.length));

  selected.forEach((c, idx) => {
    const entry = {
      restitution: Math.max(0.5, Math.min(1.2, c.rest)),
      friction: Math.max(0.0, Math.min(0.6, c.fric)),
      ...(c.maxVel && { maxVelocity: c.maxVel }),
      ...(c.gravity && { gravityScale: c.gravity })
    };

    physicsMap.set(`element_${idx}`, entry);
  });

  return physicsMap;
}

export function extractRampCoords(coords: Array<{x:number;y:number}>): Array<{x1:number;y1:number;x2:number;y2:number;intermediate?:Array<{x:number;y:number}>}> {
  if (coords.length < 4) return [];

  const ramps: Array<{x1:number;y1:number;x2:number;y2:number;intermediate?:Array<{x:number;y:number}>}> = [];

  for (let i = 0; i < coords.length - 1; i++) {
    for (let j = i + 1; j < coords.length; j++) {
      const p1 = coords[i];
      const p2 = coords[j];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      const minDist = 1.5;
      const angleFromHorizontal = Math.abs(Math.atan2(dy, dx));
      const isDiagonal = angleFromHorizontal > 0.2 && angleFromHorizontal < Math.PI - 0.2;

      if (dist >= minDist && isDiagonal) {
        const isDuplicate = ramps.some(r => {
          const d1 = Math.hypot(r.x1-p1.x, r.y1-p1.y);
          const d2 = Math.hypot(r.x2-p2.x, r.y2-p2.y);
          return (d1 < 0.4 && d2 < 0.4) || (d1 + d2 < 0.4);
        });

        if (!isDuplicate) {
          const intermediate: Array<{x:number;y:number}> = [];
          for (const pt of coords) {
            if (pt === p1 || pt === p2) continue;
            const distToLine = Math.abs((dy*pt.x - dx*pt.y - dy*p1.x + dx*p1.y) / Math.sqrt(dx*dx + dy*dy));
            const t = ((pt.x - p1.x)*dx + (pt.y - p1.y)*dy) / (dx*dx + dy*dy);
            if (distToLine < 0.3 && t >= 0.1 && t <= 0.9) {
              intermediate.push(pt);
            }
          }

          ramps.push({
            x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
            intermediate: intermediate.length > 0 ? intermediate : undefined
          });
        }
      }
    }
  }

  ramps.sort((a, b) => {
    const lenA = Math.hypot(a.x2-a.x1, a.y2-a.y1);
    const lenB = Math.hypot(b.x2-b.x1, b.y2-b.y1);
    return lenB - lenA;
  });

  return ramps.slice(0, 3);
}

export function extractWallPaths(coords: Array<{x:number;y:number}>): Array<{type:'horizontal'|'vertical';points:Array<{x:number;y:number}>}> {
  const paths: Array<{type:'horizontal'|'vertical';points:Array<{x:number;y:number}>}> = [];
  if (coords.length < 2) return paths;

  const horizontal = coords.filter(c => Math.abs(c.x) > 2.2).sort((a,b) => a.y-b.y);
  const vertical = coords.filter(c => Math.abs(c.y) > 3.5).sort((a,b) => a.x-b.x);

  if (horizontal.length >= 2) {
    paths.push({ type: 'horizontal', points: horizontal });
  }
  if (vertical.length >= 2) {
    paths.push({ type: 'vertical', points: vertical });
  }

  return paths;
}
