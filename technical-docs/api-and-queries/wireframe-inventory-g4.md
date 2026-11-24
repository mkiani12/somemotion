# Group-4 wireframe data inventory: video, e-commerce, exchange (2026-10-22)

## Sources

- **Wireframes:** `/data/projects/asam/shahin/.wt-analytics-parity/product/wireframes/`
  - `video-dashboard`: v33, v34, v35, v36.
  - `events-video`: v3, v4.
  - `events-vod`: v3.
  - `events-ecommerce`: v5. It is the only file; `versions.js` says v1–v4 and v6 were deleted. The path it names for v1/v2 (`events/wireframes/events-ecommerce/`) does not exist in this checkout.
  - `events-exchange`: v10, v11. Older versions v5–v9 sit in `trash/events-exchange-v6v7v8v9-2026-08/` and were diffed by label. Rows found only there say "trash vN" in the versions column.
- **Data map:** `apps/core-api/docs/migration/parity/census/analytics.data-map.md` (VD-1..32, EC-1..25, EX-1..7).
- **Cross-check of what a map row covers:** the front-cp GraphQL selections in `apps/front-cp/app/stores/{events-video,events-ecommerce,exchange}/api.ts`.
  - Front-cp's video and e-commerce inputs are only `projectId`, `startDate`, `endDate` (plus `videoId` for the detail panel). They have no filters and no compare range.
  - Front-cp's exchange input adds `compareStartDate`/`compareEndDate`.
- **How the numbers are computed:**
  - video-dashboard v36 and e-commerce v5 compute every card through `report-builder/rb-bridge.js`. The `SPEC` maps were read, so the event × property × aggregation in column 4 is taken from the code, not inferred.
  - events-video, events-vod and exchange use hard-coded mock arrays.

**Not inventoried:** versions that survive only in git history or were deleted by PM order. These are exchange v4, video-dashboard v28–v32 and earlier, events-video and events-vod v1–v2, and e-commerce v1–v4 and v6. `git log --all` on those paths in this worktree returned nothing, so they are named here and not covered.

**Matching rule.**
- A row gets a map ID only when the map row covers the same data. That includes its dimension and its comparison. Map rows are coarse, and front-cp kpi cards carry `delta`, so a delta on a matched kpi card counts as covered.
- When the wireframe goes beyond the map row, the row is marked `NEW (ext XX-n)`. Examples are an extra dimension, a different comparison base, or a dashboard-level version of a per-video item.
- Inputs (range, compare, filters, toggles, exports) are never listed in the map, so every input row is NEW. The note says what front-cp already sends.

**Scope calls (one line each):**
- `events-media` is the newsroom/article dashboard: articles, reading depth, CMS freshness. It has no video data and stays out of scope.
- `events-advertising` is a display-ad inventory dashboard: slot request, fill, impression, viewable, click, ad blocker, eCPM/RPM. It names `ads_video_*` and a "VTR widget" only as catalog references and renders no video-ad chart. It stays out of scope, in line with the video dashboard keeping banner ads out.

---

## video-dashboard (v33–v36)

Versions:
- v36 is the canonical version.
- v34 is v33 without the buffer-rate KPI, trend, CDN modal and carrier chart.
- v35 is v34 plus the conversion-mode demo.
- Money: none on this page.

| ID | box/component | data item | measure × dimension × time behaviour | versions | data-map ID or NEW |
| --- | --- | --- | --- | --- | --- |
| VW-1 | Date-range bar | range presets 7d / 30d / 3m / 6m / 12m / custom | input: start/end | v33–v36 | NEW (input; front-cp already sends startDate/endDate) |
| VW-2 | Date-range bar → Compare tab | compare to previous period / same period last year / custom period | input; drives every "vs previous" delta | v33–v36 | NEW (input; front-cp video input has no compare range) |
| VW-3 | Filters drawer → Video | pick videos by title or path (searchable list) | input filter `video_title`/path; option list from data | v33–v36 | NEW |
| VW-4 | Filters drawer → Content category | News / Education / Sports / Entertainment / Documentary / Music | input filter `content_category` | v33–v36 | NEW |
| VW-5 | Filters drawer → Video duration | All / under 1 min / 1–5 / 5–20 / over 20 min | input filter, duration bucket of `video_duration_sec` | v33–v36 | NEW |
| VW-6 | Filters drawer → Playback start | Manual / Autoplay / Suggested | input filter `play_trigger` | v33–v36 | NEW |
| VW-7 | Filters drawer → Devices | device type, browser, OS | input filters | v33–v36 | NEW |
| VW-8 | Filters drawer → Internet carrier | Irancell, MCI, TCI, Shatel, Rightel, other | input filter `isp_name` | v33–v36 | NEW |
| VW-9 | Filters drawer → Location | country / city (searchable) | input filter | v33–v36 | NEW |
| VW-10 | Filters drawer → Referrer | channels / source name / referring domain | input filter | v33–v36 | NEW |
| VW-11 | Filters drawer → Campaign (UTM) | utm campaign / medium | input filter | v33–v36 | NEW |
| VW-12 | Filters drawer → User type | all / new / returning | input filter | v33–v36 | NEW |
| VW-13 | Filters drawer → Bot traffic | exclude / include bots | input filter | v33–v36 | NEW |
| VW-14 | Filter option lists | value lists for titles, categories, carriers, countries/cities, sources | labels from data, per project | v33–v36 | NEW |
| VW-15 | Locked checklist (no video events yet) | per required event (`video_started`, `video_progress`, `video_completed`, `video_heartbeat`): arrived / not arrived | boolean per event × project | v36 | NEW |
| VW-16 | Every card → "Open in report builder" | the card's own query (events, filters, groupBy, formula, range) handed to the builder; Search Console cards disabled with reason | contract: each card must be expressible as a builder query | v36 | NEW |
| VW-17 | Hero: Videos viewed | distinct `video_title` with `video_started` | count distinct × range × Δ vs previous period | v33–v36 | VD-1 |
| VW-18 | Hero: Impression-to-play rate | `video_started` ÷ `video_impression` | % × range × Δ vs previous ("next phase: needs cover-impression event") | v33–v36 | VD-2 |
| VW-19 | Hero: Page engagement share | heartbeat seconds ÷ total time on site | % × range × Δ vs previous | v33–v36 | VD-3 |
| VW-20 | Search visibility: Organic discovery funnel | Google impressions → clicks → plays from search; click-through %, play-through % | counts + 2 rates × range (GSC source) | v33–v36 | VD-4 |
| VW-21 | Search visibility: Index & schema health | indexing rate %, valid schema % (+ not indexed / invalid complement) | % of catalog × range | v33–v36 | VD-5 |
| VW-22 | Search visibility: Queries driving plays | query × plays, ranked by plays | list × range | v33–v36 | VD-6 |
| VW-23 | Watch depth: ring | avg completion = watch time per play ÷ avg duration | % × range × Δ vs previous | v33–v36 | VD-7 |
| VW-24 | Watch depth: hero stat | avg watch time per play (heartbeats × 10 s ÷ plays) | m:ss × range × Δ | v33–v36 | VD-8 |
| VW-25 | Watch depth: hero stat | avg video duration (`video_duration_sec` avg) | m:ss × range × Δ | v33–v36 | VD-9 |
| VW-26 | Watch depth: stat | total watch time | hours × range × Δ | v33–v36 | VD-10 |
| VW-27 | Watch depth: stat | full completion = completed ÷ started | % plays × range × Δ | v33–v36 | VD-10 |
| VW-28 | Watch depth: stat | session-based completion = sessions with ≥1 `video_completed` ÷ all sessions (v35 label "★ Conversion rate (session-based)"); **served ÷ sessions with a play**, as legacy computes it: the label is corrected, not the number (decision #101 (issue #457)) | % sessions × range × Δ | v35, v36 | VD-10 |
| VW-29 | Watch depth: stat | replay rate (`is_replay`) | % plays × range × Δ | v33–v36 | VD-10 |
| VW-30 | Watch depth: stat | download rate = `video_downloaded` ÷ plays | % × range × Δ | v33–v36 | VD-11 |
| VW-31 | Watch time trend | avg watch time per play | m:ss × day (interval follows range) | v33–v36 | VD-12 |
| VW-32 | Watch time trend → table modal | date, avg watch time, plays/sessions, Δ vs previous day; Export CSV | per day × Δ vs previous day | v33–v36 | VD-12 (Δ-vs-previous-day derived client-side) |
| VW-33 | Playback source donut | share of plays by `play_trigger` (manual / autoplay / suggested) + completion % per trigger | share % × trigger × range | v33–v36 | VD-13 |
| VW-34 | Completion funnel: Overall | started → 25 % → 50 % → 75 % → completed (90 %+); value + step delta | uniques funnel × range | v33–v36 | VD-14 |
| VW-35 | Completion funnel: By category | same funnel per `content_category` | funnel × category × range | v33–v36 | VD-15 |
| VW-36 | Completion by channel (v35: "Conversion by channel/campaign") | completions ÷ sessions per channel; denominator in tooltip; channels under 100 sessions excluded; **served: sessions with a completion ÷ sessions with a play**, floor on play sessions (decision #101 (issue #457)) | % × channel × range | v35, v36 | VD-16 |
| VW-37 | Completion by channel **and campaign** (v35: "Conversion by channel/campaign") | same rate per UTM campaign; low-data campaign (e.g. 40 sessions) excluded with a warning | % × campaign × range | v35, v36 | NEW (ext VD-16: map says "channels only") |
| VW-38 | v35 conversion-mode banner | `video_completed` marked as a Conversion + activation date; history before it = "no data" (no backfill) | event-settings state + date | v35 | NEW |
| VW-39 | Stall rate | `video_buffered` with buffer over 3 s ÷ plays | % × range × Δ ("better vs last week") | v33–v36 | VD-17 |
| VW-40 | Playback error rate | `video_error` ÷ plays ("next phase") | % × range × Δ | v33–v36 | VD-17 |
| VW-41 | Buffer rate KPI (dashboard level) | share of sessions with ≥1 buffer | % × range × Δ | v33 | NEW |
| VW-42 | Buffer rate trend | daily % of sessions with a buffer, 2.5 % threshold line, clickable incident point | % × day | v33 | NEW |
| VW-43 | CDN performance breakdown modal | selected incident window (date + sub-hour window, e.g. 14:20–15:00); global buffer rate in window; views in window; share of buffering by provider; per provider: buffer rate, views served, status | % and counts × CDN provider × **sub-hour window** | v33 | NEW (CDN/provider dimension) |
| VW-44 | Buffer rate by carrier (dashboard level) | buffer rate + session share per ISP; carriers with ≥100 sessions | % × carrier × range | v33 | NEW (ext VD-32, which is per video) |
| VW-45 | Watch and download quality | share of watching (heartbeats) and of downloading per rendition (1080p / 720p / 480p / ≤360p) | share % × quality × range | v33 (watch only; download "next phase"), v34–v36 | VD-18 |
| VW-46 | Adaptive quality drops | count + share by downgrade path (`quality_shift`), system-triggered only | count/% × shift path × range | v33–v36 | VD-19 |
| VW-47 | User environment: Distribution | dimension switch device / OS / browser / brand → unique viewers, share, buffer rate, Δ share vs previous; total unique viewers | uniques × dimension × range × Δ share | v33–v36 | VD-20, VD-21 |
| VW-48 | User environment: "Group by version" toggle | OS version / browser version slices | input + dimension `os_version`, `browser_version` | v33–v36 | NEW |
| VW-49 | User environment: Trend view | share per value over time, granularity Daily (7d) / Weekly (3m) / Monthly (12m); error state "Brand trend didn't load" | share % × dimension value × day/week/month | v33–v36 | NEW (ext VD-20; front-cp type already has `trend`) |
| VW-50 | Ad monetization: Ad completion rate | `ads_video_completed` ÷ `ads_video_started` | % × range × Δ | v33–v36 | VD-22 |
| VW-51 | Ad monetization: Ad skip rate | skipped ÷ started | % × range × Δ | v33–v36 | VD-22 |
| VW-52 | Ad monetization: Ad-driven drop-off | (started − completed − skipped) ÷ started | % × range × Δ | v33–v36 | VD-22 |
| VW-53 | Ad monetization: CTA click rate | `video_cta_clicked` ÷ plays ("next phase") | % × range × Δ | v33–v36 | VD-23 |
| VW-54 | Ad performance by position table | All / pre-roll / mid-roll / post-roll: ads started + share, completion, skip, drop-off, click rate | count/% × `ad_position` × range | v34–v36 | VD-24 |
| VW-55 | Outcome of started ads (v33 shape) | stacked outcome bar overall + per position; ad clicks noted separately | same data as VW-54 | v33 | VD-24 |
| VW-56 | Videos table | title, video id, plays + share, growth % vs previous (N/A below 100 previous play sessions, the caption's rule; decision #102 (issue #458)), completion, avg watch, buffer, replay, stall, page share | per video × range × growth vs previous period | v33–v36 | VD-25, VD-26 |
| VW-57 | Videos table controls | search by title, column picker (default/optional), sort by any column, 10-row pages | input (server-side if the list exceeds one page) | v33–v36 | NEW |
| VW-58 | Next-phase card: Startup time (TTFF) | first-frame latency as p50 / p95 / p99 (engine reads `startup_time` buckets) | percentiles × range | v33–v36 | NEW |
| VW-59 | Next-phase card: Exits before start (EBVS) | pressed play but left before the first frame, no error | % × range | v33–v36 | NEW |
| VW-60 | Next-phase card: Rebuffering ratio (CIRR) | buffering time ÷ watch time (engine reads `buffer_duration` buckets) | % time × range | v33–v36 | NEW |
| VW-61 | Detail panel: Video trend | plays, completion %, buffer % per bucket; up to 3 metric chips; granularity set by range | per video × day (auto) | v33–v36 | VD-27 |
| VW-62 | Detail panel: Overall stats | plays, full completion, avg completion, avg watch, buffer, stall, replay, page share, duration, unique viewers | per video × range | v33–v36 | VD-28 |
| VW-63 | Detail panel: Overall stats (next) | playback error rate and download rate per video | per video × range | v33–v36 | NEW (ext VD-28) |
| VW-64 | Detail panel: Video SEO | valid-schema flag + pre-filled JSON-LD (name, description, thumbnail, upload date, duration, contentUrl, embedUrl) | per video | v33–v36 | VD-29 |
| VW-65 | Detail panel: Queries driving this video | query × plays + "phrase not in title" hint | per video × range | v33–v36 | VD-30 |
| VW-66 | Detail panel: Audience retention | remaining % along the video; dip second / dip %; v36 engine reads 0/25/50/75/90 milestones + steepest drop | per video × range | v33–v36 | VD-30 |
| VW-67 | Detail panel: Watch and download quality | per rendition watch/download share + platform-average 360p share | per video × quality | v33–v36 | VD-30 |
| VW-68 | Detail panel: In-player interactions | seek forward/back, mute, skip intro (next), shares, subtitles (next): count + share | per video × action | v33–v36 | VD-31 |
| VW-69 | Detail panel: Device split | plays/sessions + share per device | per video × device | v33–v36 | VD-30 |
| VW-70 | Detail panel: Carrier split | top 3 ISPs: sessions + buffer rate; error state | per video × carrier | v33–v36 | VD-32 |
| VW-71 | Detail panel: Seek heatmap | 5 % position buckets: density + direction; hotspot | per video × position bucket | v33–v36 | VD-31 |

## events-video (v3, v4)

Versions and money:
- v4 differs from v3 only by moving to ECharts plus a per-100-plays strip; the data is identical.
- Every figure is mock.
- Money: none.

| ID | box/component | data item | measure × dimension × time behaviour | versions | data-map ID or NEW |
| --- | --- | --- | --- | --- | --- |
| VW-72 | Unified filter bar (shared `shahin-filter.js`) | date range 7d / 30d / 3m / 6m / 12m / custom + compare (previous period, same period last year, custom) | input | v3, v4 | NEW (input) |
| VW-73 | Unified Filters drawer | page/URL path, referrer (channel/source/domain), UTM (campaign/medium), device (type/browser/OS), location, tags, user type, bot | input filters | v3, v4 | NEW |
| VW-74 | Today's video pulse (story) | content plays, completion rate, biggest-drop milestone step | narrative over counts/% × range | v3, v4 | NEW (narrative over VD-10/VD-14) |
| VW-75 | AI Insight banner | segment vs site average: rebuffer rate ratio (~2.1×) and completion for source × device (Telegram + mobile) | ratio × source × device × range | v3, v4 | NEW |
| VW-76 | KPI: Total plays | `video_started` with `placement=content` | count × range × Δ vs previous | v3, v4 | NEW (no total-plays item in map) |
| VW-77 | KPI: Completion rate | completed ÷ started | % × range × Δ | v3, v4 | VD-10 |
| VW-78 | KPI: Total watch time | heartbeat-based hours | hours × range × Δ | v3, v4 | VD-10 |
| VW-79 | KPI: Avg watch / play | m:ss; "no meaningful change" | m:ss × range × Δ | v3, v4 | VD-8 |
| VW-80 | KPI drill hint | "click for watch-length distribution" (histogram of watch length per play); panel shows event definitions only | distribution × length bucket (promised, not rendered) | v3, v4 | NEW (low confidence) |
| VW-81 | Audience retention curve (site-wide) | % viewers remaining at 0–100 % of length in 10 % steps, from `video_heartbeat` | % × position × range | v3, v4 | NEW (ext VD-14/VD-30: map has milestones site-wide, curve per video only) |
| VW-82 | Milestone funnel | start → 25 % → 50 % → 75 % → complete; "out of every 100 plays" strip; largest drop step | funnel × range | v3, v4 | VD-14 |
| VW-83 | Playback quality mix | share of watch time by `to_quality` (1080p / 720p / 480p / 360p) | share % × quality × range | v3, v4 | VD-18 |
| VW-84 | Playback speed mix | share of watch time by `playback_rate` (0.75×, 1×, 1.25×, 1.5×, 2×) | share % × playback speed × range | v3, v4 | NEW |
| VW-85 | Event catalog table + detail panel | per event (24): name, tier, source, conversion-eligible, conversion rate % for events marked as conversion (no backfill before mark date); fields & trigger | % × event × range (rest is static catalog) | v3, v4 | NEW |

## events-vod (v3)

All figures are mock. Money: none is rendered. The KPI header says "media_type=vod + TVOD revenue", but no revenue figure appears.

| ID | box/component | data item | measure × dimension × time behaviour | versions | data-map ID or NEW |
| --- | --- | --- | --- | --- | --- |
| VW-86 | Unified filter bar + Filters drawer | same as VW-72/VW-73 | input | v3 | NEW (input) |
| VW-87 | Today's VOD pulse (story) | VOD plays, completion %, paywall → trial %, trial → paid % | narrative × range | v3 | NEW |
| VW-88 | AI Insight banner | `trial_started` → `subscription_started` conversion ratio for Telegram arrivals (~1.4×); ISP × mobile with the most `video_buffered` / `video_interrupted` | ratio × source; count × ISP × device | v3 | NEW |
| VW-89 | KPI: Plays & unique viewers | `content_started` plays + distinct viewers | count + uniques × range × Δ | v3 | NEW (map has unique users only per video, VD-28) |
| VW-90 | KPI: Total watch time | hours + avg per play | hours, m:ss × range × Δ | v3 | VD-10, VD-8 |
| VW-91 | KPI: Completion rate | completed ÷ started | % × range × Δ | v3 | VD-10 |
| VW-92 | KPI: Subscription conversion | paywall viewed → subscription started; bottleneck step | % × range × Δ | v3 | NEW |
| VW-93 | Audience retention curve | % viewers remaining at 0 / 25 / 50 / 75 / 100 % | % × position × range | v3 | NEW (ext VD-14, as VW-81) |
| VW-94 | Discovery → play funnel | title viewed (`item_viewed`) → play started → completed; side branch: recommendation clicks | funnel × range | v3 | NEW |
| VW-95 | Subscription funnel & conversion | paywall viewed → trial started → subscribed → renewed (MRR, non-conversion) with step rates | funnel × range | v3 | NEW |
| VW-96 | Engagement & quality mix | share of sessions with subtitles on, speed >1×, binge (next-episode autoplay), continue-watching (resume), rebuffer ratio | % sessions × behaviour × range | v3 | NEW |
| VW-97 | Event catalog table + detail panel | per event (38, incl. `rental_started`, trial / subscription / paywall): conversion-eligible + conversion rate % | % × event × range | v3 | NEW |
| VW-98 | KPI section subtitle | "TVOD revenue" (`rental_started`) named, no figure rendered | latent money measure | v3 | NEW (latent) |

---

## events-ecommerce (v5, sole living version)

**Money:**
- Every amount is toman. The display is "M T" (million toman, one decimal) or "K T" (thousand toman). Examples: hero 29.4M T, unfinished payments 24.5M T, coupon revenue 16M T, product revenue "(M T)", trend "million toman".
- The engine reads `order_value` as integer toman and divides by 1e6 for display, so the backend should return integer toman.
- The `purchase` schema card marks currency "required (toman/rial)", so a currency or unit field is expected.
- Payment-method revenue is gross; refunds carry no payment method.

**Comparisons:** the static first paint says "vs yesterday" on the KPI row and on the recovery board. The engine changes these labels to "vs previous period". The hero uses "vs all of yesterday". Both comparisons count as designs.

**View modes:** the simple/advanced toggle hides `adv-only` sections. The union below includes both views.

| ID | box/component | data item | measure × dimension × time behaviour | versions | data-map ID or NEW |
| --- | --- | --- | --- | --- | --- |
| EW-1 | Unified filter bar | date range 7d / 30d / 3m / 6m / 12m / custom + compare (previous period, same period last year, custom) | input | v5 | NEW (input; front-cp sends start/end only) |
| EW-2 | Unified Filters drawer | page/URL path, referrer, UTM, device, location, tags, user type, bot | input filters | v5 | NEW |
| EW-3 | Segments chips (10) | new/returning, mobile/desktop, city/region, traffic channel, campaign, product category, product brand, price range, first-time/loyal, discount-driven/regular; "every metric re-reads by the selected segment" | input segment applied to every card | v5 | NEW |
| EW-4 | Every card → "Open in report builder" | card's query handed to the builder; disabled with reason for online visitors (minute range) and cart recovery (identity) | contract | v5 | NEW |
| EW-5 | Full funnel toggle | mobile / desktop / channel Instagram (`utm_source`) / channel organic (`referrer_type`) | input segment | v5 | EC-16 |
| EW-6 | Product table | search + pagination over the full SKU table ("final build") | input | v5 | NEW |
| EW-7 | Exports | follow-up list of unfinished gateway orders; at-risk customer campaign list; event catalog CSV | row-level order / customer export (needs identity) | v5 | NEW |
| EW-8 | Data story | today's orders + net revenue; payment failed + pending share of attempts; session-level cart abandonment (the two once-hard-coded figures, now computed = EC-8 values) | narrative × today + range | v5 | EC-1 |
| EW-72 | Data story | range revenue trend direction (net revenue first half vs second half of the range: up / down / steady) | direction × range | v5 | NEW (ext EC-1) |
| EW-9 | Hero: Net revenue today | Σ `order_value` purchase − refund (toman → M T) | money × today × Δ vs all of yesterday | v5 | EC-2 |
| EW-10 | Hero: Successful orders today | `purchase` count | count × today × Δ vs yesterday | v5 | EC-2 |
| EW-11 | Hero dual-line chart | net revenue (M T) and purchases per hour | money + count × hour × today | v5 | EC-2 |
| EW-12 | Rail: Open carts | carts today, converted to purchase, open = carts − purchases | count × today | v5 | EC-3 |
| EW-13 | Rail: Unfinished payments | on-hold orders today: count + follow-up link | count × today | v5 | EC-3 |
| EW-73 | Rail: Unfinished payments | pending value of today's on-hold orders (e.g. 24.5M T; front-cp `rail` has one `value`) | money (toman) × today | v5 | NEW (ext EC-3) |
| EW-14 | Rail: Online visitors | active in the last 5 min (5-min points) | uniques × 5-min window, live | v5 | EC-4 |
| EW-15 | Rail: Top product today | product name + views · carts · buys | count × product × today | v5 | EC-3 |
| EW-16 | KPI: Purchase CVR | session → purchase (session-held funnel) | % × range × Δ | v5 | EC-6 |
| EW-17 | KPI: Net Revenue, AOV, Orders | net (purchase − refund, toman), avg `order_value` (toman), purchase count | money/count × range × Δ vs previous (static: vs yesterday) | v5 | EC-5 |
| EW-18 | The buying path at a glance | item_viewed → add_to_cart → begin_checkout → purchase, per 100 viewers | uniques funnel × range | v5 | EC-7 |
| EW-19 | Recovery board KPIs | cart abandonment %; historical payment failure rate (failed + on-hold ÷ attempts, colour bands); awaiting payment confirmation (count); **proposed:** abandonment per cart, payment failure = online-gateway orders never paid ÷ online-gateway orders (decision #103–#107 (issue #460)) | %/count × range × Δ vs yesterday | v5 | EC-8 |
| EW-20 | Recovery board: Awaiting confirmation | pending value (e.g. 18.4M T) | money × range | v5 | NEW (ext EC-8) |
| EW-21 | Unfinished gateway orders table | per gateway (Zarinpal, bank, IDPay, TorobPay, SnappPay, Digipay, Tara …): went to gateway never returned (pending), failed | count × `payment_gateway` × range | v5 | EC-9 |
| EW-22 | Failure rate per gateway | failed ÷ that gateway's attempts; attempt count in tooltip | % × gateway × range | v5 | EC-9 |
| EW-23 | Cart item removals & restores | `remove_from_cart` vs `restore_cart_item` | count × day | v5 | EC-10 |
| EW-24 | Orders awaiting confirmation — trend | `order_on_hold` vs `order_on_hold_confirmed` | count × day | v5 | EC-11 |
| EW-25 | Mobile vs desktop CVR | CVR per device + session share; 7-day daily CVR trend per device | % × device × range + day | v5 | EC-12 |
| EW-26 | Product performance (per-SKU) | views, added to cart, purchases, revenue (M T), buy/view %, status flag (high-view low-sale / high-cart low-buy) | per product × range | v5 | EC-13 |
| EW-27 | Product drill panel | product funnel (views → cart → purchase), cart/view rate, buy/view rate, product revenue (M T), share of net revenue | per product × range | v5 | EC-13 |
| EW-28 | Product drill: stock & variant | stock status chip, variation level | product attributes (not event data; engine drops them) | v5 | NEW |
| EW-29 | Product reviews & ratings | 1–5 star distribution + reviews submitted | count × rating × range | v5 | EC-14 |
| EW-30 | Digital product downloads | downloads, unique buyers, share of orders + daily trend | count/% × range + day | v5 | EC-14 |
| EW-31 | Net revenue trend | gross (bars) and net after refunds (line), million toman + annotations (e.g. summer-sale start, internet disruption) | money × day + annotation list | v5 | EC-15 |
| EW-32 | Checkout funnel (abandonment by step) | begin_checkout → shipping info → payment info → purchase, user-scoped | uniques funnel × range | v5 | NEW (ext EC-18: map has the abandonment rate, not the step funnel) |
| EW-33 | Business KPIs: Checkout abandonment | % + Δ (marked worse) | % × range × Δ | v5 | EC-18 |
| EW-34 | Business KPIs: Payment failure | `purchase_failed` ÷ all attempts + Δ (**proposed:** the same rate as EW-19, online-gateway orders never paid ÷ online-gateway orders, decision #103–#107 (issue #460)) | % × range × Δ | v5 | EC-8 |
| EW-35 | Business KPIs: Refund rate | refunds ÷ orders + Δ | % × range × Δ | v5 | NEW |
| EW-36 | Business KPIs / Growth: Repeat purchase rate | customers with ≥2 purchases; engine: week-1 return retention over last 3/6/12 months; Δ vs last month (**proposed:** served as orders from returning customers until G4-Q10, decision #103–#107 (issue #460)) | % × cohort window | v5 | EC-20 |
| EW-37 | Business KPIs: CAC | needs ad-cost feed | money (external) | v5 | NEW |
| EW-38 | Business KPIs: LTV (behavioural proxy) | orders per customer (rial LTV deliberately not shown) | ratio × range | v5 | NEW |
| EW-39 | Business KPIs: ROAS | needs campaign cost | ratio (external) | v5 | NEW |
| EW-40 | Business KPIs: Gross margin | needs COGS from the store | % (external) | v5 | NEW |
| EW-41 | Full purchase funnel (9 stages) | page_view → item_list_viewed → item_viewed → add_to_cart → cart_viewed → begin_checkout → shipping → payment → purchase; red when drop >50 %; per segment (EW-5) | uniques funnel × segment × range | v5 | EC-16 |
| EW-42 | Full funnel tooltip | estimated lost revenue (toman) at each post-checkout step | money × step × range | v5 | NEW |
| EW-43 | Entry & engagement | landing-page engagement, landing bounce rate, avg scroll depth | %/depth × range | v5 | NEW |
| EW-44 | Search & discovery: No-result search rate | `search_no_results` ÷ `search_submitted` + Δ | % × range × Δ | v5 | EC-22 |
| EW-45 | Search & discovery: Searcher conversion | searcher CVR (`search_submitted` → `purchase`) | % × range | v5 | EC-23 |
| EW-74 | Search & discovery / Top search queries | searcher CVR as a multiple of the site average ("2.4×", "≈4×") | ratio × range | v5 | NEW (ext EC-23) |
| EW-46 | Search & discovery: Top filters | `item_list_filtered` share by filter type (price, brand, size, in stock) | share % × filter type × range | v5 | NEW |
| EW-47 | Search & discovery: Top search terms (cloud) | size = demand share, red = zero-result term | count × `search_term` × range | v5 | EC-22 |
| EW-48 | Search & discovery: High-view low-sale products | top 3: views, buy % | per product × range | v5 | EC-13 |
| EW-49 | PDP: PDP → add-to-cart rate | `add_to_cart` ÷ `item_viewed` (site level) | % × range | v5 | NEW |
| EW-50 | PDP: PDP exit rate | exit with no next action | % × range | v5 | NEW |
| EW-51 | PDP: Impact of reviews & images | add-to-cart after reading reviews / gallery vs not (inactive: candidate events) | % × behaviour | v5 | NEW |
| EW-52 | PDP: High add-to-cart low purchase | top products: add %, buy % | per product × range | v5 | EC-13 |
| EW-53 | Revenue by payment method | gross revenue (M T) per method incl. BNPL, store wallet, COD | money × `payment_method` × range | v5 | EC-17 |
| EW-54 | Cart & checkout metrics | coupon error rate, checkout abandonment | % × range | v5 | EC-18 |
| EW-55 | Cart & checkout metrics | abandonment after shipping cost, avg time to purchase (engine: funnel median total time) | %, m:ss × range | v5 | EC-19 |
| EW-56 | Account: Guest vs registered purchase | purchase conversion % per buyer type (inactive: needs stitching) | % × guest/registered | v5 | NEW |
| EW-57 | Account: Sign-up & activity | sign-up rate, return rate, stickiness DAU/MAU | % × range | v5 | NEW |
| EW-58 | Account: At-risk repeat customers | count of returning customers past 1.5× their own purchase interval + exportable list | count × range (identity) | v5 | NEW |
| EW-59 | Growth KPIs: Cart recovery rate | recovered within 72 h | % × range | v5 | EC-21 |
| EW-60 | Growth KPIs: First-time buyer share | `is_first_purchase` share + Δ | % × range × Δ | v5 | EC-20 |
| EW-61 | Top search queries (bar) | count per term (red = zero-result); zero-result rate + Δ; searcher conversion + Δ | count × term; % × range × Δ | v5 | EC-22, EC-23 |
| EW-62 | Marketing: Revenue by channel | gross revenue (M T) per channel | money × channel × range | v5 | EC-16 |
| EW-63 | Marketing: Traffic acquisition breakdown | inbound sessions per channel + share | count × channel × range | v5 | EC-16 |
| EW-64 | Marketing: Campaign conversion, Coupon ROI | campaign CVR as a multiple of site average (4.2×); coupon ROI | ratio × range | v5 | NEW |
| EW-65 | Marketing: ROAS, Email open/CTR, Push CTR | "needs dev" placeholders | external feeds | v5 | NEW |
| EW-66 | Sales time pattern heatmap | purchases per weekday (Sat-first Jalali week) × hour band (12 two-hour bands); 0–10 index + estimated orders per cell | count × weekday × hour band × range | v5 | EC-24 |
| EW-67 | Top performing coupons | code, orders, revenue (est. = orders × AOV, M T), revenue share, code-user CVR; coupon orders share of total | per coupon × range | v5 | EC-25 |
| EW-68 | Coupon outcomes | applied, denied, removed before purchase, converted | count × outcome × range | v5 | EC-25 |
| EW-69 | Technical & UX: Site technical health | page load time, error rate, 404 rate, API failure (needs dev), gateway latency (needs dev), payment uptime | s/% × range (Performance/CWV service) | v5 | NEW |
| EW-70 | Technical & UX: Mobile vs desktop performance | avg load time per device | seconds × device × range | v5 | NEW |
| EW-71 | Event catalog (65 events) + detail panel | conversion-eligible + conversion rate % per event; fields & trigger | % × event × range | v5 | NEW |

---

## events-exchange (v10, v11; trash v5–v9 diffed)

**Money:** no monetary amount is shown anywhere in v10 or v11.
- "Total deposits" is a count of `deposit` events.
- "3,050 toman + 1,380 coin" is a count of `withdraw_toman` and `withdraw_coin` events. The tooltip says no amount or currency field is confirmed.
- Only the trash v5–v8 "Financial & operations" placeholder names money: volumes in toman/USD, plus fees.

**v11:** a step-1 rebuild that keeps only the overview and the activation funnel. It drops the filters and adds a "Today" range preset.

| ID | box/component | data item | measure × dimension × time behaviour | versions | data-map ID or NEW |
| --- | --- | --- | --- | --- | --- |
| XW-1 | Date range + compare | 7d / 30d / 3m / 6m / 12m / custom; v11 adds **Today**; compare previous period / same period last year / custom | input | v10, v11 | NEW (input; front-cp already sends start/end + compareStart/compareEnd) |
| XW-2 | Unified Filters drawer | page/URL path, referrer, UTM, device, location, tags, user type, bot | input filters | v10 (dropped in v11) | NEW |
| XW-3 | Page states | error; no access ("financial data is role-protected"); loading; "awaiting your events" checklist with per-event arrived / not arrived | state + per-event boolean | v10, v11 | NEW (front-cp contract has `meta.state` / `requiredEvents`; map lists no row) |
| XW-4 | Executive overview base | registered users in range (funnel base) | count × range | v10, v11 | EX-1 |
| XW-5 | KPI: Sign-ups | count + Δ vs previous range; share who logged in; share who reached a trade | count/% × range × Δ | v10, v11 | EX-1 |
| XW-6 | KPI: Logged in | count, % of sign-ups; login stickiness; logged in without KYC | count/% × range | v10, v11 | EX-1 |
| XW-7 | KPI: KYC approved | count, % of logged-in; share who also deposited; logged in without KYC (trash v5 card "Users without KYC approval") | count/% × range | v10, v11, trash v5 | EX-1 |
| XW-8 | KPI: First deposit | count, % of KYC-approved; share who also traded; KYC-approved without deposit | count/% × range | v10, v11 | EX-1 |
| XW-9 | KPI: First trade | count, % of first depositors, % of all sign-ups; median time to here (days) | count/%/median × range | v10, v11 | EX-1, EX-2 |
| XW-10 | KPI: Conversion-to-trader | sign-up → first trade %, count; biggest drop step and its % | % × range | v10, v11 | EX-1 |
| XW-11 | Exchange activation funnel | sign_up → login → kyc_approved → first_deposit → first_trade with step rates + biggest-drop note | uniques funnel × range | v10, v11 | EX-1 |
| XW-12 | Growth: Login stickiness (DAU/MAU) | DAU/MAU ratio from `login` timestamps | % × range | v10, trash v5–v9 | EX-2 |
| XW-49 | Growth: Login stickiness (DAU/MAU) | change vs 8 weeks ago ("+7 pts", 24 % → 31 %) | Δ pts × **fixed 8-weeks-ago base** | v10, trash v5–v9 | NEW (ext EX-2) |
| XW-13 | Growth: Weekly login stickiness trend | DAU/MAU per week, last 8 weeks | % × week (fixed 8-week window) | trash v5 | NEW |
| XW-14 | Growth: Guest mode | unique `guest_mode_enter` users + share who also signed up | uniques/% × range | v10 | EX-2 |
| XW-15 | Growth: Reactivation rate | dormant (30 d no trade) traders who traded again: % + N of M | %/count × month | v10 | EX-2 |
| XW-16 | Growth: Referral loop | referral_created → shared → signup → reward_earned | funnel × range | v10 | EX-2 |
| XW-17 | Growth: Time-to-first-trade | median days; median hours to first deposit; buckets <1 h / 1–24 h / 1–7 d / 7–30 d / >30 d as a cumulative (ECDF) curve | median + distribution × range | v10, trash v5–v9 | EX-2 |
| XW-18 | Acquisition: Channel quality by trader-yield | first trade ÷ registrations per channel, colour bands (≥50 %, 40–49 %, <40 %) | % × channel × range | v10 | EX-3 |
| XW-19 | Acquisition: Channel mix | share of sign-ups per channel | % × channel × range | v10 | EX-3 |
| XW-20 | Acquisition channels table | channel (source / medium): sessions, registrations, KYC approved, first deposit, first trade, trader-yield, step pass rates | count/% × channel × range | v10 | EX-3 |
| XW-21 | Registration & KYC funnel | registration started → completed → login → KYC started → submitted → approved | funnel × range | v10 | EX-4 |
| XW-22 | KYC rejection reasons | share + count by `failure_reason` | %/count × reason × range | v10 | EX-4 |
| XW-23 | Funding: Total deposits | `deposit` event count (incl. repeat) + Δ | count × range × Δ | v10 | EX-5 |
| XW-24 | Funding: Total withdrawals | `withdraw_toman` + `withdraw_coin` counts, split toman / coin | count × rail (toman/coin) × range | v10 | EX-5 |
| XW-25 | Funding: Weekly deposit & trade trend | both indexed to week 1 = 100, raw counts in tooltip; fixed trailing 8 weeks, independent of the range filter | index × week (8 w) | v10 | EX-5 |
| XW-26 | Funding: Deposit funnel | started → address generated → detected → confirmed → completed | funnel × range | v10 | EX-5 |
| XW-27 | Funding: Withdrawal funnel | started → submitted → verification → processed → completed | funnel × range | v10 | EX-5 |
| XW-28 | Funding: Deposits by asset | share of successful deposits per asset (USDT, BTC, ETH, TRX, other) | % × asset × range | v10 | EX-5 |
| XW-29 | Funding: Transaction failure reasons | share + count by reason; failures out of total attempts | %/count × reason × range | v10 | EX-5 |
| XW-30 | Discovery-to-deposit funnel | coin_view → deposit page opened (union of show_deposit / show_deposit_coin minus overlap) → deposit | funnel × range | v10 | EX-5 |
| XW-31 | Deposit page type | unique users per page (toman vs coin) + overlap note | uniques × page type × range | v10 | EX-5 |
| XW-32 | Most-viewed coins | share of `coin_view` per asset | % × asset × range | v10 | EX-5 |
| XW-33 | Trading: Active traders | uniques with ≥1 trade + Δ | uniques × range × Δ | v10 | EX-6 |
| XW-34 | Trading: Total trades | `trade` count | count × range | v10 | EX-6 |
| XW-35 | Trading: Avg trades per user | mean + median | ratio/median × range | v10 | EX-6 |
| XW-36 | Trading: Repeat trader rate | traders with >1 trade: % + N of M | % × range | v10 | EX-6 |
| XW-37 | Trading: Trade count distribution | share + users per bucket (1, 2, 3–5, 6–10, 11–20, 21+) | distribution × range | v10 | EX-6 |
| XW-38 | Trading: First-time trader decay curve | per first_trade cohort, % trading again at D0 / D1 / D7 / D30 / D90 (3 cohorts drawn) | % × cohort × day offset | v10 | EX-6 |
| XW-39 | Trading: Order-placement funnel | trading screen viewed → order form opened → submitted → accepted → executed | funnel × range | v10 | EX-6 |
| XW-40 | Trading: Staking requests | users + % of active traders | uniques/% × range | v10 | EX-6 |
| XW-41 | Trading: Gift cards | users + % of active traders | uniques/% × range | v10 | EX-6 |
| XW-42 | Retention cohort heatmap | first_trade month × D1 / D7 / D30 / D90 point-in-time retention; immature cells masked | % × monthly cohort × day offset | v10, trash v5–v9 | EX-6 |
| XW-43 | First-time trader return (D7 / D30) | mature-cohort average return by day 7 / 30 | % × cohort | trash v5, v6 | EX-6 |
| XW-44 | Activity volume | counts of trade, deposit, withdraw_toman, withdraw_coin + D30 retention | count × range | trash v5 | EX-5, EX-6 |
| XW-45 | Product & UX: Screen usage | share of in-app views by `screen_name` | % × screen × range | v10 | EX-7 |
| XW-46 | Product & UX: Feature adoption | share of active traders using limit orders, price alerts, referral, recurring buy | % × feature × range | v10 | EX-7 |
| XW-47 | Product & UX: Segment split | device: share (users, %) + conversion % | %/count × device × range | v10 | EX-7 |
| XW-48 | Financial & operations (locked placeholder) | trading volume by pair; deposit/withdrawal volume in toman/USD; revenue (trading fees, deposit/withdrawal fees, other); liquidity (spread, order-book depth, slippage); risk & compliance (AML holds, suspicious activity, failed trades) | money/ratios × pair × range (ledger, not events) | trash v5–v8 (dropped v9+) | NEW |

---

## Group-4 summary

Row counts:
- video-dashboard: 71 (VW-1..71)
- events-video: 14 (VW-72..85)
- events-vod: 13 (VW-86..98)
- events-ecommerce: 74 (EW-1..74; EW-72..74 split out of EW-8 / EW-13 / EW-45)
- events-exchange: 49 (XW-1..49; XW-49 split out of XW-12)
- Total: 221

### New measures (not in the data map)

**Video**
- Dashboard-level buffer rate KPI and daily buffer-rate trend with a threshold line (video-dashboard v33).
- CDN provider breakdown: buffer rate, views served, share of buffering per provider in an incident window (video-dashboard v33).
- Startup time p50 / p95 / p99 (TTFF), exits before start (EBVS), and rebuffering time ratio (CIRR) (video-dashboard v33–v36, "next phase"; CIRR also as "rebuffer ratio" in events-vod).
- Per-video playback error rate and download rate (video-dashboard detail panel).
- Total plays as a KPI (events-video, events-vod).
- Total unique viewers as a KPI (events-vod).
- Site-wide audience retention curve: continuous remaining %, not only milestones (events-video, events-vod).
- Watch-length distribution, promised but not rendered (events-video).
- Playback speed mix: share of watch time by playback rate (events-video, and "speed >1×" in events-vod).
- VOD engagement shares (events-vod): subtitles on, binge / next-episode autoplay, continue-watching.
- Subscription conversion and funnel: paywall → trial → subscribed → renewed (events-vod).
- Discovery → play funnel: title viewed → play → complete, with recommendation clicks (events-vod).
- TVOD revenue, named only (events-vod).
- Per-event conversion rate in the event catalog (events-video, events-vod, events-ecommerce).
- AI-insight segment ratios: segment vs site average for rebuffer rate, completion and trial → subscription (events-video, events-vod).

**E-commerce** (events-ecommerce)
- Pending toman value of orders awaiting confirmation (EW-20) and of today's unfinished payments (EW-73).
- Refund rate.
- CAC, ROAS, gross margin, email open / CTR, push CTR (external feeds).
- LTV behavioural proxy (orders per customer).
- Checkout step funnel.
- Estimated lost revenue per post-checkout funnel step (toman).
- Landing bounce rate and avg scroll depth.
- Top filters used (`item_list_filtered` share).
- Site-level PDP → add-to-cart rate, PDP exit rate, impact of reviews / images.
- Guest vs registered CVR.
- Sign-up rate, return rate, DAU/MAU stickiness.
- At-risk repeat customers.
- Campaign-conversion multiple and coupon ROI.
- Searcher-conversion multiple of the site average (EW-74).
- Site technical health: page load, error rate, 404 rate, API failure, gateway latency, payment uptime.
- Mobile vs desktop load time.
- Revenue-trend direction in the data story (EW-72).
- Product stock and variant (not event data).

**Exchange**
- Weekly DAU/MAU trend (trash v5).
- The whole Financial & operations layer (trash v5–v8): volume by pair, toman/USD deposit and withdrawal volume, fee revenue, liquidity spread / depth / slippage, AML holds and suspicious activity.

### New dimensions

- **Video, campaign (UTM):** completion by campaign, with low-denominator exclusion (video-dashboard v35, v36).
- **Video, CDN / edge provider** (video-dashboard v33).
- **Video, internet carrier at dashboard level** (video-dashboard v33; VD-32 is per video only).
- **Video, OS version and browser version** ("Group by version", video-dashboard v33–v36).
- **Video, playback speed** (events-video).
- **Video, VOD behaviour flags:** subtitles, binge, continue-watching (events-vod).
- **Video, filter dimensions:** video duration bucket, playback start trigger, content category (as a filter), carrier, location, referrer source / domain, UTM campaign / medium, user type, bot (video-dashboard filter drawer).
- **Video, source × device segment** (events-video AI insight); **source and ISP × device** (events-vod).
- **E-commerce, 10 segments:** new/returning, device, city/region, channel, campaign, category, brand, price range, first-time/loyal, discount-driven/regular.
- **E-commerce, filter type** (`item_list_filtered`).
- **E-commerce, buyer type:** guest vs registered.
- **E-commerce, page type:** landing, PDP.
- **E-commerce, funnel step** (lost revenue).
- **Shared drawer on events-video, events-vod, events-ecommerce and exchange v10:** page path, tags.
- **Exchange, 8-week comparison base and withdrawal rail (toman / coin):** both are covered by EX rows except where marked.
- **Exchange, trading pair** (trash finance placeholder).

### New time behaviours

- **Compare to previous period / same period last year / custom:** on every folder. Front-cp's video and e-commerce inputs have no compare range; exchange already has one.
- **Sub-hour incident window** (e.g. 14:20–15:00) and a clickable incident point on a daily trend (video-dashboard v33).
- **Daily / weekly / monthly granularity switch** on user-environment share trends (video-dashboard v33–v36).
- **Δ vs previous day** in the watch-time table (video-dashboard).
- **"Better vs last week"** on stall rate (video-dashboard).
- **Today vs all of yesterday, hourly today, last 5 minutes live** (events-ecommerce hero/rail). EC-2/EC-4 exist, but the minute-level window is not report-builder expressible.
- **Static "vs yesterday" vs engine "vs previous period"** on KPI and recovery deltas (events-ecommerce). Both are designs.
- **"Vs last month"** on repeat purchase, and **week-1 return over 3/6/12-month windows** (events-ecommerce).
- **Fixed trailing 8-week window independent of the range filter**, and **Δ vs 8 weeks ago** (exchange v10, trash v5).
- **"Today" range preset** (exchange v11).

### New inputs

- **Filters drawer:** video-dashboard has its own extended drawer. events-video, events-vod, events-ecommerce and exchange v10 use the shared `shahin-filter.js` drawer. None of these filters is in the map or in front-cp's video/e-commerce input.
- **Segment chips** applied to every metric (events-ecommerce).
- **Full-funnel segment toggle** (events-ecommerce; inside EC-16).
- **Group-by-version toggle and trend granularity** (video-dashboard).
- **Table search, sort, column picker and pagination:** videos table (video-dashboard) and product table (events-ecommerce).
- **Exports:**
  - Watch-time CSV, client-side (video-dashboard).
  - Follow-up order list, at-risk customer list and catalog CSV (events-ecommerce). Row-level, identity-bearing exports.
- **"Open in report builder" on every card** (video-dashboard v36, events-ecommerce v5): each card's query must be reproducible by the builder.
- **Locked checklist of required events per project** (video-dashboard v36, exchange v10/v11 states).

### Data the designs assume the platform may not collect

- **Video — mostly collectable, with named gaps.** The core cards run on player SDK events Shahin defines and legacy already serves from the archive rollups. Some depend on events or sources Shahin does not have:
  - `video_impression`, `video_error` and `video_cta_clicked` are marked "next phase".
  - TTFF, EBVS and CIRR need startup-time and buffer-duration fields.
  - The CDN provider breakdown needs per-request CDN / edge attribution, which Shahin does not collect.
  - Per-video interactions and the seek heatmap are not collectable in legacy (VD-31).
  - Search visibility needs Google Search Console.
  - VOD subscription, trial and paywall funnels need subscription-pack events from the site.
- **E-commerce — the event funnel is collectable, but much of the page is not.** Server-side order truth, buyer identity and external cost feeds are assumed:
  - Order truth (gateway status, on-hold, refunds) must be read server-side from WooCommerce or the gateway.
  - Cart recovery, LTV, guest vs registered and at-risk customers need buyer-identity stitching.
  - CAC, ROAS and gross margin need ad-cost and COGS feeds that do not exist.
  - Online visitors needs minute-level data.
  - Technical health needs the Performance/CWV service.
  - Stock and variant are not event data.
- **Exchange — assumes data the platform does not collect today.** Every number is mock and the event pack is unconfirmed; KYC, deposits and withdrawals are back-office facts the exchange must emit. Per `EVENT-DEPENDENCIES.md`:
  - The event list (`sign_up`, `login`, the `kyc_*` events, the deposit/withdraw events, `trade`, `coin_view`, `staking_request`, `giftcard`, the `referral_*` events) is asserted only in the wireframe. `03-Event-Catalog.md` has no exchange pack.
  - `limit_order_placed`, `price_alert_set`, `order_form_opened`/`submitted`/`accepted`, `screen_viewed` and an entry `page_view` do not exist at all.
  - Required fields are unconfirmed: asset on `coin_view`; side, pair and amount on `trade`; asset, network and amount on deposits; `device_type`; and channel/UTM on sign-up.
  - KYC outcomes, deposits and withdrawals are back-office facts the exchange must emit.
  - The Financial & operations layer needs a transaction ledger, so no event stream can serve it.
