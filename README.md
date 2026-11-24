# Shahin Video Analytics Dashboard — Complete Documentation & Demo Package

This self-contained package brings together everything needed to understand, present, demo, and technically integrate the **Shahin Video Analytics Dashboard**—combining a live production walkthrough with real screenshots, the official business PRD & Help Center docs, deep engineering/API/SDK specifications, and the runnable interactive HTML demo (`v36`).

---

## Quick Start

- **Want a visual walkthrough of the live dashboard?**
  Open [`guide/shahin-video-dashboard-guide.md`](./guide/shahin-video-dashboard-guide.md) *(includes 13 full-resolution screenshots from `my.shahin.live`, every UI interaction, exact metric formulas, and team playbooks).*
- **Want the official product/business PRD and presentation narrative?**
  Open [`business-docs/PRD-Business-Video.md`](./business-docs/PRD-Business-Video.md) and [`business-docs/Help-Center-Video-Analytics.md`](./business-docs/Help-Center-Video-Analytics.md).
- **Want to try the interactive HTML demo offline in your browser?**
  ```bash
  cd demo
  ./serve.sh          # or: python3 -m http.server 8012
  ```
  Then open **http://localhost:8012/** *(auto-redirects to `video-dashboard/v36.html`; see [`demo/README.md`](./demo/README.md) for Windows instructions and version comparison variants `v33`–`v36`).*

---

## Package Contents

### 1. Live Production Guide & Screenshots (`guide/`)
| File / Folder | Description |
| :--- | :--- |
| [`guide/shahin-video-dashboard-guide.md`](./guide/shahin-video-dashboard-guide.md) | Complete end-to-end user & technical guide covering live production (`my.shahin.live`), all 11+ auto-detected players, every card & per-video detail section, full page interactions matrix, live vs. demo (`v36`) comparison, metric formulas, and team playbooks. |
| [`guide/images/`](./guide/images/) | 13 full-resolution PNG screenshots (`01-dashboard-overview.png` through `13-video-detail-bottom-splits.png`) covering every section, drawer, dropdown, trend mode, and expanded Video SEO schema helper. |

### 2. Business & Product Documents (`business-docs/`)
| File | Description |
| :--- | :--- |
| [`business-docs/PRD-Business-Video.md`](./business-docs/PRD-Business-Video.md) | **Primary Business PRD (Final V4)** — Master narrative (*"content vs. technical playback quality"*), 5-zone viewer journey, global filters, bilingual FA/EN tooltips, dropped metrics log, schema notes, out-of-scope boundaries, and Definition of Done. |
| [`business-docs/Help-Center-Video-Analytics.md`](./business-docs/Help-Center-Video-Analytics.md) | Customer-facing Help Center documentation chapter specifically for Video Analytics. |
| [`business-docs/Service-Events-Help-Center.md`](./business-docs/Service-Events-Help-Center.md) | Full Events Service Help Center guide (Domain Packs, activation paths, and shared statistical principles). |
| [`business-docs/03-Event-Catalog.md`](./business-docs/03-Event-Catalog.md) | Predefined Event Catalog including **Pack 1 — Video** event names and properties. |
| [`business-docs/04-Panel-IA-And-Stories.md`](./business-docs/04-Panel-IA-And-Stories.md) | Panel Information Architecture, user stories, and **§8.5 Shared Dashboard Requirements** referenced by the Video PRD. |
| [`business-docs/00-Business-Model.md`](./business-docs/00-Business-Model.md) | Events Service business model and horizontal Video pack positioning (Media & E-commerce). |
| [`business-docs/02-System-Mechanics.md`](./business-docs/02-System-Mechanics.md) | Underlying Events collection mechanics, deduplication, and counting rules. |
| [`business-docs/Events-Service-README.md`](./business-docs/Events-Service-README.md) | Navigation map for the Events Service product documentation suite. |
| [`business-docs/33-shahin-dashboards-bridge-inventory.md`](./business-docs/33-shahin-dashboards-bridge-inventory.md) | Inventory mapping ready-made dashboard cards (including Video Analytics) to the Report Builder bridge. |
| [`business-docs/Chart-Style-Convention-README.md`](./business-docs/Chart-Style-Convention-README.md) | Shared Shahin ECharts visual and color conventions used across the Video Dashboard. |

### 3. Technical, API, Rollup & SDK Specifications (`technical-docs/`)
| Folder / File | Description |
| :--- | :--- |
| [`technical-docs/video-capture-and-rollups/ANALYSIS-AND-PLAN.md`](./technical-docs/video-capture-and-rollups/ANALYSIS-AND-PLAN.md) | Master technical analysis & rollout plan for video auto-capture and the Video Dashboard. |
| [`technical-docs/video-capture-and-rollups/P3-READ-MODEL-DESIGN.md`](./technical-docs/video-capture-and-rollups/P3-READ-MODEL-DESIGN.md) | ClickHouse daily archive rollup architecture (`TVideoDaily`, `TVideoQualityDaily`, `TVideoPlaybacksDaily`, `TVideoAdsDaily`, etc.). |
| [`technical-docs/video-capture-and-rollups/P5-SECTION-INVENTORY.md`](./technical-docs/video-capture-and-rollups/P5-SECTION-INVENTORY.md) | Exact section-by-section mapping of live real-data cards vs. pending/empty cards. |
| [`technical-docs/video-capture-and-rollups/P6-OPEN-ITEMS-DESIGN.md`](./technical-docs/video-capture-and-rollups/P6-OPEN-ITEMS-DESIGN.md) | Design spec for duration, replay, download, playback error rate, and Search Visibility (GSC + Discover correction). |
| [`technical-docs/video-capture-and-rollups/P7-VIDEO-IDENTITY-SPEC.md`](./technical-docs/video-capture-and-rollups/P7-VIDEO-IDENTITY-SPEC.md) | Canonical video identity resolution (`explicit` → `platform` → `source` → `page`), ad separation, and `VideoObject` schema detection. |
| [`technical-docs/video-capture-and-rollups/2026-08-28-v36-dashboard-coverage.md`](./technical-docs/video-capture-and-rollups/2026-08-28-v36-dashboard-coverage.md) | Dogfood coverage report measuring what the SDK delivers against every `v36` wireframe widget. |
| [`technical-docs/api-and-queries/video.graphql`](./technical-docs/api-and-queries/video.graphql) | Approved `core-api` GraphQL screen query contract (`VideoOverview`, `VideoDetail`, etc.). |
| [`technical-docs/api-and-queries/wireframe-inventory-g4.md`](./technical-docs/api-and-queries/wireframe-inventory-g4.md) | Group-4 wireframe-to-API data map (`VD-*` / `VW-*` items). |
| [`technical-docs/api-and-queries/engine-13.md`](./technical-docs/api-and-queries/engine-13.md) | Core-API video query engine design and measure routing specification. |
| [`technical-docs/api-and-queries/group-4.md`](./technical-docs/api-and-queries/group-4.md) | Group-4 domain query contract specification. |
| [`technical-docs/api-and-queries/video-playbacks-interactions.md`](./technical-docs/api-and-queries/video-playbacks-interactions.md) | Design spec for per-video playback errors, in-player interactions, and 5%-bucket seek heatmap rollups. |
| [`technical-docs/sdk-and-events/2026-07-19-media-family-v2-design.md`](./technical-docs/sdk-and-events/2026-07-19-media-family-v2-design.md) | Consolidated Media Family v2 event & property schema (`video_*` / `ads_video_*`). |
| [`technical-docs/sdk-and-events/2026-07-12-video-player-detectors-plan.md`](./technical-docs/sdk-and-events/2026-07-12-video-player-detectors-plan.md) | Implementation plan for zero-config player detectors (HTML5, YouTube, Vimeo, Plyr, Video.js, Vidstack, Shaka, JW Player, Player.js, IMA). |
| [`technical-docs/changelogs/`](./technical-docs/changelogs/) | Core-API video analytics changelog fragments (`13a`, `13b`, `13c`, read-cost optimization, by-video rollups). |

### 4. Interactive Offline Demo (`demo/`)
| File / Folder | Description |
| :--- | :--- |
| [`demo/README.md`](./demo/README.md) | Launch instructions for Linux, macOS, and Windows, plus explanation of `v36`–`v33` variants. |
| [`demo/serve.sh`](./demo/serve.sh) | One-command Python static HTTP server (`http://localhost:8012/`). |
| [`demo/video-dashboard/`](./demo/video-dashboard/) | Interactive wireframe pages (`index.html`, `v36.html`, `v35.html`, `v34.html`, `v33.html`, `versions.js`). |
| [`demo/report-builder/`](./demo/report-builder/) | Bundled Report Builder v12 calculation engine & bridge required by `v36.html`. |
| [`demo/events-start/`](./demo/events-start/) | Onboarding/activation view linked when switching to a project without video events. |
| [`demo/assets/`](./demo/assets/) | Local ECharts, Shahin design tokens/CSS, shell JS, Phosphor icons, logos, and web fonts. |

### 5. Brand Identity & Assets (`brand/`)
| File / Folder | Description |
| :--- | :--- |
| [`brand/Brand-Book.md`](./brand/Brand-Book.md) | Shahin Brand Book — brand identity, visual guidelines, voice & tone, and product identity reference. |
| [`brand/Product-Personality-Guide.md`](./brand/Product-Personality-Guide.md) | Shahin character & product personality guide (brand role, traits, visual colors, poses, guidelines, and sample dialogue). |
| [`brand/Brand-Assets/`](./brand/Brand-Assets/) | Official Shahin vector & raster brand assets: Full Logos (`Black`, `Main`, `White` SVGs), Logomarks (`Black`, `Main`, `White` SVGs), and Brand Patterns (`Pattern 1` & `Pattern 2` in `Black`, `Orange`, `Silver` as PNG & SVG). |

---

## Recommended Reading Paths

- **Stakeholders, Clients & Product Managers:** Start with [`guide/shahin-video-dashboard-guide.md`](./guide/shahin-video-dashboard-guide.md), launch [`demo/`](./demo/README.md) (`v36.html`), and review [`business-docs/PRD-Business-Video.md`](./business-docs/PRD-Business-Video.md).
- **Content, Editorial & SEO Teams:** Read Sections 3.2, 3.3, 3.6, 4, and 8 of [`guide/shahin-video-dashboard-guide.md`](./guide/shahin-video-dashboard-guide.md) plus [`business-docs/Help-Center-Video-Analytics.md`](./business-docs/Help-Center-Video-Analytics.md).
- **Frontend, Backend & Analytics Engineers:** Read [`technical-docs/video-capture-and-rollups/P5-SECTION-INVENTORY.md`](./technical-docs/video-capture-and-rollups/P5-SECTION-INVENTORY.md), [`P7-VIDEO-IDENTITY-SPEC.md`](./technical-docs/video-capture-and-rollups/P7-VIDEO-IDENTITY-SPEC.md), [`api-and-queries/video.graphql`](./technical-docs/api-and-queries/video.graphql), and [`sdk-and-events/2026-07-19-media-family-v2-design.md`](./technical-docs/sdk-and-events/2026-07-19-media-family-v2-design.md).
