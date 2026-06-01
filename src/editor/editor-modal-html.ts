export function getEditorModalHTML(tableName: string): string {
  return `
    <div class="editor-modal-header">
      <div class="header-top">
        <h2>📝 Table Editor: ${tableName}</h2>
        <button class="modal-close" title="Close editor">✕</button>
      </div>
      <div class="tab-navigation">
        <button class="tab-btn active" data-tab="playfield" title="Edit playfield">⊞ Playfield</button>
        <button class="tab-btn" data-tab="backglass" title="Edit backglass">🖼️ Backglass</button>
        <button class="tab-btn" data-tab="dmd" title="Edit DMD">🔲 DMD</button>
        <button class="tab-btn" data-tab="video" title="Manage videos">🎬 Videos</button>
        <button class="tab-btn" data-tab="assets" title="Browse assets">📦 Assets</button>
      </div>
    </div>

    <div class="editor-modal-content">
      <div id="tab-playfield" class="editor-tab active">
        <div class="editor-2d-panel">
          <div class="editor-toolbar">
            <button class="tool-btn active" data-tool="select" title="Select (S)">⊹</button>
            <button class="tool-btn" data-tool="bumper" title="Bumper (B)">●</button>
            <button class="tool-btn" data-tool="target" title="Target (T)">▪</button>
            <button class="tool-btn" data-tool="ramp" title="Ramp (R)">╱</button>
            <hr>
            <button class="tool-btn snap-btn active" title="Toggle snap">⊞ SNAP</button>
            <button class="tool-btn clear-btn" title="Clear all">🗑</button>
            <hr>
            <button class="tool-btn load-fpt-btn" title="Load FPT file">📂 FPT</button>
            <input type="file" id="fpt-file-input" accept=".fpt,.fp" style="display:none">
          </div>

          <div class="editor-canvas-wrap">
            <canvas id="integrated-editor-canvas" width="400" height="800"></canvas>
          </div>

          <div class="editor-properties">
            <div class="prop-group">
              <label>Table Name:</label>
              <input type="text" id="prop-name" class="prop-input" placeholder="Table name">
            </div>
            <div class="prop-group">
              <label>Table Color:</label>
              <input type="color" id="prop-color" class="prop-color">
            </div>
            <div class="prop-group">
              <label>Accent Color:</label>
              <input type="color" id="prop-accent" class="prop-color">
            </div>
            <div class="prop-group">
              <small id="elem-count">Elements: 0</small>
            </div>
          </div>
        </div>

        <div class="editor-3d-panel">
          <div class="preview-label">3D Preview (Top-Down)</div>
          <canvas id="editor-3d-canvas" width="400" height="800"></canvas>
          <div class="preview-info">
            <small>Real-time preview updates as you edit</small>
          </div>
        </div>
      </div>

      <div id="tab-backglass" class="editor-tab hidden">
        <div class="backglass-editor-container"></div>
      </div>

      <div id="tab-dmd" class="editor-tab hidden">
        <div class="dmd-editor-container"></div>
      </div>

      <div id="tab-video" class="editor-tab hidden">
        <div class="video-editor-container"></div>
      </div>

      <div id="tab-assets" class="editor-tab hidden">
        <div class="assets-editor-container"></div>
      </div>
    </div>

    <div class="editor-modal-footer">
      <button class="btn-save-fpt" onclick="(window as any).getIntegratedEditor?.().saveFPT?.('sidecar')">💾 Save (.edited)</button>
      <button class="btn-save-fpt-overwrite" onclick="(window as any).getIntegratedEditor?.().saveFPT?.('overwrite')">💾 Save As / Overwrite...</button>
      <button class="btn-apply" onclick="(window as any).getIntegratedEditor?.().applyChanges?.()">✓ Apply & Save</button>
      <button class="btn-discard" onclick="(window as any).getIntegratedEditor?.().discardChanges?.()">✕ Discard</button>
      <button class="btn-switch-table" onclick="(window as any).getIntegratedEditor?.().switchTable?.()">⇨ Switch Table</button>
      <button class="btn-script" onclick="(window as any).getIntegratedEditor?.().openScriptEditor?.()">📝 Script</button>
    </div>
  `;
}
