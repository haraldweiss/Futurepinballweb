// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('../script-engine', () => ({ runFPScript: vi.fn(), resolveSoundForPlayback: vi.fn() }));
vi.mock('../audio-system', () => ({ getAudioCtx: vi.fn(), playFPTMusic: vi.fn() }));
vi.mock('cfb', () => ({}));

import { PropertyModal, type EditorElement } from '../editor/property-modal';

function clearBody(): void {
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
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
