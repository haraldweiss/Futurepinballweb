# Phase 3b: Object Property Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the user double-clicks an element on the 2D playfield canvas in the integrated editor, open a modal showing that element's properties (position, color, type-specific fields). On save, update the element in the editor's state and re-render canvas + 3D preview.

**Architecture:** New `PropertyModal` class in `src/editor/property-modal.ts` using safe DOM construction. The integrated editor adds a `dblclick` handler that calls `propertyModal.openForElement(elements[idx], onSave)`.

**Tech Stack:** TypeScript, plain DOM (createElement + textContent — no innerHTML on dynamic content), Vitest.

**Reference Spec:** `docs/superpowers/specs/2026-05-08-fpt-loading-and-table-editor-design.md` (section "Phase 3.2 Object Property Modal")
**Builds on:** Phase 3a (editor module pattern)

---

## File Structure

**New files:**
- `src/editor/property-modal.ts` — `PropertyModal` class (~250 LOC)
- `src/__tests__/property-modal.test.ts` — unit tests (~150 LOC)

**Modified files:**
- `src/integrated-editor.ts` — wire `dblclick` on canvas → `propertyModal.openForElement`; on save, update element + re-render

---

## Task 1: PropertyModal class with type-specific field rendering

**Files:**
- Create: `src/editor/property-modal.ts`
- Test: `src/__tests__/property-modal.test.ts` (new)

The modal renders different fields based on element type:

| Field | Bumper | Target | Ramp |
|---|---|---|---|
| Position X | ✓ | ✓ | (x1, x2) |
| Position Y | ✓ | ✓ | (y1, y2) |
| Color | ✓ | ✓ | ✓ |

- [x] **Step 1: Write failing tests**

Create `src/__tests__/property-modal.test.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('../script-engine', () => ({ runFPScript: vi.fn(), resolveSoundForPlayback: vi.fn() }));
vi.mock('../audio-system', () => ({ getAudioCtx: vi.fn(), playFPTMusic: vi.fn() }));
vi.mock('cfb', () => ({}));

import { PropertyModal, type EditorElement } from '../editor/property-modal';

function clearBody(): void {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
}

describe('PropertyModal', () => {
  let modal: PropertyModal;
  beforeEach(() => {
    clearBody();
    modal = new PropertyModal();
  });

  it('renders position fields for a bumper element', () => {
    const elem: EditorElement = { type: 'bumper', x: 1.5, y: -2.3, color: 0xff0000 };
    modal.openForElement(elem, () => {});
    const xInput = document.querySelector<HTMLInputElement>('[data-field="x"]');
    const yInput = document.querySelector<HTMLInputElement>('[data-field="y"]');
    expect(xInput?.value).toBe('1.5');
    expect(yInput?.value).toBe('-2.3');
  });

  it('renders color picker reflecting current color', () => {
    const elem: EditorElement = { type: 'bumper', x: 0, y: 0, color: 0xff8800 };
    modal.openForElement(elem, () => {});
    const colorInput = document.querySelector<HTMLInputElement>('[data-field="color"]');
    expect(colorInput?.value).toBe('#ff8800');
  });

  it('renders x1/y1/x2/y2 fields for a ramp element', () => {
    const elem: EditorElement = { type: 'ramp', x1: 0, y1: 0, x2: 2, y2: 3, color: 0x00ff00 };
    modal.openForElement(elem, () => {});
    expect(document.querySelector('[data-field="x1"]')).not.toBeNull();
    expect(document.querySelector('[data-field="y1"]')).not.toBeNull();
    expect(document.querySelector('[data-field="x2"]')).not.toBeNull();
    expect(document.querySelector('[data-field="y2"]')).not.toBeNull();
    expect(document.querySelector('[data-field="x"]')).toBeNull();
  });

  it('calls onSave with updated element when Save clicked', () => {
    const elem: EditorElement = { type: 'bumper', x: 0, y: 0, color: 0xff0000 };
    const onSave = vi.fn();
    modal.openForElement(elem, onSave);

    const xInput = document.querySelector<HTMLInputElement>('[data-field="x"]')!;
    xInput.value = '2.5';
    xInput.dispatchEvent(new Event('input'));

    const colorInput = document.querySelector<HTMLInputElement>('[data-field="color"]')!;
    colorInput.value = '#00ff00';
    colorInput.dispatchEvent(new Event('input'));

    document.querySelector<HTMLButtonElement>('[data-action="save"]')!.click();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toEqual({ type: 'bumper', x: 2.5, y: 0, color: 0x00ff00 });
  });

  it('does not call onSave when Cancel clicked', () => {
    const elem: EditorElement = { type: 'bumper', x: 0, y: 0, color: 0xff0000 };
    const onSave = vi.fn();
    modal.openForElement(elem, onSave);
    document.querySelector<HTMLButtonElement>('[data-action="cancel"]')!.click();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('removes modal from DOM after save or cancel', () => {
    const elem: EditorElement = { type: 'bumper', x: 0, y: 0, color: 0xff0000 };
    modal.openForElement(elem, () => {});
    expect(document.querySelector('.property-modal')).not.toBeNull();
    document.querySelector<HTMLButtonElement>('[data-action="cancel"]')!.click();
    expect(document.querySelector('.property-modal')).toBeNull();
  });

  it('does not interpret element type as HTML (XSS safety)', () => {
    const elem: any = { type: '<script>alert(1)</script>', x: 0, y: 0, color: 0xff0000 };
    modal.openForElement(elem, () => {});
    expect(document.querySelectorAll('script').length).toBe(0);
  });
});
```

- [x] **Step 2: Run test to verify failure**

```
npx vitest run src/__tests__/property-modal.test.ts
```

Expected: FAIL — module not found.

- [x] **Step 3: Implement PropertyModal**

Create `src/editor/property-modal.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

export interface BumperElement { type: 'bumper'; x: number; y: number; color: number; }
export interface TargetElement { type: 'target'; x: number; y: number; color: number; }
export interface RampElement   { type: 'ramp';   x1: number; y1: number; x2: number; y2: number; color: number; }
export type EditorElement = BumperElement | TargetElement | RampElement;

type SaveCallback = (updated: EditorElement) => void;

/**
 * Modal for editing properties of a selected playfield element.
 * Uses safe DOM construction (createElement + textContent only).
 */
export class PropertyModal {
  private root: HTMLElement | null = null;
  private working: EditorElement | null = null;
  private onSaveCb: SaveCallback | null = null;

  openForElement(element: EditorElement, onSave: SaveCallback): void {
    this.close();
    this.working = { ...element } as EditorElement;
    this.onSaveCb = onSave;

    this.root = document.createElement('div');
    this.root.className = 'property-modal';

    const dialog = document.createElement('div');
    dialog.className = 'property-modal-dialog';

    const title = document.createElement('h3');
    title.className = 'property-modal-title';
    title.textContent = `Edit ${element.type}`;
    dialog.appendChild(title);

    dialog.appendChild(this.renderFields());
    dialog.appendChild(this.renderButtons());

    this.root.appendChild(dialog);
    document.body.appendChild(this.root);
  }

  private renderFields(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'property-modal-fields';
    if (!this.working) return container;

    if (this.working.type === 'ramp') {
      this.appendNumberField(container, 'x1', this.working.x1);
      this.appendNumberField(container, 'y1', this.working.y1);
      this.appendNumberField(container, 'x2', this.working.x2);
      this.appendNumberField(container, 'y2', this.working.y2);
    } else {
      this.appendNumberField(container, 'x', this.working.x);
      this.appendNumberField(container, 'y', this.working.y);
    }
    this.appendColorField(container, 'color', this.working.color);
    return container;
  }

  private appendNumberField(parent: HTMLElement, fieldName: string, value: number): void {
    const row = document.createElement('div');
    row.className = 'property-modal-row';
    const label = document.createElement('label');
    label.textContent = fieldName;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.1';
    input.dataset.field = fieldName;
    input.value = String(value);
    input.addEventListener('input', () => {
      if (!this.working) return;
      const v = parseFloat(input.value);
      if (Number.isFinite(v)) {
        (this.working as any)[fieldName] = v;
      }
    });
    row.appendChild(label);
    row.appendChild(input);
    parent.appendChild(row);
  }

  private appendColorField(parent: HTMLElement, fieldName: string, value: number): void {
    const row = document.createElement('div');
    row.className = 'property-modal-row';
    const label = document.createElement('label');
    label.textContent = fieldName;
    const input = document.createElement('input');
    input.type = 'color';
    input.dataset.field = fieldName;
    input.value = '#' + value.toString(16).padStart(6, '0');
    input.addEventListener('input', () => {
      if (!this.working) return;
      const hex = input.value.replace('#', '');
      const n = parseInt(hex, 16);
      if (Number.isFinite(n)) {
        (this.working as any)[fieldName] = n;
      }
    });
    row.appendChild(label);
    row.appendChild(input);
    parent.appendChild(row);
  }

  private renderButtons(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'property-modal-buttons';

    const saveBtn = document.createElement('button');
    saveBtn.dataset.action = 'save';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => this.handleSave());

    const cancelBtn = document.createElement('button');
    cancelBtn.dataset.action = 'cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.close());

    row.appendChild(saveBtn);
    row.appendChild(cancelBtn);
    return row;
  }

  private handleSave(): void {
    if (this.working && this.onSaveCb) {
      this.onSaveCb(this.working);
    }
    this.close();
  }

  private close(): void {
    if (this.root) {
      this.root.remove();
      this.root = null;
    }
    this.working = null;
    this.onSaveCb = null;
  }
}
```

- [x] **Step 4: Run tests + build**

```
npx vitest run && npx vite build
```

Expected: ~649 tests pass.

- [x] **Step 5: Commit**

```bash
git add src/editor/property-modal.ts src/__tests__/property-modal.test.ts
git commit -m "feat(editor): add PropertyModal for editing element properties"
```

---

## Task 2: Wire PropertyModal into integrated-editor.ts

**Files:**
- Modify: `src/integrated-editor.ts`

- [x] **Step 1: Add import + field**

```typescript
import { PropertyModal } from './editor/property-modal';

// In class fields:
private propertyModal: PropertyModal = new PropertyModal();
```

- [x] **Step 2: Add dblclick handler**

In `setupCanvases` (around line 451):

```typescript
this.canvas.addEventListener('dblclick', (e) => this.onCanvasDoubleClick(e));
```

Add the method (extract pickElementAt logic from existing onCanvasMouseDown if available):

```typescript
private onCanvasDoubleClick(e: MouseEvent): void {
  const rect = this.canvas!.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const idx = this.pickElementAt(cx, cy);
  if (idx < 0 || !this.elements[idx]) return;
  this.propertyModal.openForElement(this.elements[idx] as any, (updated) => {
    this.elements[idx] = updated as any;
    this.render();
    this.update3DPreview();
  });
}

private pickElementAt(cx: number, cy: number): number {
  // Reuse existing hit-test logic from onCanvasMouseDown.
  // If existing logic is inline, extract it here. Otherwise inline the same hit-test.
  // [Implementation extracted from current selection logic]
}
```

Read the existing `onCanvasMouseDown` to see how it sets `selectedIdx` — that logic is the hit-test. Extract or duplicate it in `pickElementAt`.

- [x] **Step 3: Run tests + build, commit**

```
npx vitest run && npx vite build
git add src/integrated-editor.ts
git commit -m "feat(editor): open PropertyModal on canvas double-click"
```

---

## Task 3: Add CSS

Add to existing editor styles:

```css
.property-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; }
.property-modal-dialog { background: #1c1c1f; color: #ddd; border: 1px solid #333; border-radius: 6px; padding: 20px 24px; min-width: 300px; max-width: 480px; }
.property-modal-title { margin: 0 0 16px; font-size: 16px; text-transform: capitalize; }
.property-modal-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.property-modal-row label { flex: 0 0 64px; text-transform: capitalize; color: #aaa; }
.property-modal-row input { flex: 1; background: #0e0e10; border: 1px solid #333; border-radius: 3px; padding: 4px 8px; color: #ddd; }
.property-modal-buttons { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
.property-modal-buttons button { padding: 6px 14px; background: #2a2a2e; color: #ddd; border: 1px solid #444; border-radius: 3px; cursor: pointer; }
.property-modal-buttons button[data-action="save"] { background: #2a5a3a; border-color: #4a8a5a; }
.property-modal-buttons button:hover { filter: brightness(1.2); }
```

Commit:
```bash
git add src/integrated-editor.ts
git commit -m "feat(editor): add CSS for PropertyModal"
```

---

## Task 4: Manual verification

- [x] Start dev server, load FPT, open editor
- [x] Double-click any element on canvas → modal appears with correct fields
- [x] Edit values, click Save → changes appear in canvas + 3D preview
- [x] Click Cancel → changes discarded

---

## Summary

After Phase 3b:
- Double-click element → modal with editable properties
- Type-specific fields (bumper/target use x,y; ramp uses x1,y1,x2,y2)
- Color picker for all types
- Save updates element + redraws canvas + 3D preview
- XSS-safe DOM throughout

**Test count:** ~649

## Out of Scope

- Undo/redo
- Live-preview as user types (only on Save)
- Advanced fields (bumper strength, target reset, etc.)
- Material/texture picker (deferred)
- Rotation, scale (would need 3D-preview integration)
