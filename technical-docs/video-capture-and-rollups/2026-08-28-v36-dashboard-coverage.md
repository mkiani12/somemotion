# v36 video dashboard — what the SDK actually delivers

**Date:** 2026-08-28. **Method:** dogfood pages carrying one Shahin `<script>`,
driven through the isolated stack (script-provider → analytics-collector →
ClickHouse). Every "captured" claim below is a `SELECT` against
`analytics.RecordsV2`, not a reading taken from the browser.

**Reference:** `wireframes/video-dashboard/v36.html`.

## 1. Verdict

The dashboard's **core watch-behaviour half is fully served**: depth, watch
time, start method, completion funnel, startup time, abandon-before-play and
buffer ratio all have real data.

Four gaps would render cards empty or wrong, and **three of them are SDK
gaps, not data-volume gaps** — more traffic will not fix them.

## 2. Card-by-card

| v36 card / KPI | Needs | Status |
|---|---|---|
| ویدیوهای دیده‌شده (videos watched) | `media_started`, `media_id` | **captured** |
| نرخ نمایش به پخش (impression→play) | `media_impression` + `media_started` | **BROKEN for videojs** — §3.1 |
| ترک پیش از پخش (abandon before play) | same pair | **BROKEN for videojs** — §3.1 |
| عمق و زمان تماشا (watch depth/time) | `media_heartbeat.position_sec` | **captured** — ~10s cadence |
| روند زمان تماشا (watch-time trend) | heartbeat over time | **captured** |
| نحوه شروع پخش (start method) | `media_started.playback_source` | **captured** (`autoplay` observed; enum has manual/suggested/continue_watching) |
| قیف اتمام پخش (completion funnel) | `media_progress.milestone_percent`, `media_completed` | **captured** — 25 and 50 verified, once each, all five players |
| نرخ اتمام به تفکیک منبع | funnel × `playback_source` | **captured** |
| زمان شروع پخش (startup time) | `media_started.startup_time_ms` | **captured** |
| نسبت زمانی بافر (buffer ratio) | `media_buffered.buffer_duration_ms` | **captured, except vidstack** — §3.2 |
| نرخ توقف (stall rate) | `media_stalled` | declared; not exercised (needs a real stall) |
| نرخ خطای پخش (error rate) | `media_error.error_code` | declared; not exercised |
| کیفیت غالب تماشا و دانلود | `quality`, `media_download.download_quality` | **NO DATA** — §3.3 |
| کاهش کیفیت انطباقی (adaptive downgrades) | `media_quality_changed.change_trigger='adaptive'` | **NO DATA** — §3.3 |
| ویدیوها table — عنوان ویدیو | `media_title` | **only vidstack** — §3.4 |
| ویدیوها table — نشست‌ها (sessions) | `playback_session_id` | **NO DATA** — §3.5 |
| آگهی cards (ad completion/skip/churn/position) | `media_ad_*`, `ad_position` | declared; not exercised — needs a VAST player |
| نرخ کلیک CTA | `media_cta_clicked` | declared; not exercised |
| محیط کاربر (device/browser/OS/ISP/geo) | collector-side UA + GeoIP enrichment | **not an SDK concern** — served by the collector |
| ارجاع‌دهنده / کمپین UTM / نوع کاربر | pageview record, not the media family | **not an SDK concern** |

## 3. The gaps, with measurements

Per-provider prop coverage, from `RecordsV2` (76 rows, one run):

```
provider   media_title  quality  is_live  playback_session_id  placement  impression  buffered
html5           0          0        0             0               14          1          1
plyr            0          0        0             0               14          1          1
shaka           0          0        0             0               15          1          1
videojs         0          0        0             0               13          0          1
vidstack       14          0        0             0               14          1          0
```

### 3.1 videojs emits no `media_impression`
The other four do. Two KPIs divide by impressions — نرخ نمایش به پخش and
ترک پیش از پخش — so for a Video.js site both are **wrong, not empty**: the
denominator silently loses that player. Reproduced across runs.

### 3.2 vidstack emits no `media_buffered`
The other four emit one each. نسبت زمانی بافر and the device table's
نرخ بافر column lose vidstack.

### 3.3 `quality` is never populated by any player
Declared on all 26 events; populated on **zero** rows. Two cards depend on it
(کیفیت غالب تماشا و دانلود, کاهش کیفیت انطباقی) and neither can render.
`media_quality_changed` was likewise never emitted — expected here, since the
test asset is a single-rendition MP4/HLS, but the empty `quality` prop on
every ordinary event is the SDK gap: it should carry the current rendition on
each event regardless of whether a change occurred.

### 3.4 `media_title` only on vidstack
Vidstack exposes a `title` property on `<media-player>`, which the detector
reads. The other four have no title source, so the ویدیوها table's
عنوان ویدیو column would be blank for 4 of 5 players. Either the SDK needs a
fallback (`<video title>`, `aria-label`, `<meta property="og:title">`), or
the dashboard must fall back to `media_id` — a product decision, not a bug.

### 3.5 `playback_session_id` is never populated
Declared on all 26 events, populated on **zero** rows. The ویدیوها table's
نشست‌ها column counts playback sessions, and "one viewing" cannot be
distinguished from "same video replayed" without it. Today the only grouping
key is `media_id` + the device/session identity on the record, which merges
repeat views of the same video in one visit.

## 4. Not yet exercised (and why that is not the same as broken)

- **Ads** — the four `media_ad_*` events and `ad_position` need a player
  serving VAST. The Chakavak dogfood page carries a real `#VastURL`, so the
  ad cards are exercisable as soon as that page runs against a collector.
- **Stalls and errors** — need induced network conditions.
- **`media_completed`** and the 75% milestone — the runs stop at ~82s of 120s.
- **`is_live`, `behind_live_sec`, `live_latency_ms`** — need a live stream.
- **playerjs, youtube, vimeo, chakavak, jwplayer** — not driven; the first
  needs iframe interaction, the rest need egress.

## 5. One structural risk

The registry seed declares `provider` as a free `string`
(`cardinalityHint: low`), not an enum. A typo in any detector would be
accepted and stored silently rather than quarantined — and every card on this
dashboard groups or filters by provider. Worth closing before the dashboard
ships.

---

# Addendum — the three iframe providers (Chakavak, YouTube, Vimeo)

Added 2026-08-28 after exercising all three against the isolated stack.

## A. Capability, from the detector source

All three drive the same `mediaSession`, so the lifecycle events
(`play_intent`, `started`, `resumed`, `paused`, `ended`, `seeked`,
`heartbeat`, `progress`, `error`, `interrupted`) are common to them. What
differs:

| | Chakavak (APS) | YouTube | Vimeo |
|---|---|---|---|
| buffer **start** | **no** | yes | yes |
| buffer end | yes | yes | yes |
| quality changed | yes | yes | yes |
| rate changed | yes | yes | yes |
| volume changed | yes | yes | yes |
| subtitle changed | yes | **no** | yes |
| fullscreen toggled | **yes (only one)** | no | no |
| `media_download` | **yes (only one)** | no | no |

**Chakavak is the best-instrumented embed we have** — the only one reporting
fullscreen and download — which matches the design's claim that the
`aps.player` bridge is a real events protocol rather than a scraped surface.
Its one hole is buffer *start*: it emits `bufferEnd` without a matching
start, so the نسبت زمانی بافر card cannot compute a buffer *duration* for
Chakavak the way it can for YouTube and Vimeo. That is already on the
Chakavak compat backlog in the design (§8: "emit `buffered` (+duration),
`stalled`").

**YouTube's walls are documented and permanent** (design §9): in-stream ads
are invisible to the IFrame API, so **no `media_ad_*` will ever come from a
YouTube embed**; subtitle state is not exposed; volume is poll-only; quality
`change_trigger` is unattributable and the prop is omitted; and live
`media_duration` is a finite growing pseudo-duration that dashboards must
treat as untrusted.

## B. What they actually produced

All three attach cross-origin and emit `media_impression` with correct
provider attribution and a sensible `media_id`:

```
provider   event              media_id
chakavak   media_impression   https://vod.demg.org/player/1a048c0c594_b4b62a#VastURL=…
youtube    media_impression   aqz-KE-bpKQ
vimeo      media_impression   76979871
```

No playback events, for a harness reason rather than a detector one: the
driver presses play on the top document's `<video>`, and a cross-origin
iframe has none. Driving these needs each vendor's own API (YouTube's
`postMessage` command channel, Vimeo's, and the `aps.player` protocol).

This run also confirmed the `aps` → `chakavak` rename end to end — source,
build, served bundle, browser, collector, ClickHouse. Note it took a
container **recreate** plus a cache-cold browser: `docker restart` reuses the
old image, and the bundle is served `cache-control: max-age=300`.

## C. Reachability is a hard constraint, not a gap

| origin | from the Iranian test box | from a workstation outside |
|---|---|---|
| `www.youtube.com` | **000** | 200 |
| `player.vimeo.com` | **000** | 200 |
| `vod.demg.org` (Chakavak) | 200 | 200 |
| `video.tavoos.net` (VAST) | 200 | 200 |

**YouTube and Vimeo cannot be exercised from Iranian infrastructure at all**,
which matches the design's note that Vimeo blocks Iranian IPs. Any CI or
dogfood run hosted there will show those two pages as dead, and that is a
network fact, not a detector defect. Chakavak *and its ad server* are
reachable from both — so **Chakavak is the only path we have to exercising
the four `media_ad_*` events**, and the dogfood page already carries a real
`#VastURL`.

## D. One finding worth fixing

Chakavak's `media_id` is the **entire iframe `src`, including the
`#VastURL=…` fragment** — 138 characters carrying the ad tag and its key.
As a dashboard dimension that is high-cardinality and effectively unique per
ad tag, so the ویدیوها table would show one row per tag rather than per
video. The other two yield clean ids (`aqz-KE-bpKQ`, `76979871`). The APS
detector should prefer the bridge's own media identity, or at minimum strip
the fragment before using the src as a candidate.
