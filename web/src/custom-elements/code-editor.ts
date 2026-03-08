import { css as cmCss } from "@codemirror/lang-css";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { EditorView, basicSetup } from "codemirror";
import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";

type EditorLanguage = "markdown" | "css";

/**
 * CodeMirror 6 editor wrapped as a Lit custom element.
 * Supports Markdown and CSS syntax highlighting.
 */
@customElement("code-editor")
export class CodeEditor extends LitElement {
  @property({ type: String })
  value = "";

  @property({ type: String })
  language: EditorLanguage = "markdown";

  @property({ type: String })
  label = "Editor";

  @query(".editor-container")
  private _container!: HTMLDivElement;

  private _view: EditorView | null = null;
  private _suppressUpdate = false;

  protected firstUpdated() {
    this._initEditor();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._view?.destroy();
    this._view = null;
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("value") && this._view) {
      const currentValue = this._view.state.doc.toString();
      if (currentValue !== this.value) {
        this._suppressUpdate = true;
        this._view.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: this.value,
          },
        });
        this._suppressUpdate = false;
      }
    }
  }

  private _initEditor() {
    const languageExtension =
      this.language === "css" ? cmCss() : markdown();

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !this._suppressUpdate) {
        const newValue = update.state.doc.toString();
        this.dispatchEvent(
          new CustomEvent("value-changed", {
            detail: { value: newValue },
            bubbles: true,
            composed: true,
          }),
        );
      }
    });

    const state = EditorState.create({
      doc: this.value,
      extensions: [basicSetup, languageExtension, updateListener],
    });

    this._view = new EditorView({
      state,
      parent: this._container,
    });
  }

  render() {
    return html`
      <div class="editor-wrapper">
        <div class="editor-label">${this.label}</div>
        <div class="editor-container" role="textbox" aria-label=${this.label}></div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .editor-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .editor-label {
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e0e0e0;
      background: #fafafa;
    }

    .editor-container {
      flex: 1;
      overflow: auto;
    }

    /* CodeMirror fills its container */
    .editor-container .cm-editor {
      height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "code-editor": CodeEditor;
  }
}
