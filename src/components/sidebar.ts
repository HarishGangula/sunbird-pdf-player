import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { SideMenuConfig } from '../interfaces';

/**
 * Slide-in side menu panel with share, download, print, replay, exit.
 * All items are config-driven via sideMenuConfig.
 */
@customElement('sb-player-sidebar')
export class Sidebar extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: Object }) sideMenuConfig: SideMenuConfig = {};
  @property({ type: String }) pdfUrl = '';
  @property({ type: String }) contentName = '';

  createRenderRoot() { return this; }

  private _emit(type: string) {
    this.dispatchEvent(
      new CustomEvent('actions', {
        detail: { type },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handlePrint() {
    this._emit('PRINT');
    if (!this.pdfUrl) return;
    // Open PDF in a new window and trigger print
    const printWin = window.open(this.pdfUrl, '_blank', 'noopener');
    if (printWin) {
      printWin.onload = () => printWin.print();
    }
  }

  render() {
    const cfg = this.sideMenuConfig;
    const showPrint    = cfg.showPrint    !== false;
    const showReplay   = cfg.showReplay   !== false;
    const showExit     = cfg.showExit     === true; // off by default

    return html`
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-20 transition-opacity duration-200 ${this.open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}"
        style="background:rgba(0,0,0,0.4);"
        @click=${() => this._emit('CLOSE_MENU')}
        aria-hidden="true"
      ></div>

      <!-- Panel -->
      <aside
        role="dialog"
        aria-label="Player options"
        aria-modal="true"
        style="background:var(--pdf-sidebar-bg);color:var(--pdf-sidebar-text);border-left:1px solid var(--pdf-sidebar-border);"
        class="fixed top-0 right-0 h-full w-64 z-30 flex flex-col shadow-2xl transition-transform duration-200 ${this.open ? 'translate-x-0' : 'translate-x-full'}"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-4 py-3 border-b"
          style="border-color:var(--pdf-sidebar-border);"
        >
          <span class="font-semibold text-sm">Options</span>
          <button
            @click=${() => this._emit('CLOSE_MENU')}
            aria-label="Close menu"
            style="border-radius:var(--pdf-button-radius);"
            class="p-1 hover:bg-[var(--pdf-sidebar-item-hover)] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              width="18" height="18" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Menu items -->
        <nav class="flex-1 overflow-y-auto py-2">
          ${showPrint ? this._menuItem('Print', 'PRINT', this._handlePrint.bind(this), iconPrint()) : nothing}

          ${(showReplay || showExit) ? html`
            <div class="my-2 border-t" style="border-color:var(--pdf-sidebar-border);"></div>
          ` : nothing}

          ${showReplay ? this._menuItem('Replay', 'REPLAY', () => this._emit('REPLAY'), iconReplay()) : nothing}
          ${showExit ? this._menuItem('Exit', 'EXIT', () => this._emit('EXIT'), iconExit(), true) : nothing}
        </nav>
      </aside>
    `;
  }

  private _menuItem(
    label: string,
    _key: string,
    handler: () => void,
    icon: unknown,
    danger = false
  ) {
    return html`
      <button
        @click=${handler}
        class="flex items-center gap-3 w-full px-4 py-3 text-sm text-left transition-colors hover:bg-[var(--pdf-sidebar-item-hover)]"
        style="${danger ? 'color:#ef4444;' : ''}"
        aria-label=${label}
      >
        ${icon}
        <span>${label}</span>
      </button>
    `;
  }
}

// ── Icons ────────────────────────────────────────────────────────────────────
function iconPrint() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    width="18" height="18" aria-hidden="true">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>`;
}

function iconReplay() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    width="18" height="18" aria-hidden="true">
    <path d="M1 4v6h6"/>
    <path d="M3.51 15a9 9 0 1 0 .49-5"/>
  </svg>`;
}

function iconExit() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    width="18" height="18" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>`;
}
