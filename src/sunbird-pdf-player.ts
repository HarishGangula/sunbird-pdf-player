import './index.css';
import { LitElement, html, nothing, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import type { PlayerConfig, ToolBarConfig, SideMenuConfig } from './interfaces';
import { telemetryService } from './services/telemetry-service';
import './components/pdf-viewer';
import './components/start-page';
import './components/header';
import './components/navigation';
import './components/sidebar';
import './components/end-page';
import './components/error';
import { PdfViewer } from './components/pdf-viewer';

// ── Default configurations ────────────────────────────────────────────────────
const DEFAULT_TOOLBAR: ToolBarConfig = {
  showZoomButtons: true,
  showPagesButton: true,
  showPagingButtons: true,
  showSearchButton: false,
  showRotateButton: true,
};

const DEFAULT_SIDEMENU: SideMenuConfig = {
  showShare: true,
  showDownload: true,
  showReplay: true,
  showExit: false,
  showPrint: true,
};

@customElement('sunbird-pdf-player')
export class SunbirdPdfPlayer extends LitElement {
  // ── Public inputs ────────────────────────────────────────────────────────
  /**
   * Main player configuration. Accepts a PlayerConfig object or a JSON string
   * (useful when setting via HTML attribute: player-config='{"metadata":…}').
   */
  @property({
    type: Object,
    attribute: 'player-config',
    converter: {
      fromAttribute: (value: string) => {
        if (!value) return undefined;
        try { return JSON.parse(value); } catch { return undefined; }
      },
    },
  })
  playerConfig?: PlayerConfig;

  /**
   * External action trigger — set this attribute/property to fire an action
   * programmatically: 'NEXT', 'PREVIOUS', 'REPLAY', 'EXIT', 'ZOOM_IN', etc.
   */
  @property({ type: String }) action = '';

  // ── View state ───────────────────────────────────────────────────────────
  @state() private _viewState: 'start' | 'player' | 'end' | 'error' = 'start';
  @state() private _loadingProgress = 0;
  @state() private _currentPage = 1;
  @state() private _totalPages = 0;
  @state() private _zoom = 100;
  @state() private _rotation = 0;
  @state() private _errorMessage = '';
  @state() private _showControls = true;
  @state() private _sideMenuOpen = false;
  @state() private _showInvalidPageTooltip = false;

  // ── Session tracking ─────────────────────────────────────────────────────
  private _startTime = 0;
  private _pagesVisited: Set<number> = new Set();
  private _isEndEventRaised = false;
  private _controlsHideTimer: ReturnType<typeof setTimeout> | null = null;
  private _tooltipTimer: ReturnType<typeof setTimeout> | null = null;
  private _isTouchDevice = false;

  @query('pdf-viewer') private _pdfViewer!: PdfViewer;

  // Use light DOM so parent Tailwind/CSS vars cascade in
  createRenderRoot() { return this; }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  connectedCallback() {
    super.connectedCallback();
    this._isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    window.addEventListener('beforeunload', this._handleBeforeUnload);
    document.addEventListener('keydown', this._handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('beforeunload', this._handleBeforeUnload);
    document.removeEventListener('keydown', this._handleKeyDown);
    if (this._controlsHideTimer) clearTimeout(this._controlsHideTimer);
    if (this._tooltipTimer) clearTimeout(this._tooltipTimer);
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('playerConfig') && this.playerConfig) {
      this._initialize();
    }
    if (changed.has('action') && this.action) {
      this._handleExternalAction(this.action);
    }
  }

  // ── Initialization ───────────────────────────────────────────────────────
  private _initialize() {
    if (!this.playerConfig) return;

    this._startTime = Date.now();
    this._pagesVisited = new Set();
    this._isEndEventRaised = false;
    this._sideMenuOpen = false;
    this._viewState = 'start';
    this._loadingProgress = 0;
    this._currentPage = this.playerConfig.config?.startFromPage || 1;
    this._zoom = this.playerConfig.config?.zoom || 100;
    this._rotation = this.playerConfig.config?.rotation || 0;

    telemetryService.initialize(this.playerConfig, (event) => {
      this._dispatchEvent('telemetryEvent', event);
    });
  }

  // ── Viewer events (from pdf-viewer component) ────────────────────────────
  private _handleViewerEvent(e: CustomEvent) {
    const { type, data } = e.detail;

    switch (type) {
      case 'progress':
        this._loadingProgress = data as number;
        break;

      case 'pagesloaded':
        this._totalPages = (data as { pagesCount: number }).pagesCount;
        this._viewState = 'player';
        this._raiseStartEvent();
        break;

      case 'pagechanging': {
        const pageNumber = (data as { pageNumber: number }).pageNumber;
        this._currentPage = pageNumber;
        this._pagesVisited.add(pageNumber);
        telemetryService.impression(pageNumber);
        telemetryService.heartbeat({ type: 'PAGE_CHANGE', currentPage: pageNumber });
        this._dispatchEvent('playerEvent', {
          type: 'PAGE_CHANGE',
          data: { pageNumber, totalPages: this._totalPages },
        });
        break;
      }

      case 'pageend':
        this._showEndPage();
        break;

      case 'swipe':
        // Touch swipe from pdf-viewer — translate to page navigation
        if (data === 'left') {
          this._navigate('NEXT');
        } else {
          this._navigate('PREVIOUS');
        }
        break;

      case 'error': {
        this._viewState = 'error';
        const err = data as Error;
        this._errorMessage = err?.message || err?.toString() || 'Unknown error';
        telemetryService.error(err, { err: 'CONTENT_LOAD_FAILED', errtype: 'CONTENT' });
        this._dispatchEvent('playerEvent', {
          type: 'ERROR',
          data: { err: 'CONTENT_LOAD_FAILED', errtype: 'CONTENT', stacktrace: this._errorMessage },
        });
        break;
      }
    }
  }

  // ── Action routing (header, navigation, sidebar, end-page, error) ────────
  private _handleAction(e: CustomEvent) {
    const { type, data } = e.detail as { type: string; data?: unknown };
    this._routeAction(type, data);
  }

  private _routeAction(type: string, data?: unknown) {
    telemetryService.interact(type, this._currentPage);

    switch (type) {
      case 'NEXT':
        this._navigate('NEXT');
        break;
      case 'PREVIOUS':
        this._navigate('PREVIOUS');
        break;
      case 'ZOOM_IN':
        this._zoom = Math.min(this._zoom + 20, 300);
        break;
      case 'ZOOM_OUT':
        this._zoom = Math.max(this._zoom - 20, 50);
        break;
      case 'ROTATE_CW':
        this._rotation = (this._rotation + 90) % 360;
        break;
      case 'NAVIGATE_TO_PAGE': {
        const page = Number(data);
        if (page >= 1 && page <= this._totalPages) {
          this._pdfViewer?.navigateToPage(page);
        } else {
          this._showInvalidPage();
        }
        break;
      }
      case 'DOWNLOAD':
        this._downloadPdf();
        break;
      case 'TOGGLE_MENU':
        this._sideMenuOpen = !this._sideMenuOpen;
        telemetryService.interact(this._sideMenuOpen ? 'OPEN_MENU' : 'CLOSE_MENU', this._currentPage);
        break;
      case 'CLOSE_MENU':
        this._sideMenuOpen = false;
        telemetryService.interact('CLOSE_MENU', this._currentPage);
        break;
      case 'SHARE':
        // Handled inside sidebar — just track telemetry
        break;
      case 'DOWNLOAD_MENU':
        // Handled inside sidebar — telemetry tracked here
        break;
      case 'PRINT':
        // Handled inside sidebar — just track telemetry
        break;
      case 'REPLAY':
        this._initialize();
        break;
      case 'EXIT':
        this._raiseEndEvent();
        this._dispatchEvent('playerEvent', { type: 'EXIT' });
        break;
    }
  }

  // ── Navigation helper ────────────────────────────────────────────────────
  private _navigate(direction: 'NEXT' | 'PREVIOUS') {
    if (direction === 'NEXT') {
      if (this._currentPage < this._totalPages) {
        this._pdfViewer?.navigateToPage(this._currentPage + 1);
      } else {
        this._showEndPage();
      }
    } else {
      if (this._currentPage > 1) {
        this._pdfViewer?.navigateToPage(this._currentPage - 1);
      }
    }
  }

  // ── Events ───────────────────────────────────────────────────────────────
  private _raiseStartEvent() {
    const duration = Date.now() - this._startTime;
    telemetryService.start(duration);
    this._dispatchEvent('playerEvent', { type: 'START', data: { duration } });
  }

  private _raiseEndEvent() {
    if (this._isEndEventRaised) return;
    this._isEndEventRaised = true;
    const duration = Date.now() - this._startTime;
    telemetryService.end(
      duration,
      this._currentPage,
      this._totalPages,
      this._pagesVisited.size,
      true
    );
    this._dispatchEvent('playerEvent', { type: 'END', data: { duration } });
  }

  private _showEndPage() {
    if (this._isEndEventRaised) return;
    this._viewState = 'end';
    this._raiseEndEvent();
  }

  private _downloadPdf() {
    const url = this.playerConfig?.metadata.artifactUrl;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.playerConfig?.metadata.name || 'document'}.pdf`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
    this._dispatchEvent('playerEvent', { type: 'DOWNLOAD' });
  }

  private _dispatchEvent(name: string, detail: unknown) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }

  // ── External action input ────────────────────────────────────────────────
  private _handleExternalAction(action: string) {
    if (!action) return;
    this._routeAction(action);
  }

  // ── Keyboard navigation ──────────────────────────────────────────────────
  private _handleKeyDown = (e: KeyboardEvent) => {
    // Only handle when viewer is active
    if (this._viewState !== 'player') return;
    // Don't steal events from inputs
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
        e.preventDefault();
        this._navigate('NEXT');
        break;
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault();
        this._navigate('PREVIOUS');
        break;
      case 'Escape':
        if (this._sideMenuOpen) {
          this._sideMenuOpen = false;
        }
        break;
      case '+':
      case '=':
        this._zoom = Math.min(this._zoom + 20, 300);
        break;
      case '-':
        this._zoom = Math.max(this._zoom - 20, 50);
        break;
    }
  };

  // ── Window beforeunload ──────────────────────────────────────────────────
  private _handleBeforeUnload = () => {
    if (this._viewState === 'player') {
      this._raiseEndEvent();
    }
  };

  // ── Controls visibility ──────────────────────────────────────────────────
  private _handleMouseEnter() {
    this._showControls = true;
    if (this._controlsHideTimer) clearTimeout(this._controlsHideTimer);
  }

  private _handleMouseLeave() {
    this._controlsHideTimer = setTimeout(() => {
      this._showControls = false;
    }, 800);
  }

  private _handleTap() {
    if (!this._isTouchDevice) return;
    this._showControls = true;
    if (this._controlsHideTimer) clearTimeout(this._controlsHideTimer);
    this._controlsHideTimer = setTimeout(() => {
      this._showControls = false;
    }, 3000);
  }

  // ── Invalid page tooltip ─────────────────────────────────────────────────
  private _showInvalidPage() {
    this._showInvalidPageTooltip = true;
    if (this._tooltipTimer) clearTimeout(this._tooltipTimer);
    this._tooltipTimer = setTimeout(() => {
      this._showInvalidPageTooltip = false;
    }, 5000);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  private _getTimeSpent(): string {
    const ms = Date.now() - this._startTime;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  private get _toolBarConfig(): ToolBarConfig {
    return { ...DEFAULT_TOOLBAR, ...this.playerConfig?.config?.toolBar };
  }

  private get _sideMenuConfig(): SideMenuConfig {
    return { ...DEFAULT_SIDEMENU, ...this.playerConfig?.config?.sideMenu };
  }

  private get _progressPct(): number {
    if (!this._totalPages) return 0;
    return Math.round((this._currentPage / this._totalPages) * 100);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  render() {
    if (!this.playerConfig && this._viewState !== 'error') {
      return html`
        <div class="flex items-center justify-center h-full text-sm"
          style="background:var(--pdf-page-bg);color:var(--pdf-header-icon);">
          Waiting for configuration…
        </div>
      `;
    }

    const controlsClass = `transition-opacity duration-300 ${this._showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`;

    return html`
      <div
        class="relative w-full h-full flex flex-col overflow-hidden"
        style="background:var(--pdf-bg);font-family:var(--pdf-font-family);"
        @mouseenter=${this._handleMouseEnter}
        @mouseleave=${this._handleMouseLeave}
        @click=${this._handleTap}
        role="application"
        aria-label="PDF Player: ${this.playerConfig?.metadata.name || ''}"
      >
        <!-- ── Start page ───────────────────────────────────────────────── -->
        ${this._viewState === 'start' ? html`
          <sb-player-start-page
            .title=${this.playerConfig?.metadata.name || ''}
            .progress=${this._loadingProgress}
          ></sb-player-start-page>
        ` : nothing}

        <!-- ── Player view ─────────────────────────────────────────────── -->
        ${this._viewState === 'player' || this._viewState === 'start' ? html`
          <!-- Header toolbar (hidden during start page but kept for smooth transition) -->
          ${this._viewState === 'player' ? html`
            <div class=${controlsClass}>
              <sb-player-header
                .pageNumber=${this._currentPage}
                .totalPages=${this._totalPages}
                .zoom=${this._zoom}
                .toolBarConfig=${this._toolBarConfig}
                @actions=${this._handleAction}
              ></sb-player-header>
            </div>
          ` : nothing}

          <!-- PDF canvas area -->
          <div class="flex-1 relative overflow-hidden ${this._viewState === 'player' ? '' : 'invisible'}">
            <pdf-viewer
              .src=${this.playerConfig?.metadata.artifactUrl || ''}
              .zoom=${this._zoom}
              .rotation=${this._rotation}
              .initialPage=${this._currentPage}
              @viewerEvent=${this._handleViewerEvent}
            ></pdf-viewer>

            <!-- Side navigation arrows -->
            ${this._viewState === 'player' ? html`
              <div class="absolute inset-0 pointer-events-none ${controlsClass}">
                <sb-player-navigation
                  class="pointer-events-none"
                  .pageNumber=${this._currentPage}
                  .totalPages=${this._totalPages}
                  @actions=${this._handleAction}
                ></sb-player-navigation>
              </div>
            ` : nothing}

            <!-- Invalid page tooltip -->
            ${this._showInvalidPageTooltip ? html`
              <div
                class="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-xs font-medium z-50 shadow-lg"
                style="background:#1f2937;color:#f9fafb;"
                role="alert"
                aria-live="assertive"
              >
                ⚠ Page not found
              </div>
            ` : nothing}
          </div>

          <!-- Status bar -->
          ${this._viewState === 'player' ? html`
            <div
              class="flex items-center justify-between px-4 py-1 text-xs shrink-0"
              style="background:var(--pdf-footer-bg);color:var(--pdf-footer-text);"
              aria-live="polite"
              aria-label="Page ${this._currentPage} of ${this._totalPages}, ${this._progressPct}%"
            >
              <span class="truncate max-w-[60%]">
                ${this.playerConfig?.metadata.name || ''}
              </span>
              <span class="shrink-0 ml-2 font-medium">
                Page ${this._currentPage} of ${this._totalPages} &mdash; ${this._progressPct}%
              </span>
            </div>
          ` : nothing}
        ` : nothing}

        <!-- ── End page ────────────────────────────────────────────────── -->
        ${this._viewState === 'end' ? html`
          <sb-player-end-page
            .contentName=${this.playerConfig?.metadata.name || ''}
            .userName=${this.playerConfig?.context?.userData?.firstName || ''}
            .pagesRead=${this._pagesVisited.size}
            .totalPages=${this._totalPages}
            .timeSpentLabel=${this._getTimeSpent()}
            .showExit=${this._sideMenuConfig.showExit ?? false}
            @actions=${this._handleAction}
          ></sb-player-end-page>
        ` : nothing}

        <!-- ── Error page ──────────────────────────────────────────────── -->
        ${this._viewState === 'error' ? html`
          <sb-player-error
            .message=${this._errorMessage}
            @actions=${this._handleAction}
          ></sb-player-error>
        ` : nothing}

        <!-- ── Sidebar (overlaid on all states) ────────────────────────── -->
        <sb-player-sidebar
          .open=${this._sideMenuOpen}
          .sideMenuConfig=${this._sideMenuConfig}
          .pdfUrl=${this.playerConfig?.metadata.artifactUrl || ''}
          .contentName=${this.playerConfig?.metadata.name || ''}
          @actions=${this._handleAction}
        ></sb-player-sidebar>
      </div>
    `;
  }
}
