import { Marpit } from "@marp-team/marpit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

/**
 * Renders Marp Markdown as HTML slides using Marpit.
 * Pure rendering component — receives markdown, outputs slides.
 */
@customElement("slide-preview")
export class SlidePreview extends LitElement {
  @property({ type: String })
  markdown = "";

  @property({ type: String, attribute: "custom-css" })
  customCss = "";

  @property({ type: Number, attribute: "current-slide" })
  currentSlide = 0;

  @state()
  private _slideCount = 0;

  private _marpit = new Marpit();

  render() {
    const { html: slidesHtml, css: slidesCss } = this._marpit.render(
      this.markdown ||
        "# No slides yet\n\nStart by describing your LT topic in the chat.",
    );

    // Count slides from rendered HTML
    const slideMatches = slidesHtml.match(/<section/g);
    this._slideCount = slideMatches?.length ?? 0;

    return html`
      <div class="preview-container">
        <div class="slide-viewport">
          <div class="slides-wrapper">
            <style>
              ${slidesCss}${this.customCss}
            </style>
            ${this._renderSlides(slidesHtml)}
          </div>
        </div>
        <div class="slide-nav" aria-label="Slide navigation">
          <button
            @click=${this._prevSlide}
            ?disabled=${this.currentSlide <= 0}
            aria-label="Previous slide"
          >
            &lt;
          </button>
          <span>${this.currentSlide + 1} / ${this._slideCount || 1}</span>
          <button
            @click=${this._nextSlide}
            ?disabled=${this.currentSlide >= this._slideCount - 1}
            aria-label="Next slide"
          >
            &gt;
          </button>
        </div>
      </div>
    `;
  }

  private _renderSlides(slidesHtml: string) {
    const container = document.createElement("div");
    container.innerHTML = slidesHtml;
    const sections = container.querySelectorAll("section");

    // Show only the current slide
    for (let i = 0; i < sections.length; i++) {
      if (i !== this.currentSlide) {
        sections[i].style.display = "none";
      }
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = container.innerHTML;
    return html`${wrapper}`;
  }

  private _prevSlide() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this._dispatchSlideChange();
    }
  }

  private _nextSlide() {
    if (this.currentSlide < this._slideCount - 1) {
      this.currentSlide++;
      this._dispatchSlideChange();
    }
  }

  private _dispatchSlideChange() {
    this.dispatchEvent(
      new CustomEvent("slide-change", {
        detail: { index: this.currentSlide },
        bubbles: true,
        composed: true,
      }),
    );
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .preview-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .slide-viewport {
      flex: 1;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f0f0;
      border-radius: 8px;
      padding: 16px;
    }

    .slides-wrapper {
      width: 100%;
      max-width: 960px;
      aspect-ratio: 16 / 9;
      background: white;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    .slides-wrapper section {
      width: 100%;
      height: 100%;
      padding: 40px;
      box-sizing: border-box;
    }

    .slide-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 12px;
    }

    .slide-nav button {
      padding: 4px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 16px;

      &:disabled {
        opacity: 0.3;
        cursor: default;
      }

      &:hover:not(:disabled) {
        background: #f0f0f0;
      }
    }

    .slide-nav span {
      font-size: 14px;
      color: #666;
      min-width: 60px;
      text-align: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "slide-preview": SlidePreview;
  }
}
