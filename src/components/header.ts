import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ToolBarConfig } from '../interfaces';

/**
 * Player toolbar. Emits "actions" CustomEvent bubbling up to the main player.
 * All controls are config-driven via the toolBarConfig prop.
 */
@customElement('sb-player-header')
export class Header extends LitElement {
  @property({ type: Number }) pageNumber = 1;
  @property({ type: Number }) totalPages = 0;
  @property({ type: Number }) zoom = 100;
  @property({ type: Object }) toolBarConfig: ToolBarConfig = {};

  // Use light DOM so Tailwind + CSS vars from parent apply
  createRenderRoot() { return this; }

  private _emit(type: string, data?: unknown) {
    this.dispatchEvent(
      new CustomEvent('actions', {
        detail: { type, data },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleGotoPage(e: Event) {
    const input = e.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    if (!isNaN(value) && value >= 1 && value <= this.totalPages) {
      this._emit('NAVIGATE_TO_PAGE', value);
    } else {
      // Reset to current page if invalid
      input.value = String(this.pageNumber);
    }
  }

  private get _progressPct(): number {
    if (!this.totalPages) return 0;
    return Math.round((this.pageNumber / this.totalPages) * 100);
  }

  render() {
    const tb = this.toolBarConfig;
    const showZoom = tb.showZoomButtons !== false;
    const showRotate = tb.showRotateButton !== false;
    const showPages = tb.showPagesButton !== false;
    const showPaging = tb.showPagingButtons !== false;
    const atFirst = this.pageNumber <= 1;

    return html`
      <header
        style="background:var(--pdf-header-bg);border-bottom:1px solid var(--pdf-header-border);color:var(--pdf-header-text);"
        class="flex items-center justify-between px-3 py-1.5 gap-2 flex-wrap select-none"
        role="toolbar"
        aria-label="PDF player controls"
      >
        <!-- ── Left group: zoom + rotate ─────────────────────────────────── -->
        <div class="flex items-center gap-1">
          ${showZoom ? html`
            <button
              @click=${() => this._emit('ZOOM_OUT')}
              ?disabled=${this.zoom <= 50}
              title="Zoom out"
              aria-label="Zoom out"
              style="border-radius:var(--pdf-button-radius);"
              class="p-1.5 hover:bg-[var(--pdf-header-icon-hover-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ${iconMinus()}
            </button>

            <span
              title="Current zoom level"
              aria-live="polite"
              aria-label="Zoom level ${this.zoom}%"
              class="text-xs font-mono min-w-[3rem] text-center"
              style="color:var(--pdf-header-icon);"
            >${this.zoom}%</span>

            <button
              @click=${() => this._emit('ZOOM_IN')}
              ?disabled=${this.zoom >= 300}
              title="Zoom in"
              aria-label="Zoom in"
              style="border-radius:var(--pdf-button-radius);"
              class="p-1.5 hover:bg-[var(--pdf-header-icon-hover-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ${iconPlus()}
            </button>
          ` : nothing}

          ${showRotate ? html`
            <div class="w-px h-5 mx-1" style="background:var(--pdf-header-border);"></div>
            <button
              @click=${() => this._emit('ROTATE_CW')}
              title="Rotate clockwise"
              aria-label="Rotate clockwise"
              style="border-radius:var(--pdf-button-radius);"
              class="p-1.5 hover:bg-[var(--pdf-header-icon-hover-bg)] transition-colors"
            >
              ${iconRotate()}
            </button>
          ` : nothing}
        </div>

        <!-- ── Centre group: page navigation ─────────────────────────────── -->
        <div class="flex items-center gap-1.5 flex-1 justify-center min-w-0">
          ${showPaging ? html`
            <button
              @click=${() => this._emit('PREVIOUS')}
              ?disabled=${atFirst}
              title="Previous page"
              aria-label="Previous page"
              style="border-radius:var(--pdf-button-radius);"
              class="p-1.5 hover:bg-[var(--pdf-header-icon-hover-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ${iconChevronLeft()}
            </button>
          ` : nothing}

          ${showPages ? html`
            <div class="flex items-center gap-1 text-xs">
              <input
                type="number"
                .value=${String(this.pageNumber)}
                @change=${this._handleGotoPage}
                @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                min="1"
                max=${this.totalPages}
                aria-label="Go to page"
                title="Go to page"
                style="border:1px solid var(--pdf-header-border);border-radius:var(--pdf-button-radius);color:var(--pdf-header-text);background:var(--pdf-header-bg);"
                class="w-10 text-center py-0.5 px-1 focus:outline-none focus:ring-1 focus:ring-[var(--pdf-primary)]"
              />
              <span style="color:var(--pdf-header-icon);">
                / ${this.totalPages}
              </span>
              <span
                class="hidden sm:inline ml-1 font-medium"
                style="color:var(--pdf-header-icon);"
                aria-label="Progress ${this._progressPct}%"
              >
                — ${this._progressPct}%
              </span>
            </div>
          ` : nothing}

          ${showPaging ? html`
            <button
              @click=${() => this._emit('NEXT')}
              title="Next page"
              aria-label="Next page"
              style="border-radius:var(--pdf-button-radius);"
              class="p-1.5 hover:bg-[var(--pdf-header-icon-hover-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ${iconChevronRight()}
            </button>
          ` : nothing}
        </div>

        <!-- ── Right group: download + menu ──────────────────────────────── -->
        <div class="flex items-center gap-1">
          <button
            @click=${() => this._emit('DOWNLOAD')}
            title="Download PDF"
            aria-label="Download PDF"
            style="border-radius:var(--pdf-button-radius);"
            class="p-1.5 hover:bg-[var(--pdf-header-icon-hover-bg)] transition-colors"
          >
            ${iconDownload()}
          </button>

          <button
            @click=${() => this._emit('TOGGLE_MENU')}
            title="More options"
            aria-label="Open side menu"
            style="border-radius:var(--pdf-button-radius);"
            class="p-1.5 hover:bg-[var(--pdf-header-icon-hover-bg)] transition-colors"
          >
            ${iconMenu()}
          </button>
        </div>
      </header>
    `;
  }
}

// ── Inline SVG icons ─────────────────────────────────────────────────────────
function iconMinus() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    width="18" height="18" style="color:var(--pdf-header-icon)">
    <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zM8 11h6"/>
  </svg>`;
}

function iconPlus() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    width="18" height="18" style="color:var(--pdf-header-icon)">
    <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zM11 8v6M8 11h6"/>
  </svg>`;
}

function iconRotate() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    width="18" height="18" style="color:var(--pdf-header-icon)">
    <path d="M16 2l4 4-4 4"/>
    <path d="M20 6H8a6 6 0 0 0-6 6v0a6 6 0 0 0 6 6h8"/>
  </svg>`;
}

function iconChevronLeft() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    width="18" height="18" style="color:var(--pdf-header-icon)">
    <path d="M15 18l-6-6 6-6"/>
  </svg>`;
}

function iconChevronRight() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    width="18" height="18" style="color:var(--pdf-header-icon)">
    <path d="M9 18l6-6-6-6"/>
  </svg>`;
}

function iconDownload() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    width="18" height="18" style="color:var(--pdf-header-icon)">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>`;
}

function iconMenu() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    width="18" height="18" style="color:var(--pdf-header-icon)">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>`;
}
