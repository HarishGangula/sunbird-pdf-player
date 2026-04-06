# Sunbird PDF Player

A lightweight, framework-agnostic **web component** for rendering PDF content on Sunbird consumption platforms — web portal, mobile app (WebView), offline desktop app, React, Vue, Angular, or any plain-HTML page.

Built with [Lit](https://lit.dev/), [PDF.js](https://mozilla.github.io/pdf.js/), and [Tailwind CSS](https://tailwindcss.com/). No Angular, no heavy framework — just a single ES module you drop in.

---

## Table of contents

- [Features](#features)
- [Quick start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
  - [Plain HTML / Vanilla JS](#plain-html--vanilla-js)
  - [Angular](#angular)
  - [React](#react)
  - [Mobile app (WebView)](#mobile-app-webview)
- [Player configuration](#player-configuration)
  - [Full config reference](#full-config-reference)
  - [Metadata](#metadata)
  - [Telemetry context](#telemetry-context)
  - [Toolbar config](#toolbar-config)
  - [Side menu config](#side-menu-config)
- [Outputs](#outputs)
  - [playerEvent](#playerevent)
  - [telemetryEvent](#telemetryevent)
- [External actions](#external-actions)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Theming with CSS custom properties](#theming-with-css-custom-properties)
- [Development](#development)
- [Release process](#release-process)
- [CI / CD](#ci--cd)

---

## Features

- **Virtual rendering** — only visible pages (+ 2-page buffer) are rendered as canvases. Smooth performance on 500-page documents.
- **Fit-to-width zoom** by default; user-adjustable from 50 % to 300 %
- **Responsive** — works on any screen size; collapses controls on mobile
- **Touch / swipe** — horizontal swipe triggers next/previous page
- **Full keyboard navigation** — Arrow keys, Page Up/Down, +/−, Escape
- **Config-driven toolbar** — show/hide zoom, rotate, page input, prev/next
- **Side menu** — share, download, print, replay, exit (all individually togglable)
- **CSS custom-property theming** — override colours from a parent portal or WebView without touching the component source
- **Full telemetry** — start, end, impression, interact, heartbeat, error events via Sunbird Telemetry SDK
- **PDF.js worker bundled locally** — no CDN dependency, works offline

---

## Quick start

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="https://unpkg.com/@project-sunbird/sunbird-pdf-player/dist/style.css">
</head>
<body>
  <sunbird-pdf-player id="player" style="display:block;width:100%;height:100vh;"></sunbird-pdf-player>

  <script type="module" src="https://unpkg.com/@project-sunbird/sunbird-pdf-player/dist/sunbird-pdf-player.js"></script>
  <script>
    document.getElementById('player').playerConfig = {
      metadata: {
        identifier: 'my-doc-001',
        name: 'My Document',
        artifactUrl: 'https://example.com/my-document.pdf'
      }
    };
  </script>
</body>
</html>
```

---

## Installation

```bash
npm install @project-sunbird/sunbird-pdf-player
```

Or use a CDN directly (no install required):

```html
<!-- ES module (modern browsers) -->
<script type="module" src="https://unpkg.com/@project-sunbird/sunbird-pdf-player/dist/sunbird-pdf-player.js"></script>

<!-- UMD (legacy bundlers / CommonJS) -->
<script src="https://unpkg.com/@project-sunbird/sunbird-pdf-player/dist/sunbird-pdf-player.umd.cjs"></script>

<!-- Stylesheet -->
<link rel="stylesheet" href="https://unpkg.com/@project-sunbird/sunbird-pdf-player/dist/style.css">
```

---

## Usage

### Plain HTML / Vanilla JS

```html
<!-- 1. Load the stylesheet -->
<link rel="stylesheet" href="node_modules/@project-sunbird/sunbird-pdf-player/dist/style.css">

<!-- 2. Place the element -->
<sunbird-pdf-player id="pdf-player" style="display:block;width:100%;height:600px;"></sunbird-pdf-player>

<!-- 3. Load the component -->
<script type="module" src="node_modules/@project-sunbird/sunbird-pdf-player/dist/sunbird-pdf-player.js"></script>

<script>
  const player = document.getElementById('pdf-player');

  // Set config via JS property (recommended — accepts a plain object)
  player.playerConfig = {
    context: { /* telemetry context — see below */ },
    config:  { /* toolbar + side menu toggles — see below */ },
    metadata: {
      identifier: 'do_123',
      name:        'Sample PDF',
      artifactUrl: 'https://example.com/sample.pdf'
    }
  };

  // OR set via HTML attribute (must be a JSON string)
  // player.setAttribute('player-config', JSON.stringify(playerConfig));

  // Listen for output events
  player.addEventListener('playerEvent',   (e) => console.log(e.detail));
  player.addEventListener('telemetryEvent',(e) => console.log(e.detail));
</script>
```

> **Demo**: open `web-component-demo/index.html` after running `npm run build` — it includes a live event-log panel and a PDF switcher.
> Run the demo: `npm run build && npm run preview` then visit `http://localhost:4173/web-component-demo/`

---

### Angular

Since `sunbird-pdf-player` is a standard web component, no NgModule is needed — just import `CUSTOM_ELEMENTS_SCHEMA`.

**1. Add to `angular.json`**

```json
"styles":  ["node_modules/@project-sunbird/sunbird-pdf-player/dist/style.css"],
"scripts": []
```

**2. Import the element in `main.ts` (or any lazy-loaded module)**

```ts
import '@project-sunbird/sunbird-pdf-player';
```

**3. Allow custom elements in the module**

```ts
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {}
```

**4. Use in template**

```html
<sunbird-pdf-player
  [playerConfig]="playerConfig"
  (playerEvent)="onPlayerEvent($event)"
  (telemetryEvent)="onTelemetryEvent($event)"
  style="display:block;width:100%;height:600px;">
</sunbird-pdf-player>
```

---

### React

```tsx
import '@project-sunbird/sunbird-pdf-player';
import '@project-sunbird/sunbird-pdf-player/dist/style.css';
import { useEffect, useRef } from 'react';

export function PdfPlayer({ config }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.playerConfig = config;
    }
  }, [config]);

  return (
    <sunbird-pdf-player
      ref={ref}
      onPlayerEvent={(e) => console.log(e.detail)}
      style={{ display: 'block', width: '100%', height: '600px' }}
    />
  );
}
```

---

### Mobile app (WebView)

Load the component bundle from your app's local assets or a CDN, then inject the player config from native code after the page loads.

```html
<!-- index.html loaded in the WebView -->
<link rel="stylesheet" href="./assets/sunbird-pdf-player/style.css">
<sunbird-pdf-player id="player" style="display:block;width:100%;height:100vh;"></sunbird-pdf-player>
<script type="module" src="./assets/sunbird-pdf-player/sunbird-pdf-player.js"></script>
```

**Inject config from native (JavaScript bridge)**

```js
// Called from native after WebView finishes loading
function loadContent(configJson) {
  document.getElementById('player').playerConfig = JSON.parse(configJson);
}
```

**Override theme from native CSS injection**

```js
// Inject before (or after) loading the component
const style = document.createElement('style');
style.textContent = `
  sunbird-pdf-player {
    --pdf-primary:    #007bff;
    --pdf-header-bg:  #ffffff;
    --pdf-footer-bg:  #1f2937;
  }
`;
document.head.appendChild(style);
```

---

## Player configuration

Pass a `PlayerConfig` object to the `.playerConfig` property (or as a JSON string to the `player-config` attribute).

### Full config reference

```js
const playerConfig = {
  // ── Telemetry context ────────────────────────────────────────────────────
  context: {
    mode:    'play',                              // 'play' | 'edit' | 'preview'
    sid:     '7283cf2e-d215-9944-b0c5-...',      // User session id
    did:     '3c0a3724311fe944dec5df5...',        // Unique device / browser id
    uid:     'anonymous',                         // Current user id
    channel: '505c7c48ac6dc1edc9b08f21...',      // Channel id
    pdata: {
      id:  'sunbird.portal',                      // Producer id
      ver: '3.2.12',                              // App version
      pid: 'sunbird-portal.contentplayer'         // Component instance (optional)
    },
    contextRollup: { l1: '505c7c48...' },         // Content rollup (optional)
    objectRollup:  {},                            // Object rollup (optional)
    tags:    [],                                  // Device tags (optional)
    cdata:   [],                                  // Correlation data (optional)
    host:    '',                                  // Domain for content loading
    endpoint: '/data/v3/telemetry',               // Telemetry endpoint
    authToken: '',                                // API auth token
    userData: { firstName: 'Guest', lastName: '' }
  },

  // ── Toolbar + side menu toggles ──────────────────────────────────────────
  config: {
    toolBar: {
      showZoomButtons:   true,   // Zoom in / zoom out buttons
      showPagesButton:   true,   // Go-to-page input + page count
      showPagingButtons: true,   // Prev / next page buttons in toolbar
      showRotateButton:  true    // Rotate clockwise button
    },
    sideMenu: {
      showShare:    true,        // Share button (navigator.share / clipboard)
      showDownload: true,        // Download PDF button
      showReplay:   true,        // Replay (restart) button
      showExit:     false,       // Exit button (default: hidden)
      showPrint:    true         // Print button
    },
    startFromPage: 1             // Open on this page number (default: 1)
  },

  // ── Content metadata ─────────────────────────────────────────────────────
  metadata: {
    identifier: 'do_31291455031832576019477',     // Unique content id (required)
    name:        'My PDF Document',               // Display name (required)
    artifactUrl: 'https://example.com/doc.pdf',   // PDF URL (required)
    streamingUrl: '',                             // Alternative streaming URL
    pkgVersion:  1                                // Package version (for telemetry)
  }
};
```

---

### Metadata

| Property | Type | Required | Description |
|---|---|---|---|
| `identifier` | `string` | ✅ | Unique content id — used in all telemetry events |
| `name` | `string` | ✅ | Display name shown in the loading screen and status bar |
| `artifactUrl` | `string` | ✅ | URL of the PDF file to load |
| `streamingUrl` | `string` | — | Alternative URL (e.g. streaming CDN). Used if `artifactUrl` fails |
| `pkgVersion` | `number` | — | Content package version; defaults to `1.0` in telemetry |

---

### Telemetry context

| Property | Type | Default | Description |
|---|---|---|---|
| `channel` | `string` | `'in.sunbird'` | Channel identifier |
| `pdata` | `object` | `{id:'in.sunbird',ver:'1.0'}` | Producer info |
| `sid` | `string` | — | User session id |
| `did` | `string` | — | Device / browser fingerprint |
| `uid` | `string` | `'anonymous'` | User id |
| `authToken` | `string` | `''` | API auth token |
| `mode` | `string` | `'play'` | Playback mode |
| `contextRollup` | `object` | `{}` | Content hierarchy rollup |
| `objectRollup` | `object` | `{}` | Object hierarchy rollup |
| `tags` | `string[]` | `[]` | Device tags for analytics |
| `cdata` | `object[]` | `[]` | Correlation data |
| `host` | `string` | `window.location.origin` | Domain for content loading |
| `endpoint` | `string` | `'/data/v3/telemetry'` | Telemetry endpoint |
| `userData` | `object` | `{firstName:'', lastName:''}` | User display name |

---

### Toolbar config

All fields are optional and default to `true` unless noted.

| Property | Default | Description |
|---|---|---|
| `showZoomButtons` | `true` | Show zoom-out / zoom-level / zoom-in controls |
| `showPagesButton` | `true` | Show go-to-page input and total page count |
| `showPagingButtons` | `true` | Show prev / next page buttons in the toolbar |
| `showRotateButton` | `true` | Show rotate clockwise button |

---

### Side menu config

| Property | Default | Description |
|---|---|---|
| `showShare` | `true` | Share URL via `navigator.share` or copy to clipboard |
| `showDownload` | `true` | Download the PDF file |
| `showPrint` | `true` | Print the PDF |
| `showReplay` | `true` | Restart from page 1 |
| `showExit` | `false` | Exit the player (emits `EXIT` playerEvent) |

---

## Outputs

Both events bubble and are composed (`bubbles: true, composed: true`), so they can be listened to on any ancestor element including `document`.

### playerEvent

```js
player.addEventListener('playerEvent', (e) => {
  const { type, data } = e.detail;
});
```

| `type` | `data` | When |
|---|---|---|
| `START` | `{ duration: number }` | PDF fully loaded, player view shown |
| `PAGE_CHANGE` | `{ pageNumber: number, totalPages: number }` | Visible page changes |
| `END` | `{ duration: number }` | Last page reached, exit clicked, or tab closed |
| `EXIT` | — | User clicks Exit in the side menu |
| `DOWNLOAD` | — | User triggers a download |
| `ERROR` | `{ err, errtype, stacktrace }` | PDF failed to load |

---

### telemetryEvent

Every Sunbird telemetry event dispatched by the SDK is re-emitted as a `telemetryEvent` CustomEvent so the host application can forward it to its own telemetry pipeline.

```js
player.addEventListener('telemetryEvent', (e) => {
  myTelemetryPipeline.dispatch(e.detail); // forward to your backend
});
```

Events fired by the player: `START`, `END`, `IMPRESSION` (per page), `INTERACT` (per button), `HEARTBEAT` (per page change), `ERROR`.

---

## External actions

Control the player programmatically by setting the `action` property:

```js
const player = document.querySelector('sunbird-pdf-player');

player.action = 'NEXT';        // Go to next page
player.action = 'PREVIOUS';    // Go to previous page
player.action = 'ZOOM_IN';     // Increase zoom by 20 %
player.action = 'ZOOM_OUT';    // Decrease zoom by 20 %
player.action = 'ROTATE_CW';   // Rotate 90° clockwise
player.action = 'REPLAY';      // Restart from page 1
player.action = 'EXIT';        // Emit EXIT event and stop
```

---

## Keyboard shortcuts

When the player has focus (or any of its children), these keys are active:

| Key | Action |
|---|---|
| `ArrowRight` / `PageDown` | Next page |
| `ArrowLeft` / `PageUp` | Previous page |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `Escape` | Close the side menu |

---

## Theming with CSS custom properties

The player exposes CSS custom properties for every colour, making it trivial to match your portal or app theme without modifying source files.

```css
sunbird-pdf-player {
  /* Brand */
  --pdf-primary:             #1a73e8;   /* Buttons, active states */
  --pdf-primary-hover:       #1557b0;
  --pdf-primary-text:        #ffffff;   /* Text on primary colour */

  /* Viewer canvas area */
  --pdf-bg:                  #525659;   /* Dark grey background behind pages */

  /* Toolbar */
  --pdf-header-bg:           #ffffff;
  --pdf-header-border:       #e5e7eb;
  --pdf-header-text:         #374151;
  --pdf-header-icon:         #6b7280;
  --pdf-header-icon-hover-bg:#f3f4f6;

  /* Status bar (bottom) */
  --pdf-footer-bg:           #1f2937;
  --pdf-footer-text:         #d1d5db;

  /* Side menu panel */
  --pdf-sidebar-bg:          #ffffff;
  --pdf-sidebar-text:        #374151;
  --pdf-sidebar-border:      #e5e7eb;
  --pdf-sidebar-item-hover:  #f9fafb;

  /* Floating nav arrows */
  --pdf-nav-bg:              rgba(0,0,0,0.25);
  --pdf-nav-bg-hover:        rgba(0,0,0,0.50);
  --pdf-nav-text:            #ffffff;

  /* Start / end / error pages */
  --pdf-page-bg:             #f3f4f6;
  --pdf-card-bg:             #ffffff;

  /* Shared */
  --pdf-button-radius:       0.375rem;
  --pdf-font-family:         inherit;   /* Inherits from parent app automatically */
  --pdf-font-size-sm:        0.875rem;
}
```

**Example — dark theme:**

```css
sunbird-pdf-player {
  --pdf-primary:       #7c3aed;
  --pdf-primary-hover: #6d28d9;
  --pdf-header-bg:     #1e1b4b;
  --pdf-header-text:   #e0e7ff;
  --pdf-header-icon:   #a5b4fc;
  --pdf-footer-bg:     #1e1b4b;
  --pdf-footer-text:   #c7d2fe;
  --pdf-bg:            #0f172a;
}
```

---

## Development

### Prerequisites

Node.js ≥ 18, npm ≥ 9.

### Setup

```bash
git clone https://github.com/HarishGangula/sunbird-pdf-player.git
cd sunbird-pdf-player
npm install
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR at `http://localhost:5173` |
| `npm run build` | TypeScript type-check + production Vite build → `dist/` |
| `npm run preview` | Serve the production build locally for inspection |
| `npm run test:e2e` | Run Playwright E2E tests (requires Chromium — see below) |
| `npm run test:e2e:ui` | Open Playwright UI mode for debugging tests |

### Running E2E tests

```bash
# Install the Chromium browser (once)
npx playwright install chromium

# Run all tests
npm run test:e2e
```

Tests live in `e2e/pdf-player.spec.ts` and cover all player features, responsive viewports, theming, and the I/O contract.

### Project structure

```
sunbird-pdf-player/
├── src/
│   ├── sunbird-pdf-player.ts       # Main component & orchestration
│   ├── interfaces.ts               # TypeScript types (PlayerConfig etc.)
│   ├── index.css                   # Tailwind entry + CSS custom properties
│   ├── components/
│   │   ├── pdf-viewer.ts           # Virtual-rendering PDF canvas (IntersectionObserver)
│   │   ├── header.ts               # Toolbar (config-driven)
│   │   ├── navigation.ts           # Floating prev/next arrows
│   │   ├── sidebar.ts              # Side menu panel
│   │   ├── start-page.ts           # Loading screen with progress
│   │   ├── end-page.ts             # Completion screen
│   │   └── error.ts                # Error screen with retry
│   ├── services/
│   │   └── telemetry-service.ts    # Sunbird Telemetry SDK wrapper
│   └── assets/
│       └── gita.pdf                # Sample PDF for local dev
├── e2e/
│   └── pdf-player.spec.ts          # Playwright E2E tests
├── web-component-demo/
│   └── index.html                  # Demo page (event log + PDF switcher)
├── dist/                           # Production build output (git-ignored)
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── playwright.config.ts
└── package.json
```

---

## Release process

Releases are triggered by pushing a git tag. The tag name becomes the NPM package version (leading `v` is stripped automatically).

```bash
# Tag and push
git tag v1.2.3
git push origin v1.2.3
```

The `publish_web_component` GitHub Actions workflow will then:

1. Type-check and build the project
2. Set `package.json` version from the tag
3. Publish `@project-sunbird/sunbird-pdf-player` to NPM
4. Zip `dist/` and attach it as a downloadable asset to the GitHub Release

**Required repository secret:** `NPM_TOKEN` — a publish-scoped NPM access token.

---

## CI / CD

| Workflow | Trigger | Steps |
|---|---|---|
| `pull_request.yml` | Every pull request | TypeScript check → build → upload artifact → Playwright E2E (Chromium) → upload report |
| `publish_web_component.yml` | Tag push | Build → set version → `npm publish` → zip dist → GitHub Release |
| `jira-description-action.yml` | PR opened / labeled | Auto-populates PR description with Jira issue details |
