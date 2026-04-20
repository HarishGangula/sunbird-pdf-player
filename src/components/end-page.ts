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

  private get _progress(): number {
    if (!this.totalPages) return 100;
    return Math.round((this.pagesRead / this.totalPages) * 100);
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

          <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div class="bg-green-500 h-2.5 rounded-full" style="width: ${this._progress}%"></div>
          </div>

          <div class="grid grid-cols-3 gap-4 mb-8">
            ${this._stat('Pages Read', `${this.pagesRead}/${this.totalPages}`)}
            ${this._stat('Progress', `${this._progress}%`)}
            ${this._stat('Time Spent', this.timeSpentLabel || '—')}
          </div>

          <div class="flex gap-4">
            <button
              @click=${() => this._emit('REPLAY')}
              aria-label="Replay from beginning"
              class="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 text-lg font-semibold rounded-full"
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
                class="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 text-lg font-semibold rounded-full"
                style="border: 2px solid var(--pdf-primary);color:var(--pdf-primary);"
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

  private _stat(label: string, value: string) {
    return html`
      <div>
        <p class="text-sm font-medium" style="color:var(--pdf-header-icon);">${label}</p>
        <p class="text-2xl font-bold" style="color:var(--pdf-header-text);">${value}</p>
      </div>
    `;
  }
}