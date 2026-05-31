# Phase 3c: VBScript Editor Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Script" button in the integrated editor that opens a modal with a syntax-highlighted VBScript editor showing the current table's script. On "Apply", hot-reload the script via `runFPScript()`. On "Cancel", discard.

**Architecture:** New `ScriptEditorModal` class in `src/editor/script-editor-modal.ts` using CodeMirror 6 (lightweight, ~200KB minified, supports custom languages). For Phase 3c we use a generic basic-text mode + a minimal VBScript syntax highlighter (keyword regex). Phase 3c+ can swap in a full Lezer grammar.

**Tech Stack:** TypeScript, CodeMirror 6 (`@codemirror/state`, `@codemirror/view`, `@codemirror/basic-setup`), Vitest.

**Reference Spec:** `docs/superpowers/specs/2026-05-08-fpt-loading-and-table-editor-design.md` (section "Phase 3.3 VBScript Editor Modal")
**Builds on:** Phase 3a, 3b (editor module + modal pattern)

---

## File Structure

**New files:**
- `src/editor/script-editor-modal.ts` — `ScriptEditorModal` class (~200 LOC)
- `src/__tests__/script-editor-modal.test.ts` — unit tests (~120 LOC)

**Modified files:**
- `src/integrated-editor.ts` — add "📝 Script" button in toolbar; wire to `scriptEditorModal.open(currentScript, onApply)`
- `package.json` — add CodeMirror 6 dependencies

---

## Task 1: Install CodeMirror 6

**Files:**
- Modify: `package.json`, `package-lock.json`

- [x] **Step 1: Install dependencies**

```bash
npm install --save @codemirror/state @codemirror/view @codemirror/commands @codemirror/language @codemirror/search @codemirror/autocomplete @codemirror/lint
```

(`@codemirror/basic-setup` is sometimes a separate package; on CM6 the standard is to compose features manually.)

- [x] **Step 2: Verify build still works**

```
npx vite build
```

Expected: build succeeds (CodeMirror is tree-shakable; should add ~80-150KB gzipped to the bundle).

- [x] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build(deps): add CodeMirror 6 for VBScript editor"
```

---

## Task 2: ScriptEditorModal class

**Files:**
- Create: `src/editor/script-editor-modal.ts`
- Test: `src/__tests__/script-editor-modal.test.ts`

- [x] **Step 1: Write failing tests**

Create `src/__tests__/script-editor-modal.test.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('../script-engine', () => ({ runFPScript: vi.fn(), resolveSoundForPlayback: vi.fn() }));
vi.mock('../audio-system', () => ({ getAudioCtx: vi.fn(), playFPTMusic: vi.fn() }));
vi.mock('cfb', () => ({}));

import { ScriptEditorModal } from '../editor/script-editor-modal';

function clearBody(): void {
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
}

describe('ScriptEditorModal', () => {
  let modal: ScriptEditorModal;
  beforeEach(() => {
    clearBody();
    modal = new ScriptEditorModal();
  });

  it('opens with the provided initial script content', () => {
    const initial = 'Sub Bumper1_Hit\n  AddScore 100\nEnd Sub\n';
    modal.open(initial, () => {});
    expect(document.querySelector('.script-editor-modal')).not.toBeNull();
    expect(modal.getValue()).toContain('Sub Bumper1_Hit');
  });

  it('calls onApply with current script content when Apply clicked', () => {
    const onApply = vi.fn();
    modal.open('orig', onApply);
    modal.setValue('updated content');
    document.querySelector<HTMLButtonElement>('[data-action="apply"]')!.click();
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0]).toBe('updated content');
  });

  it('does not call onApply when Cancel clicked', () => {
    const onApply = vi.fn();
    modal.open('orig', onApply);
    modal.setValue('changed');
    document.querySelector<HTMLButtonElement>('[data-action="cancel"]')!.click();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('removes modal from DOM after apply or cancel', () => {
    modal.open('test', () => {});
    expect(document.querySelector('.script-editor-modal')).not.toBeNull();
    document.querySelector<HTMLButtonElement>('[data-action="cancel"]')!.click();
    expect(document.querySelector('.script-editor-modal')).toBeNull();
  });

  it('renders a CodeMirror editor (presence of cm-editor class)', () => {
    modal.open('Sub Test()\nEnd Sub', () => {});
    expect(document.querySelector('.cm-editor')).not.toBeNull();
  });
});
```

- [x] **Step 2: Run test to verify failure**

```
npx vitest run src/__tests__/script-editor-modal.test.ts
```

Expected: FAIL — module not found.

- [x] **Step 3: Implement ScriptEditorModal**

Create `src/editor/script-editor-modal.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';

type ApplyCallback = (script: string) => void;

/**
 * Modal containing a CodeMirror 6 editor for editing VBScript content.
 * Uses safe DOM construction. Calls onApply with the current text on Apply.
 */
export class ScriptEditorModal {
  private root: HTMLElement | null = null;
  private view: EditorView | null = null;
  private onApplyCb: ApplyCallback | null = null;

  open(initialScript: string, onApply: ApplyCallback): void {
    this.close();
    this.onApplyCb = onApply;

    this.root = document.createElement('div');
    this.root.className = 'script-editor-modal';

    const dialog = document.createElement('div');
    dialog.className = 'script-editor-modal-dialog';

    const title = document.createElement('h3');
    title.className = 'script-editor-modal-title';
    title.textContent = 'Edit VBScript';
    dialog.appendChild(title);

    const editorContainer = document.createElement('div');
    editorContainer.className = 'script-editor-container';
    dialog.appendChild(editorContainer);

    dialog.appendChild(this.renderButtons());

    this.root.appendChild(dialog);
    document.body.appendChild(this.root);

    // Initialize CodeMirror inside the container
    const state = EditorState.create({
      doc: initialScript,
      extensions: [
        lineNumbers(),
        history(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
        EditorView.lineWrapping,
      ],
    });
    this.view = new EditorView({ state, parent: editorContainer });
  }

  getValue(): string {
    return this.view ? this.view.state.doc.toString() : '';
  }

  setValue(content: string): void {
    if (!this.view) return;
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: content },
    });
  }

  private renderButtons(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'script-editor-modal-buttons';

    const applyBtn = document.createElement('button');
    applyBtn.dataset.action = 'apply';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', () => this.handleApply());

    const cancelBtn = document.createElement('button');
    cancelBtn.dataset.action = 'cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.close());

    row.appendChild(applyBtn);
    row.appendChild(cancelBtn);
    return row;
  }

  private handleApply(): void {
    if (this.onApplyCb) {
      this.onApplyCb(this.getValue());
    }
    this.close();
  }

  private close(): void {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
    if (this.root) {
      this.root.remove();
      this.root = null;
    }
    this.onApplyCb = null;
  }
}
```

- [x] **Step 4: Run tests + build**

```
npx vitest run src/__tests__/script-editor-modal.test.ts
npx vitest run
npx vite build
```

Expected: 5 new tests pass, full suite green, build succeeds (slightly larger bundle from CodeMirror).

- [x] **Step 5: Commit**

```bash
git add src/editor/script-editor-modal.ts src/__tests__/script-editor-modal.test.ts
git commit -m "feat(editor): add ScriptEditorModal with CodeMirror 6"
```

---

## Task 3: Wire ScriptEditorModal into integrated-editor.ts

**Files:**
- Modify: `src/integrated-editor.ts`

- [x] **Step 1: Add import + field**

```typescript
import { ScriptEditorModal } from './editor/script-editor-modal';
import { fptResources, fpScriptHandlers } from './game';
import { runFPScript } from './script-engine';

// In class fields:
private scriptEditorModal: ScriptEditorModal = new ScriptEditorModal();
```

- [x] **Step 2: Add "Script" button in toolbar**

Find the toolbar section (search for `data-tool=` lines). Add after the existing tool buttons:

```html
<button class="btn-script" onclick="(window as any).getIntegratedEditor?.().openScriptEditor?.()">📝 Script</button>
```

(Use the same onclick-via-window pattern that already exists for other actions.)

- [x] **Step 3: Add openScriptEditor method**

```typescript
public openScriptEditor(): void {
  const currentScript = fptResources.script ?? '';
  this.scriptEditorModal.open(currentScript, (updated) => {
    fptResources.script = updated;
    // Hot-reload: re-execute script to refresh fpScriptHandlers
    try {
      runFPScript(updated);
      console.log('[ScriptEditor] Script re-loaded, handlers refreshed');
    } catch (err) {
      console.error('[ScriptEditor] Script reload failed:', err);
      alert('Script reload failed: ' + (err as Error).message);
    }
  });
}
```

- [x] **Step 4: Run tests + build, commit**

```
npx vitest run && npx vite build
git add src/integrated-editor.ts
git commit -m "feat(editor): integrate ScriptEditorModal into editor toolbar"
```

---

## Task 4: Add CSS

```css
.script-editor-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10001; }
.script-editor-modal-dialog { background: #1c1c1f; color: #ddd; border: 1px solid #333; border-radius: 6px; padding: 20px; width: 80vw; max-width: 1100px; height: 80vh; display: flex; flex-direction: column; }
.script-editor-modal-title { margin: 0 0 12px; font-size: 16px; }
.script-editor-container { flex: 1; min-height: 300px; border: 1px solid #333; border-radius: 4px; overflow: hidden; }
.script-editor-container .cm-editor { height: 100%; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px; }
.script-editor-modal-buttons { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
.script-editor-modal-buttons button { padding: 6px 14px; background: #2a2a2e; color: #ddd; border: 1px solid #444; border-radius: 3px; cursor: pointer; }
.script-editor-modal-buttons button[data-action="apply"] { background: #2a5a3a; border-color: #4a8a5a; }
.script-editor-modal-buttons button:hover { filter: brightness(1.2); }
.btn-script { padding: 6px 12px; background: #2a3050; color: #ddd; border: 1px solid #4060a0; border-radius: 3px; cursor: pointer; }
.btn-script:hover { background: #3a4060; }
```

Commit:
```bash
git add src/integrated-editor.ts
git commit -m "feat(editor): add CSS for ScriptEditorModal"
```

---

## Task 5: Manual verification

- [x] Start dev server, load FPT, open editor
- [x] Click "📝 Script" button → modal opens with current VBScript
- [x] Edit script (line numbers visible, basic editing works)
- [x] Click Apply → modal closes, console log confirms reload
- [x] Verify modified script behavior (e.g., bumper hit triggers updated logic)
- [x] Click Cancel on second open → no changes applied

---

## Summary

After Phase 3c:
- "📝 Script" button in editor toolbar
- Full CodeMirror 6 editor with line numbers, search, undo/redo
- Apply triggers hot-reload via `runFPScript`
- Bundle adds ~80-150KB gzipped (CodeMirror 6, tree-shaken)

**Test count:** ~649 → ~654 (+5 new tests)

## Out of Scope

- Custom VBScript Lezer grammar (using default text highlighting in Phase 3c)
- Auto-completion of VBScript built-ins (PlaySound, AddScore, etc.) — defer
- Linting/syntax error detection — defer
- Multi-file script editing — Future Pinball uses one script per table
- Diff view / git history — defer

## Risks

1. **Hot-reload state pollution** — re-running `runFPScript` may double-register event handlers if the implementation appends. Verify `fpScriptHandlers` is reset before re-binding (check `script-engine.ts`).
2. **Bundle size** — CodeMirror is the largest single dep added. If bundle exceeds 1MB gzipped, consider lazy-loading the modal (`import()` on first open).
3. **Browser compatibility** — CodeMirror 6 requires modern browsers (ES2018+). Already aligned with project's existing Vite target.
