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
