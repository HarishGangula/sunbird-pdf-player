import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Completion screen shown after the user reaches the last page.
 */
@customElement('sb-player-end-page')
export class EndPage extends LitElement {
  @property({ type: String }) contentName = '';
  @property({ type: String }) userName = '';
  @property({ type: Number }) pagesRead = 0;
  @property({ type: Number }) totalPages = 0;
  @property({ type: String }) timeSpentLabel = '';
  /** Whether to show the exit button (config.sideMenu.showExit) */
  @property({ type: Boolean }) showExit = false;

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

  render() {
    return html`
      <div
        class="flex flex-col md:flex-row items-center justify-center h-full p-6"
        style="background:var(--pdf-page-bg);"
        role="main"
        aria-label="PDF completed"
      >
        <div class="w-full md:w-2/3 text-center md:text-left mb-8 md:mb-0">
          <h2 class="text-4xl font-bold mb-2" style="color:var(--pdf-header-text);">Congratulations!</h2>
          <p class="text-lg mb-4" style="color:var(--pdf-header-icon);">You have successfully completed</p>
          <p class="text-2xl font-semibold mb-6" style="color:var(--pdf-header-text);">${this.contentName}</p>

          <div class="grid grid-cols-2 gap-6 mb-8 max-w-md">
            ${this._stat('Pages Read', `${this.pagesRead}/${this.totalPages}`, iconPagesRead())}
            ${this._stat('Time Spent', this.timeSpentLabel || '—', iconTimeSpent())}
          </div>

          <div class="flex flex-wrap gap-4">
            <button
              @click=${() => this._emit('REPLAY')}
              aria-label="Replay from beginning"
              class="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3.5 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              style="background:var(--pdf-primary);color:var(--pdf-primary-text);"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 12A9 9 0 1 0 12 3a9 9 0 0 0-7 14" />
              </svg>
              Replay
            </button>
            ${this.showExit ? html`
              <button
                @click=${() => this._emit('EXIT')}
                aria-label="Exit player"
                class="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3.5 text-lg font-semibold rounded-full border-2 hover:bg-[rgba(26,115,232,0.05)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                style="border-color:var(--pdf-primary);color:var(--pdf-primary);"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H3" />
                </svg>
                Exit
              </button>
            ` : nothing}
          </div>
        </div>
      </div>
    `;
  }

  private _stat(label: string, value: string, icon: unknown) {
    return html`
      <div
        class="flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 hover:shadow-md"
        style="background:var(--pdf-card-bg);border-color:var(--pdf-header-border);"
      >
        <div class="p-3 rounded-xl" style="background:rgba(26,115,232,0.08);color:var(--pdf-primary);">
          ${icon}
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider" style="color:var(--pdf-header-icon);">${label}</p>
          <p class="text-xl font-bold" style="color:var(--pdf-header-text);">${value}</p>
        </div>
      </div>
    `;
  }
}

// ── Icons for statistics ───────────────────────────────────────────────────
function iconPagesRead() {
  return html`
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  `;
}

function iconTimeSpent() {
  return html`
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  `;
}