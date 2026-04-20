# Sunbird PDF Player — Agent Guide

## What This Project Is

A **framework-agnostic web component** (`<sunbird-pdf-player>`) that renders PDF files inside Sunbird consumption platforms (web, mobile WebView, React, Angular, Vue, plain HTML). Built with Lit 3, PDF.js 4, Tailwind CSS, and Vite.

---

## Project Structure

```
src/
  sunbird-pdf-player.ts     # Root LitElement component (state, lifecycle, config)
  interfaces.ts             # TypeScript types (PlayerConfig, Metadata, Config, Context)
  index.css                 # Global styles (Tailwind + custom CSS variables)
  components/
    pdf-viewer.ts           # Core rendering — virtual scroll, zoom, rotation
    header.ts               # Toolbar (zoom controls, rotate, page input)
    navigation.ts           # Prev / Next page buttons
    sidebar.ts              # Side menu (share, download, print, replay, exit)
    start-page.ts           # Loading splash screen
    end-page.ts             # Post-playback screen
    error.ts                # Error display
  services/
    telemetry-service.ts    # Sunbird telemetry integration
e2e/
  pdf-player.spec.ts        # Playwright E2E tests
dist/                       # Build output (do not edit)
web-component-demo/         # Live demo HTML
```

---

## Key Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:5173
npm run build        # Type-check + build (ES module + UMD)
npm run preview      # Preview production build
npm run test:e2e     # Run Playwright E2E tests (Chrome + mobile)
npm run test:e2e:ui  # Playwright with interactive UI
```

---

## Architecture Notes

- **No shadow DOM** — component uses light DOM so parent CSS applies directly.
- **PDF.js is external** — not bundled into the component. Vite copies `pdf.mjs` and `pdf.worker.mjs` to `dist/` post-build via a custom plugin in `vite.config.ts`.
- **Virtual rendering** — only visible pages + a 2-page buffer are rendered in the DOM at any time.
- **Config-driven UI** — toolbar buttons and side menu items are toggled via `PlayerConfig.config`.

---

## Component API

### Input

```html
<sunbird-pdf-player id="player"></sunbird-pdf-player>
```

```js
document.getElementById('player').playerConfig = {
  metadata: {
    identifier: 'doc-001',      // required
    name: 'My PDF',              // required
    artifactUrl: '/sample.pdf'   // required — URL to the PDF
  },
  config: {
    toolBar: { showZoomButtons: true, showRotateButton: true },
    sideMenu: { showDownload: true, showPrint: false },
    startFromPage: 1,
    zoom: 100
  },
  context: { /* Sunbird telemetry context */ }
};
```

### Outputs (Custom Events)

| Event | Description |
|-------|-------------|
| `playerEvent` | Player lifecycle events (progress, action, errors) |
| `telemetryEvent` | Sunbird telemetry events (START, END, INTERACT, HEARTBEAT, ERROR) |

### External Actions (set `action` property)

`NEXT`, `PREVIOUS`, `REPLAY`, `ZOOM_IN`, `ZOOM_OUT`, `ROTATE_CW`, `ROTATE_CCW`

---

## TypeScript Types (src/interfaces.ts)

Key interfaces:
- `PlayerConfig` — top-level config object
- `Metadata` — `identifier`, `name`, `artifactUrl` (required); `streamingUrl`, `basePath` (optional)
- `Config` — `toolBar`, `sideMenu`, `startFromPage`, `zoom`, `rotation`
- `ToolBarConfig` — boolean flags for each toolbar button
- `SideMenuConfig` — boolean flags for each menu item
- `Context` — Sunbird telemetry context

---

## Coding Conventions

- **TypeScript strict mode** — all code must type-check (`tsc --noEmit` runs before build).
- **LitElement patterns** — use `@property`, `@state`, `@query` decorators; reactive properties trigger re-renders.
- **Tailwind for layout/spacing** — use utility classes; avoid inline styles except for dynamic values.
- **CSS custom properties** — theming uses `--pdf-player-*` variables defined in `index.css`.
- **No external runtime deps** beyond Lit, PDF.js, and the Sunbird telemetry SDK.

---

## Testing

- E2E tests live in `e2e/pdf-player.spec.ts` — Playwright tests against Chrome and mobile viewports.
- No unit tests currently; all testing is E2E.
- Run `npm run test:e2e` before submitting changes that touch rendering, navigation, or zoom logic.

---

## Build Output

| File | Description |
|------|-------------|
| `dist/sunbird-pdf-player.js` | ES module (primary) |
| `dist/sunbird-pdf-player.umd.cjs` | UMD bundle (legacy bundlers) |
| `dist/assets/style.css` | Compiled Tailwind + component styles |
| `dist/pdf.mjs` | PDF.js ESM |
| `dist/pdf.worker.mjs` | PDF.js worker |
