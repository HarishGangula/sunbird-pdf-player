import { LitElement, html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
// Import only types — erased at build time, no static analysis of pdfjs-dist by Rollup
import type { PDFDocumentProxy } from 'pdfjs-dist';

const ZOOM_MIN = 50;
const ZOOM_MAX = 300;
const BUFFER_PAGES = 2; // pages above and below viewport to pre-render

// Module-level cache so pdfjs-dist is loaded only once across all component instances
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pdfjsLib: any = null;

async function getPdfjs() {
  if (!_pdfjsLib) {
    // Dynamic import avoids Rollup's static analysis of the webpack-bundled ESM in
    // pdfjs-dist/build/pdf.mjs, which would otherwise tree-shake GlobalWorkerOptions
    // and getDocument to (void 0) due to MISSING_EXPORT analysis failures.
    _pdfjsLib = await import(/* @vite-ignore */ 'pdfjs-dist');
    _pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).href;
  }
  return _pdfjsLib;
}

@customElement('pdf-viewer')
export class PdfViewer extends LitElement {
  // ── Props ────────────────────────────────────────────────────────────────
  @property({ type: String }) src = '';
  /** 100 = 100% of fit-to-width scale. Values are relative to fit-width. */
  @property({ type: Number }) zoom = 100;
  @property({ type: Number }) rotation = 0;
  @property({ type: Number }) initialPage = 1;

  // ── Internal state ───────────────────────────────────────────────────────
  @state() private _loading = false;

  @query('#viewer-container') private _container!: HTMLDivElement;

  private _pdf: PDFDocumentProxy | null = null;
  private _pagesCount = 0;
  private _fitWidthScale = 1; // scale at which page width === container width
  private _renderedPages: Set<number> = new Set();
  private _pageHeights: number[] = []; // pixel height of each page at current scale
  private _intersectionObs: IntersectionObserver | null = null;
  private _resizeObs: ResizeObserver | null = null;
  private _scrollRafId: number | null = null;
  private _touchStartX = 0;
  private _touchStartY = 0;
  private _currentPage = 1;
  private _endFired = false;

  // ── Styles ───────────────────────────────────────────────────────────────
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    #viewer-container {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      background-color: var(--pdf-bg, #525659);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 0 32px;
      box-sizing: border-box;
      scroll-behavior: smooth;
    }
    #viewer-container::-webkit-scrollbar { width: 8px; }
    #viewer-container::-webkit-scrollbar-track { background: transparent; }
    #viewer-container::-webkit-scrollbar-thumb {
      background-color: rgba(255,255,255,0.25);
      border-radius: 4px;
    }
    #viewer-container::-webkit-scrollbar-thumb:hover {
      background-color: rgba(255,255,255,0.45);
    }
    .page-wrapper {
      position: relative;
      margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      background-color: #fff;
      /* width/height set dynamically in JS */
    }
    canvas {
      display: block;
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    canvas.loaded {
      opacity: 1;
    }
    .page-placeholder {
      background-color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      font-size: 14px;
    }
  `;

  // ── Lifecycle ────────────────────────────────────────────────────────────
  protected updated(changed: Map<string, unknown>) {
    if (changed.has('src') && this.src) {
      this._loadDocument();
    }
    if ((changed.has('zoom') || changed.has('rotation')) && this._pdf) {
      this._onZoomOrRotationChange();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._intersectionObs?.disconnect();
    this._resizeObs?.disconnect();
    if (this._scrollRafId !== null) cancelAnimationFrame(this._scrollRafId);
  }

  // ── Public API ───────────────────────────────────────────────────────────
  public navigateToPage(pageNo: number) {
    const clamped = Math.max(1, Math.min(pageNo, this._pagesCount));
    const wrapper = this._container?.querySelector<HTMLElement>(`#page-${clamped}`);
    if (!wrapper) return;
    // Immediately render it so it's visible when scrolled to
    this._renderPageOntoWrapper(clamped, wrapper);
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  public clampedZoom(delta: number): number {
    return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.zoom + delta));
  }

  // ── Document loading ─────────────────────────────────────────────────────
  private async _loadDocument() {
    this._loading = true;
    this._renderedPages.clear();
    this._endFired = false;
    this._intersectionObs?.disconnect();
    this._resizeObs?.disconnect();

    this._emit('progress', 5);

    try {
      const pdfjsLib = await getPdfjs();
      const loadingTask = pdfjsLib.getDocument(this.src);
      loadingTask.onProgress = (p: { loaded: number; total: number }) => {
        if (p.total > 0) {
          this._emit('progress', Math.round((p.loaded / p.total) * 90));
        }
      };

      this._pdf = await loadingTask.promise;
      this._pagesCount = this._pdf!.numPages;

      await this._computeLayout();
      this._buildPlaceholders();
      this._setupIntersectionObserver();
      this._setupResizeObserver();
      this._setupScrollHandler();
      this._setupTouchHandlers();

      this._emit('progress', 100);
      this._emit('pagesloaded', { pagesCount: this._pagesCount });

      // Jump to initial page (after placeholders are in DOM)
      await this.updateComplete;
      if (this.initialPage > 1) {
        this.navigateToPage(this.initialPage);
      }
    } catch (err) {
      this._emit('error', err);
    } finally {
      this._loading = false;
    }
  }

  // ── Layout computation ───────────────────────────────────────────────────
  /**
   * Renders page 1 to measure its natural dimensions, then computes
   * _fitWidthScale and _pageHeights for all pages at the current zoom level.
   */
  private async _computeLayout() {
    if (!this._pdf) return;
    const containerWidth = this._container?.clientWidth || 800;

    const firstPage = await this._pdf.getPage(1);
    const naturalViewport = firstPage.getViewport({ scale: 1, rotation: this.rotation });
    this._fitWidthScale = (containerWidth - 32) / naturalViewport.width; // 16px padding each side

    this._pageHeights = [];
    // Compute heights for all pages (fast — no canvas rendering)
    for (let i = 1; i <= this._pagesCount; i++) {
      const page = await this._pdf.getPage(i);
      const vp = page.getViewport({ scale: this._effectiveScale, rotation: this.rotation });
      this._pageHeights[i] = vp.height;
    }
  }

  private get _effectiveScale(): number {
    return this._fitWidthScale * (this.zoom / 100);
  }

  // ── DOM scaffold ─────────────────────────────────────────────────────────
  private _buildPlaceholders() {
    const container = this._container;
    if (!container) return;
    container.innerHTML = '';

    for (let i = 1; i <= this._pagesCount; i++) {
      const wrapper = document.createElement('div');
      wrapper.id = `page-${i}`;
      wrapper.className = 'page-wrapper page-placeholder';
      wrapper.dataset.page = String(i);
      const h = this._pageHeights[i] || 1100;
      const containerWidth = container.clientWidth || 800;
      const w = Math.min(containerWidth - 32, containerWidth);
      wrapper.style.width = `${w}px`;
      wrapper.style.height = `${h}px`;
      container.appendChild(wrapper);
    }
  }

  // ── IntersectionObserver ─────────────────────────────────────────────────
  private _setupIntersectionObserver() {
    this._intersectionObs?.disconnect();

    this._intersectionObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const wrapper = entry.target as HTMLElement;
          const pageNo = Number(wrapper.dataset.page);
          if (entry.isIntersecting) {
            this._renderPageOntoWrapper(pageNo, wrapper);
            // Render buffer pages ahead/behind
            for (let b = 1; b <= BUFFER_PAGES; b++) {
              const prevEl = this._container?.querySelector<HTMLElement>(`#page-${pageNo - b}`);
              const nextEl = this._container?.querySelector<HTMLElement>(`#page-${pageNo + b}`);
              if (prevEl && !this._renderedPages.has(pageNo - b)) {
                this._renderPageOntoWrapper(pageNo - b, prevEl);
              }
              if (nextEl && !this._renderedPages.has(pageNo + b)) {
                this._renderPageOntoWrapper(pageNo + b, nextEl);
              }
            }
            // Check if this is the last page — fire pageend
            if (pageNo === this._pagesCount && !this._endFired) {
              this._endFired = true;
              this._emit('pageend', null);
            }
          }
        });
      },
      {
        root: this._container,
        rootMargin: '200px 0px',
        threshold: 0.01,
      }
    );

    this._container?.querySelectorAll<HTMLElement>('.page-wrapper').forEach((el) => {
      this._intersectionObs!.observe(el);
    });
  }

  // ── Render a single page canvas ──────────────────────────────────────────
  private async _renderPageOntoWrapper(pageNo: number, wrapper: HTMLElement) {
    if (!this._pdf || this._renderedPages.has(pageNo)) return;
    if (pageNo < 1 || pageNo > this._pagesCount) return;
    this._renderedPages.add(pageNo);

    try {
      const page = await this._pdf.getPage(pageNo);
      const viewport = page.getViewport({ scale: this._effectiveScale, rotation: this.rotation });

      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-page-canvas';
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      wrapper.innerHTML = '';
      wrapper.classList.remove('page-placeholder');
      wrapper.style.width = `${viewport.width}px`;
      wrapper.style.height = `${viewport.height}px`;
      wrapper.appendChild(canvas);

      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      canvas.classList.add('loaded');
    } catch {
      // Page render failed — leave placeholder
      this._renderedPages.delete(pageNo);
    }
  }

  // ── Re-render on zoom/rotation change ───────────────────────────────────
  private async _onZoomOrRotationChange() {
    if (!this._pdf) return;
    const previousPages = new Set(this._renderedPages);
    this._renderedPages.clear();
    this._endFired = false;

    await this._computeLayout();

    // Re-render pages that were previously visible
    for (const pageNo of previousPages) {
      const wrapper = this._container?.querySelector<HTMLElement>(`#page-${pageNo}`);
      if (wrapper) {
        wrapper.innerHTML = '';
        wrapper.classList.add('page-placeholder');
        await this._renderPageOntoWrapper(pageNo, wrapper);
      }
    }

    // Update placeholders for non-rendered pages
    this._container?.querySelectorAll<HTMLElement>('.page-wrapper').forEach((wrapper) => {
      const pageNo = Number(wrapper.dataset.page);
      if (!previousPages.has(pageNo)) {
        const h = this._pageHeights[pageNo] || 1100;
        const containerWidth = this._container?.clientWidth || 800;
        const w = Math.min(containerWidth - 32, containerWidth);
        wrapper.style.width = `${w}px`;
        wrapper.style.height = `${h}px`;
      }
    });
  }

  // ── Scroll tracking ──────────────────────────────────────────────────────
  private _setupScrollHandler() {
    this._container?.addEventListener('scroll', this._onScroll, { passive: true });
  }

  private _onScroll = () => {
    if (this._scrollRafId !== null) return;
    this._scrollRafId = requestAnimationFrame(() => {
      this._scrollRafId = null;
      this._updateCurrentPage();
    });
  };

  private _updateCurrentPage() {
    const container = this._container;
    if (!container) return;

    const scrollMid = container.scrollTop + container.clientHeight / 2;
    const wrappers = container.querySelectorAll<HTMLElement>('.page-wrapper');
    let activePage = 1;

    wrappers.forEach((el) => {
      if (el.offsetTop <= scrollMid) {
        activePage = Number(el.dataset.page);
      }
    });

    if (activePage !== this._currentPage) {
      this._currentPage = activePage;
      this._emit('pagechanging', { pageNumber: activePage });
    }
  }

  // ── ResizeObserver — recompute layout on container resize ────────────────
  private _setupResizeObserver() {
    this._resizeObs = new ResizeObserver(() => {
      if (this._pdf) {
        this._onZoomOrRotationChange();
      }
    });
    if (this._container) this._resizeObs.observe(this._container);
  }

  // ── Touch / swipe ────────────────────────────────────────────────────────
  private _setupTouchHandlers() {
    const el = this._container;
    if (!el) return;
    el.addEventListener('touchstart', this._onTouchStart, { passive: true });
    el.addEventListener('touchend', this._onTouchEnd, { passive: true });
  }

  private _onTouchStart = (e: TouchEvent) => {
    this._touchStartX = e.touches[0].clientX;
    this._touchStartY = e.touches[0].clientY;
  };

  private _onTouchEnd = (e: TouchEvent) => {
    const dx = e.changedTouches[0].clientX - this._touchStartX;
    const dy = e.changedTouches[0].clientY - this._touchStartY;
    // Horizontal swipe (at least 60px) with less vertical movement
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      this._emit('swipe', dx < 0 ? 'left' : 'right');
    }
  };

  // ── Event helper ─────────────────────────────────────────────────────────
  private _emit(type: string, data: unknown) {
    this.dispatchEvent(
      new CustomEvent('viewerEvent', {
        detail: { type, data },
        bubbles: false,
        composed: false,
      })
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  render() {
    return html`
      <div id="viewer-container" role="document" aria-label="PDF document viewer">
        ${this._loading ? html`
          <div style="color:#9ca3af;margin-top:40px;font-size:14px;">
            Loading…
          </div>
        ` : ''}
      </div>
    `;
  }
}
