import DOMPurify from "dompurify";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { marked } from "marked";
import remend from "remend";
import { chatTokens } from "../styles/tokens.js";

function processMarkdown(text: string): string {
	if (!text) return "";

	// Step 1: Auto-complete incomplete Markdown using remend
	const completedText = remend(text);

	// Step 2: Convert Markdown to HTML using marked
	const html = marked.parse(completedText, { async: false }) as string;

	// Step 3: Sanitize HTML to prevent XSS
	const sanitizedHtml = DOMPurify.sanitize(html, {
		ALLOWED_TAGS: [
			"p",
			"br",
			"strong",
			"em",
			"code",
			"pre",
			"blockquote",
			"ul",
			"ol",
			"li",
			"a",
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"table",
			"thead",
			"tbody",
			"tr",
			"th",
			"td",
			"hr",
			"del",
			"s",
			"sup",
			"sub",
		],
		ALLOWED_ATTR: ["href", "target", "rel", "class"],
	});

	return sanitizedHtml;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
@customElement("markdown-content")
export class MarkdownContent extends LitElement {
	@property({ type: String })
	content = "";

	/** Duration (ms) to type out all buffered content */
	@property({ type: Number })
	typingDuration = 300;

	/** Typing animation frame rate */
	@property({ type: Number })
	fps = 60;

	@state() private _typed = "";
	private _typing = false;

	updated(changedProperties: Map<string, unknown>) {
		if (changedProperties.has("content") && this._typed !== this.content) {
			this._handleContentChange();
		}
	}

	private async _handleContentChange() {
		await this.updateComplete;
		await this._typeOut();
	}

	private async _typeOut() {
		if (this._typing) return;
		this._typing = true;

		const interval = 1000 / this.fps;

		while (this._typed.length < this.content.length) {
			const remaining = this.content.length - this._typed.length;
			const framesToCatchUp = this.typingDuration / interval;
			const charsPerFrame = Math.max(1, Math.ceil(remaining / framesToCatchUp));

			this._typed = this.content.slice(0, this._typed.length + charsPerFrame);
			await delay(interval);
		}

		this._typing = false;
	}

	render() {
		const processedHtml = processMarkdown(this._typed);

		return html`
      <div part="markdown-content" class="markdown-content">
        ${unsafeHTML(processedHtml)}
      </div>
    `;
	}

	static styles = [
		chatTokens,
		css`
    :host {
      display: block;
    }

    .markdown-content {
      line-height: var(--chat-line-height-relaxed);
    }

    .markdown-content p {
      margin: 0 0 0.75em 0;
    }

    .markdown-content p:last-child {
      margin-bottom: 0;
    }

    .markdown-content h1,
    .markdown-content h2,
    .markdown-content h3,
    .markdown-content h4,
    .markdown-content h5,
    .markdown-content h6 {
      margin: 1em 0 0.5em 0;
      font-weight: 600;
      line-height: 1.3;
    }

    .markdown-content h1:first-child,
    .markdown-content h2:first-child,
    .markdown-content h3:first-child {
      margin-top: 0;
    }

    .markdown-content h1 { font-size: var(--chat-font-size-3xl); }
    .markdown-content h2 { font-size: var(--chat-font-size-2xl); }
    .markdown-content h3 { font-size: var(--chat-font-size-xl); }
    .markdown-content h4 { font-size: var(--chat-font-size-lg); }

    .markdown-content code {
      font-family: var(--chat-font-family-mono);
      font-size: 0.875em;
      background: rgba(0, 0, 0, 0.06);
      padding: 0.15em 0.4em;
      border-radius: var(--chat-radius-sm);
    }

    .markdown-content pre {
      margin: 0.75em 0;
      padding: var(--chat-spacing-md) var(--chat-spacing-lg);
      background: rgba(0, 0, 0, 0.04);
      border-radius: var(--chat-radius-md);
      overflow-x: auto;
    }

    .markdown-content pre code {
      background: none;
      padding: 0;
      font-size: 0.85em;
      line-height: var(--chat-line-height-normal);
    }

    .markdown-content blockquote {
      margin: 0.75em 0;
      padding: var(--chat-spacing-sm) var(--chat-spacing-lg);
      border-left: 3px solid rgba(0, 0, 0, 0.15);
      background: rgba(0, 0, 0, 0.02);
      color: inherit;
      opacity: 0.85;
    }

    .markdown-content blockquote p {
      margin: 0;
    }

    .markdown-content ul,
    .markdown-content ol {
      margin: 0.5em 0;
      padding-left: 1.5em;
    }

    .markdown-content li {
      margin: var(--chat-spacing-xs) 0;
    }

    .markdown-content li > ul,
    .markdown-content li > ol {
      margin: var(--chat-spacing-xs) 0;
    }

    .markdown-content a {
      color: inherit;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .markdown-content a:hover {
      opacity: 0.75;
    }

    .markdown-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.75em 0;
      font-size: 0.9em;
    }

    .markdown-content th,
    .markdown-content td {
      padding: var(--chat-spacing-sm) var(--chat-spacing-md);
      border: 1px solid rgba(0, 0, 0, 0.1);
      text-align: left;
    }

    .markdown-content th {
      background: rgba(0, 0, 0, 0.04);
      font-weight: 600;
    }

    .markdown-content hr {
      margin: 1em 0;
      border: none;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
    }

    .markdown-content del,
    .markdown-content s {
      opacity: 0.6;
    }
  `,
	];
}

declare global {
	interface HTMLElementTagNameMap {
		"markdown-content": MarkdownContent;
	}
}
