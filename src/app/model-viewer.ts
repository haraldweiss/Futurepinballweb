// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * Model Viewer — Dev-mode 3D Model Inspector
 *
 * Creates a floating panel with OrbitControls for inspecting parsed FPM models.
 * Gated behind `import.meta.env.DEV` — no-op in production.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { globalAssetCatalog } from '../game';

export interface ModelViewerOptions {
  container?: HTMLElement;
  allowDrop?: boolean;
}

export function initModelViewer(opts?: ModelViewerOptions): ModelViewerHandle | null {
  if (!import.meta.env.DEV) return null;
  return new ModelViewerImpl(opts ?? {});
}

export interface ModelViewerHandle {
  refresh(): void;
  showModel(name: string): void;
  toggle(): void;
  dispose(): void;
  readonly modelNames: string[];
}

interface ModelEntry {
  name: string; vertices: number; triangles: number; hasTexture: boolean;
}

class ModelViewerImpl implements ModelViewerHandle {
  private panel: HTMLDivElement | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private modelList: HTMLDivElement | null = null;
  private infoPane: HTMLDivElement | null = null;
  private currentModel: THREE.Mesh | null = null;
  private animFrame = 0;
  private _visible = false;
  private _modelEntries: ModelEntry[] = [];

  constructor(private opts: ModelViewerOptions) {
    this.buildUI();
    this.refresh();
  }

  get modelNames(): string[] { return this._modelEntries.map(e => e.name); }

  refresh(): void {
    this._modelEntries = this.scanModels();
    this.renderModelList();
  }

  showModel(name: string): void {
    const cat = this.getCatalog();
    if (!cat || !cat.hasModel(name)) return;
    const mesh = cat.getModel(name);
    if (!mesh) return;
    this.displayMesh(mesh.clone());
    this.updateInfo(name);
  }

  toggle(): void {
    if (!this.panel) return;
    this._visible = !this._visible;
    this.panel.style.display = this._visible ? 'flex' : 'none';
    if (this._visible) this.startLoop();
    else this.stopLoop();
  }

  dispose(): void {
    this.stopLoop();
    if (this.controls) { this.controls.dispose(); this.controls = null; }
    if (this.renderer) { this.renderer.dispose(); this.renderer = null; }
    if (this.panel && this.panel.parentNode) this.panel.parentNode.removeChild(this.panel);
    this.panel = null; this.scene = null; this.camera = null;
  }

  private getCatalog(): any {
    return globalAssetCatalog();
  }

  private scanModels(): ModelEntry[] {
    const cat = this.getCatalog();
    if (!cat) return [];
    const entries: ModelEntry[] = [];
    const models = (cat as any).models as Map<string, THREE.Mesh> | undefined;
    if (models) {
      models.forEach((mesh: THREE.Mesh, name: string) => {
        const geo = mesh.geometry;
        const pos = geo.getAttribute('position');
        const idx = geo.index;
        entries.push({
          name,
          vertices: pos ? pos.count : 0,
          triangles: idx ? idx.count / 3 : (pos ? pos.count / 3 : 0),
          hasTexture: mesh.material instanceof THREE.MeshStandardMaterial && !!mesh.material.map,
        });
      });
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  }

  private buildUI(): void {
    const panel = document.createElement('div');
    panel.id = 'fpw-model-viewer';
    panel.style.cssText = [
      'position: fixed; top: 60px; right: 20px; width: 520px; height: 70vh;',
      'background: rgba(10, 10, 20, 0.92); border: 1px solid #4488ff;',
      'border-radius: 8px; display: flex; flex-direction: row; z-index: 9999;',
      "font: 12px/1.4 'SF Mono', Monaco, 'Cascadia Code', monospace;",
      'color: #ddd; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.6);',
      'backdrop-filter: blur(6px);',
    ].join(' ');

    const sidebar = document.createElement('div');
    sidebar.style.cssText = [
      'width: 200px; min-width: 200px; display: flex; flex-direction: column;',
      'border-right: 1px solid #333; overflow: hidden;',
    ].join(' ');

    const header = document.createElement('div');
    header.style.cssText = [
      'padding: 8px 10px; background: #1a1a2e; border-bottom: 1px solid #333;',
      'font-weight: bold; color: #88aaff; display: flex; justify-content: space-between;',
    ].join(' ');
    header.innerHTML = '<span>Models</span><span id="fpw-model-count"></span>';

    this.modelList = document.createElement('div');
    this.modelList.style.cssText = 'flex: 1; overflow-y: auto; padding: 4px 0;';
    sidebar.appendChild(header);
    sidebar.appendChild(this.modelList);

    const viewArea = document.createElement('div');
    viewArea.style.cssText = 'flex: 1; display: flex; flex-direction: column; position: relative;';

    this.infoPane = document.createElement('div');
    this.infoPane.style.cssText = [
      'padding: 6px 10px; background: #1a1a2e; border-top: 1px solid #333;',
      'font-size: 11px; min-height: 50px; max-height: 80px; overflow-y: auto;',
    ].join(' ');
    this.infoPane.textContent = '--- Select a model from the list ---';

    const viewport = document.createElement('div');
    viewport.style.cssText = 'flex: 1; position: relative;';
    viewport.id = 'fpw-model-viewport';

    viewArea.appendChild(viewport);
    viewArea.appendChild(this.infoPane);
    panel.appendChild(sidebar);
    panel.appendChild(viewArea);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    closeBtn.style.cssText = [
      'position: absolute; top: 4px; right: 4px; z-index: 10;',
      'width: 24px; height: 24px; border: none; background: rgba(255,60,60,0.6);',
      'color: #fff; border-radius: 4px; cursor: pointer; font-size: 14px; line-height: 1;',
    ].join(' ');
    closeBtn.onclick = () => this.toggle();

    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'R';
    refreshBtn.title = 'Refresh model list';
    refreshBtn.style.cssText = [
      'position: absolute; top: 4px; right: 32px; z-index: 10;',
      'width: 24px; height: 24px; border: none; background: rgba(68,136,255,0.5);',
      'color: #fff; border-radius: 4px; cursor: pointer; font-size: 14px; line-height: 1;',
    ].join(' ');
    refreshBtn.onclick = () => this.refresh();

    panel.appendChild(closeBtn);
    panel.appendChild(refreshBtn);
    document.body.appendChild(panel);
    this.panel = panel;

    this.setupScene(viewport);
    this._visible = false;
    panel.style.display = 'none';

    if (this.opts.allowDrop) this.setupDropHandler(viewport);
  }

  private setupScene(container: HTMLElement): void {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122);

    const grid = new THREE.GridHelper(4, 20, 0x4488ff, 0x224488);
    scene.add(grid);

    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambient);

    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(5, 8, 5);
    scene.add(light);

    const fill = new THREE.DirectionalLight(0x4488ff, 0.5);
    fill.position.set(-3, 2, -4);
    scene.add(fill);

    const w = container.clientWidth;
    const h = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(2, 1.5, 3);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;
    controls.minDistance = 0.5;
    controls.maxDistance = 20;

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;
    this.startLoop();
  }

  private startLoop(): void {
    if (this.animFrame) return;
    const loop = () => {
      if (!this._visible || !this.controls || !this.renderer || !this.scene || !this.camera) return;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = 0;
    }
  }

  private renderModelList(): void {
    if (!this.modelList) return;
    this.modelList.innerHTML = '';
    const countEl = document.getElementById('fpw-model-count');
    if (countEl) countEl.textContent = String(this._modelEntries.length);

    if (this._modelEntries.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 20px 10px; color: #666; text-align: center;';
      empty.textContent = 'No models loaded. Load an FPL file via the File Browser.';
      this.modelList.appendChild(empty);
      return;
    }

    for (const entry of this._modelEntries) {
      const item = document.createElement('div');
      item.style.cssText = [
        'padding: 5px 10px; cursor: pointer; border-bottom: 1px solid #222;',
        'display: flex; justify-content: space-between; align-items: center;',
        'transition: background 0.15s;',
      ].join(' ');
      const info = entry.vertices + 'v / ' + entry.triangles + 'tri' +
        (entry.hasTexture ? ' tex' : '');
      item.innerHTML = '<span>' + this.escapeHtml(entry.name) + '</span>' +
        '<span style="color:#888;font-size:10px">' + info + '</span>';

      item.onmouseenter = () => { item.style.background = 'rgba(68,136,255,0.15)'; };
      item.onmouseleave = () => { item.style.background = ''; };
      item.onclick = () => {
        this.showModel(entry.name);
        this.modelList!.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        item.style.background = 'rgba(68,136,255,0.3)';
      };
      this.modelList.appendChild(item);
    }
  }

  private displayMesh(mesh: THREE.Mesh): void {
    if (!this.scene) return;
    if (this.currentModel) {
      // Clean up wireframe if active
      if (this._wireframeOverlay) {
        this.scene.remove(this._wireframeOverlay);
        this._wireframeOverlay.geometry.dispose();
        this._wireframeOverlay.material.dispose();
        this._wireframeOverlay = null;
        this._showWireframe = false;
      }
      this.scene.remove(this.currentModel);
      this.currentModel.geometry.dispose();
      if (Array.isArray(this.currentModel.material)) {
        this.currentModel.material.forEach((m: any) => m.dispose());
      } else {
        this.currentModel.material.dispose();
      }
      this.currentModel = null;
    }

    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const pos = mesh.geometry.getAttribute('position');
    if (pos) {
      const arr = pos.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] -= center.x;
        arr[i + 1] -= center.y;
        arr[i + 2] -= center.z;
      }
      pos.needsUpdate = true;
    }
    mesh.geometry.computeBoundingSphere();
    mesh.position.set(0, 0, 0);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0 && maxDim !== 1) {
      const scale = 1.5 / maxDim;
      mesh.scale.set(scale, scale, scale);
    }

    this.scene.add(mesh);
    this.currentModel = mesh;
    if (this.controls) {
      this.controls.autoRotate = true;
      this.controls.target.set(0, 0, 0);
    }
  }

  private _wireframeOverlay: THREE.LineSegments | null = null;
  private _showWireframe = false;

  private updateInfo(name: string): void {
    if (!this.infoPane) return;
    const entry = this._modelEntries.find(e => e.name === name);
    if (!entry) { this.infoPane.textContent = name; return; }
    
    // Check if model has normals/UVs from geometry
    let hasNormals = false, hasUVs = false;
    if (this.currentModel) {
      const geo = this.currentModel.geometry;
      hasNormals = geo.getAttribute('normal') !== null;
      hasUVs = geo.getAttribute('uv') !== null;
    }
    
    this.infoPane.innerHTML = '<strong>' + this.escapeHtml(entry.name) + '</strong>  ' +
      entry.vertices + ' verts, ' + entry.triangles + ' tris' +
      (entry.hasTexture ? ' [TEX]' : '') +
      (hasNormals ? ' [N]' : '') +
      (hasUVs ? ' [UV]' : '') +
      ' &nbsp;|&nbsp; <a href="#" id="fpw-wf-toggle" style="color:#88aaff">' +
      (this._showWireframe ? 'HIDE WIRE' : 'SHOW WIRE') + '</a>';
    
    const wfLink = document.getElementById('fpw-wf-toggle');
    if (wfLink) {
      wfLink.onclick = (e) => {
        e.preventDefault();
        this.toggleWireframe();
      };
    }
  }

  private toggleWireframe(): void {
    this._showWireframe = !this._showWireframe;
    if (!this.scene || !this.currentModel) return;
    
    if (this._showWireframe) {
      const edges = new THREE.EdgesGeometry(this.currentModel.geometry);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.4 });
      this._wireframeOverlay = new THREE.LineSegments(edges, lineMat);
      this.scene.add(this._wireframeOverlay);
    } else {
      if (this._wireframeOverlay) {
        this.scene.remove(this._wireframeOverlay);
        this._wireframeOverlay.geometry.dispose();
        this._wireframeOverlay.material.dispose();
        this._wireframeOverlay = null;
      }
    }
    
    // Refresh info pane to show updated link text
    const activeItem = this.modelList?.querySelector('.active');
    if (activeItem) {
      const nameSpan = activeItem.querySelector('span');
      if (nameSpan) this.updateInfo(nameSpan.textContent || '');
    }
  }

  private setupDropHandler(container: HTMLElement): void {
    container.addEventListener('dragover', (e) => { e.preventDefault(); container.style.borderColor = '#88ff88'; });
    container.addEventListener('dragleave', () => { container.style.borderColor = ''; });
    container.addEventListener('drop', async (e) => {
      e.preventDefault();
      container.style.borderColor = '';
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      for (const file of Array.from(files)) {
        if (file.name.endsWith('.fpl') || file.name.endsWith('.fpm')) {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const { parseFPM, fpmToTHREE } = await import('../fpt/fpm-parser');
          const model = parseFPM(bytes);
          if (model && model.vertices.length > 0) {
            const mesh = fpmToTHREE(model);
            const cat = globalAssetCatalog();
            if (cat) cat.registerModel(model.name, mesh);
            this.displayMesh(mesh.clone());
            this.refresh();
          }
        }
      }
    });
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
