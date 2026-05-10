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
