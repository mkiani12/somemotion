# Shahin Video Analytics — Interactive Demo

This folder contains the official interactive HTML/ECharts wireframe demo of the **Shahin Video Analytics Dashboard** along with all local runtime assets (`assets/`, `report-builder/`, `events-start/`), ready to run completely offline.

## How to Launch the Demo

> **Important:** Start a local static HTTP server rather than double-clicking the HTML file directly. The active version (`v36.html`) uses the bundled Report Builder calculation engine (`report-builder/v12.html?engine=1`) over a same-origin iframe, which modern browsers restrict under `file://` URLs.

### macOS / Linux
```bash
cd demo
./serve.sh
```
*(Or run `python3 -m http.server 8012` inside the `demo/` folder.)*

### Windows (PowerShell / Command Prompt)
```powershell
cd demo
python -m http.server 8012
```

Then open in your browser:
- **Latest Interactive Demo (`v36`):** http://localhost:8012/ *(redirects automatically to `http://localhost:8012/video-dashboard/v36.html`)*
- **Comparison Variants:** Switch directly from the built-in version switcher bar inside the demo, or open:
  - `http://localhost:8012/video-dashboard/v36.html` — **Active Final Demo (V36)**: full bilingual FA/EN, Dark/Light theme, Report Builder engine bridge on every card, project switching (including locked checklist for projects without video events), global Filters drawer, and interactive single-video detail panel.
  - `http://localhost:8012/video-dashboard/v35.html` — Conversion-mode propagation demo variant.
  - `http://localhost:8012/video-dashboard/v34.html` — Lean technical-KPI variant (without standalone Buffer rate KPI / CDN modal).
  - `http://localhost:8012/video-dashboard/v33.html` — Baseline comparison variant (includes standalone Buffer KPI card, Buffer trend chart, and CDN breakdown modal).

## Included Runtime Directories
- `video-dashboard/` — Interactive demo pages (`index.html`, `v36.html`, `v35.html`, `v34.html`, `v33.html`, `versions.js`)
- `report-builder/` — Bundled Report Builder v12 engine & bridge (`rb-bridge.js`, `v12.html`, `rb-*.js`) powering dynamic per-project metrics and **"Open in Report Builder"** links on every card
- `events-start/` — Onboarding/activation walkthrough linked when switching to a project with no video events (`../events-start/?biz=video`)
- `assets/` — Local ECharts (`echarts.min.js`), Shahin design tokens & components CSS, shell navigation JS, Phosphor icons, brand logos, and `IRANSansXV` + `Roboto` web fonts (zero external CDN required)
