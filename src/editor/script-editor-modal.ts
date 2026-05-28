// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { EditorState } from '@codemirror/state';
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
