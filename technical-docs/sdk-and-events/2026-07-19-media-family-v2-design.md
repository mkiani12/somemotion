# Media Family v2 — Consolidated Event & Prop Design

> **Partly superseded.** The event family is `video_*` / `ads_video_*` (R1 amendment, 2026-09-22), and **video identity and ad separation are now governed by** `reports/video-capture-dashboard-2026-09-20/P7-VIDEO-IDENTITY-SPEC.md` (2026-09-30): a DOM element/container/player id is never a video id, `blob:` URLs and counters are never ids, and every event carries `video_id_source`. Where this document disagrees, P7 wins. Working rules for detectors: `.claude/skills/video-pack.md`.

**Status:** Approved design (CTPO ruling 2026-07-19) — supersedes the shipped `video_*` seed vocabulary and the 2026-07-13 interaction-events design (in-conversation, never spec'd).
**Scope:** registry seed + collector validation vocabulary, analytics SDK video-pack detectors, SDK site contract. Read-model/dashboard queries consume this but are spec'd in Plan-Unified-Event-System Phase 5.
**Sources reconciled:** `Events-Service/Strategy-Predefined-Events.md` §7.3 Pack 1 (catalog), `Events-Service/PRD-Dashboard-Video.md` (V3, synced to wireframe v34), wireframes `video-dashboard/v33+v34`, CTPO interaction-events directives (seek/speed/quality/volume/subtitle, state props on all events), live-stream research (CTA-2066, Mux/Conviva practice, player live APIs — 2026-07-19), Aparat/Romeo embed teardown (2026-07-19), Chakavak APS `aps.player` bridge protocol v1 (`chakavak-file-storage` `app/api/public/js/aps-player-bridge.js` + `events.d.ts`).
**Timing constraint that makes this free:** nothing is deployed. The event-system deployment campaign has not started; `RecordsV2` is empty; no customer sends named events. Every rename below is a seed re-cut + detector edit, not a migration. After the campaign this document's changes would be a breaking-change project.

---

## 1. Rulings (decision record)

| # | Ruling | Rationale |
|---|---|---|
| R1 | ~~Naming canon = `media_*`~~ **SUPERSEDED 2026-09-22 (owner): canon = `video_*`.** Event family `video_*`; IMA ad breaks (pre/mid/post-roll inside content) are their own family **`ads_video_*`** (was `media_ad_*`); props `video_id` / `video_title` / `video_duration` (were `video_id` / `video_title` / `video_duration`); **`media_type` retired** — it was `video` on 100 % of 743 M production rows and no audio/VOD/LMS/TTS pack has ever emitted. Registry seeds (3 copies) at version `d6bc01b7dffc1b93cfefe3e722a76be5910f09b0`. | The shared-media abstraction had zero emitters and zero rows behind it, while a stored name that differs from the product word is a language fork in the schema (the same fork corrected for "viewer"). **History under `media_*` is discarded fleet-wide by decision**; the cut-over is clean (collector first, then script-provider; the retired tail is quarantined by design). Consequence recorded: the catalog's audio/VOD/LMS/TTS sections that reused this family now read `video_*` / `media_type=audio` and **must be re-specified with their own family** if those packs are ever designed. **Original R1, verbatim:** **Naming canon = `media_*`** with `media_type` (`video`\ — *`audio`\* |
| R2 | **Buffer and stall are separate events** (`video_buffered`, `video_stalled`). The catalog's current `video_buffered` text ("short network pause / stall") is corrected — see §11. | Dashboard PRD's "golden separation": buffer routes to network/CDN, stall routes to player/browser. Merging destroys the routing. |
| R3 | **`video_completed` = watched ratio crosses 90% OR playback ends**, fired once per handle; conversion-eligible. Milestones are **25/50/75** (`milestone_percent`, Number). | PRD + catalog agree; the shipped seed (95 quartile, completed-on-ended-only) was wrong on both counts. |
| R4 | **Download is live** (`video_download`), per the PM decision recorded in the PRD. The stale "Download rate · next phase" cell in wireframe v34's single-video panel is a leftover to fix. | |
| R5 | **Heartbeat ships at ~10s and is customer-quota-exempt** (or fractionally weighted). Quota mechanics are core-side configuration keyed by event name; not a registry field for now. | ~360 rows/hour/viewer billed as customer events would make the pack uneconomical. Schema must not wait on billing mechanics. |
| R6 | **Pack size gate: video pack ≤ 14 KB gzip** (hard); minified size advisory. Pack stays inline-behind-flag — only video-pack deployments carry it. *(Amended 2026-07-19 from ≤8 KB after implementation: the shipped pack measures 13.8 KB gz / 57.5 KB min — the weight is the ruled scope itself: 26-event semantics, QoE engines, heartbeat, live rules, ten providers incl. three full iframe-protocol clients. Cost lands only on pack-enabled tokens, once per cache lifetime, absorbed by ETag/304 + edge cache per the platform's Phase-6 bundle-size precedent.)* **Committed follow-up — upgraded to PRODUCT REQUIREMENT (CTPO, 2026-07-21, see §14):** per-provider merger assembly — build emits per-detector artifacts; the Go merger inlines only the providers listed in the project's `settings.providers` — ships WITH api-v2 Task 1.4 (per-project pack settings are its config lever). The artifact split subsumes the shared detector-utils (DRY) extraction, so both land together; expected typical payload afterwards: 5–7 KB gz (runtime+engine+one detector). | Surface grew ~3.5× vs the !53 pack (4.0 KB gz) by deliberate scope ruling, not waste. |
| R7 | **Pack key stays `video`**. `EVENT_PACKS`/`eventPacks` config, merger gating, and file layout are unchanged; only event names and schemas change. | Zero churn in config plumbing (Task 6.1 chain) for a cosmetic key rename. |
| R8 | ~~`media_type`/`placement` are schema-optional, SDK-always-sent~~ **SUPERSEDED 2026-09-22 (owner): `media_type` retired; `placement` (`content`\|`ad`) kept and now `putEnum`-validated (!744).** `placement='ad'` marks an ad **unit** (the player *is* an ad); ad **breaks** are the `ads_video_*` family, not a placement value. | Two distinct concepts needed two distinct mechanisms — a dimension for units (one key column, prunes at the rollup), a family for breaks (they carry their own `ad_position` and lifecycle). **Original R8, verbatim:** **`media_type`/`placement` are schema-optional, SDK-always-sent.** Missing values are read as `video`/`content` by consumers. — *Keeps manual `track()` calls from quarantining on a forgotten discriminator; detectors always send both.* |

## 2. Event catalog

Feasibility classes: **AUTO** (detectors, no site cooperation) · **PARTIAL** (auto where the player/stack exposes it; documented SDK fallback otherwise) · **MANUAL** (site `track()` only) · **RESERVED** (name registered, no implementation this phase).

All events: pack `video`, Persian-first dashboards never show raw names. `conversionEligible=false` unless stated.

### 2.1 Core funnel — Tier 2

| Event | Class | Own props (beyond §3) | Trigger |
|---|---|---|---|
| `video_started` | AUTO | `playback_source` (`manual`\|`autoplay`\|`suggested`\|`continue_watching`, opt), `startup_time_ms` (Number, opt) | First frame actually rendering (`playing`-equivalent), NOT the play click. One per handle per page load. `startup_time_ms` = intent→first-frame (serves the TTFF card; no separate startup event — the catalog's `startup_time_measured` reference resolves to this prop, see §11). `continue_watching` is site/VOD-supplied (resume from saved position). |
| `video_progress` | AUTO | `milestone_percent` (Number, req; 25\|50\|75) | Each milestone once per handle, from the shared milestone tracker (heartbeat/position derived). |
| `video_completed` | AUTO | — | Watched ratio ≥ 90% or `ended`, once per handle. **conversionEligible=true.** |

### 2.2 Playback lifecycle & QoE — Tier 3, AUTO

| Event | Own props | Trigger / semantics |
|---|---|---|
| `video_heartbeat` | — | Every ~10s of ACTIVE playback (not paused, not buffering, tab-visible playback subject to browser throttling). Source of truth for watch time & retention. Quota-exempt (R5). |
| `video_play_intent` | — | Play attempted (user click or autoplay start). EBVS = intents with no subsequent `video_started`. |
| `video_paused` | `pause_method` (`interaction`\|`automatic`, opt) | User/system pause; suppressed when ended (existing rule). `pause_method` is a documented heuristic (§6.3). |
| `video_resumed` | — | Play after a pause in the same handle. (Replaces shipped `video_played`.) |
| `video_seeked` | `from_position_sec` (Number, req), `to_position_sec` (Number, req) | One event per settled scrub gesture (§5). Feeds seek heatmap + forward/backward split. |
| `video_buffered` | `buffer_duration_ms` (Number, opt) | One per rebuffer interval (waiting→resume pair), emitted at interval end; duration serves the CIRR card. Startup buffering before first frame is NOT a rebuffer. |
| `video_stalled` | — | Watchdog: nominally playing but `currentTime` frozen ≥ `settings.stallThresholdMs` (default 5000) with no buffer recovery. Once per freeze episode. |
| `video_error` | `error_code` (String, opt) | Playback-breaking error. `error_code` normalized `<provider>:<code>` (e.g. `html5:3`, `shaka:1002`, `jwplayer:232011`, `youtube:101`). |
| `video_interrupted` | — | External termination mid-playback: `pagehide`/`visibilitychange`-to-hidden while playing, or network offline — via sendBeacon path. Makes abandonment and watch time honest. |

### 2.3 Interaction & state — Tier 3, AUTO (CTPO directive events)

Settled-value semantics per §5: 1s debounce, final value only, suppressed if unchanged since last emit.

| Event | Own props |
|---|---|
| `video_quality_changed` | `from_quality` (String, opt), `to_quality` (String, req), `change_trigger` (`user`\|`adaptive`, opt — omitted when the player can't attribute, e.g. YouTube) |
| `video_rate_changed` | `playback_rate` (Number, req) |
| `video_volume_changed` | `volume` (Number 0–100 int, req), `muted` (Boolean, req). Mute/unmute folds in here; dashboard consumes mute counts. |
| `video_subtitle_changed` | `subtitle_enabled` (Boolean, req), `subtitle_language` (String, opt) |
| `video_fullscreen_toggled` | `fullscreen_state` (`enter`\|`exit`, req) |

### 2.4 Discovery, consumption & monetization — Tier 3, PARTIAL / MANUAL

| Event | Class | Own props | Auto coverage → fallback |
|---|---|---|---|
| `video_impression` | PARTIAL | — | AUTO for claimed player elements via IntersectionObserver (player ≥50% visible once per page). Thumbnail/cover form: site annotation `data-shahin-video-cover="<video_id>"` or `track()`. |
| `video_download` | PARTIAL | `download_quality` (String, opt — the downloaded rendition, distinct from the state prop `quality` which is the current playback level) | AUTO: Plyr download control click; `<a download>` pointing at media near a claimed player. Else site `track()`. Download quality usually only the site knows. |
| `video_next_autoplayed` | PARTIAL | — (video_id = the NEXT media) | AUTO: JW playlist auto-advance. Else site `track()` for custom binge UIs. |
| `ads_video_started` | PARTIAL | `ad_position` (`pre_roll`\|`mid_roll`\|`post_roll`, req), `ad_skippable` (Boolean, opt) | AUTO: JW ads API, Video.js+IMA plugin, Shaka ads API. Vidstack/html5/YouTube: site `track()` (YouTube's own ads are a hard wall — §9). `placement=ad` on all ad events. |
| `ads_video_completed` | PARTIAL | `ad_position`, `ad_skippable` | Same coverage. **conversionEligible=true.** |
| `ads_video_skipped` | PARTIAL | `ad_position` | Same coverage. |
| `ads_video_clicked` | PARTIAL | `ad_position` | Same coverage. **conversionEligible=true.** |
| `video_cta_clicked` | MANUAL | — | Site's own in-player CTA overlay; always `track()`. |
| `video_intro_skipped` | RESERVED | — | Name registered; next phase. |

Reference events (owned elsewhere, not redefined here): `share` (core; `entity_type=video`), `recommendation_clicked` (Search & Discovery pack).

**Count: 26 registered media events** (3 Tier-2 + 22 Tier-3 + 1 reserved). The six shipped `video_*` seed entries are removed.

## 3. Shared props

### 3.1 Base props (every media event)

| Prop | Type | Req | Notes |
|---|---|---|---|
| `video_id` | String | **yes** | Unchanged semantics: first non-empty candidate, trim, 500-cap, synthesized `<provider>-media-<n>` fallback, pinned at attach. |
| ~~`media_type`~~ | — | — | **Retired 2026-09-22** (R1/R8 supersession). Was `video`\|`audio`\|`vod`; only `video` ever shipped. |
| `placement` | String | no (R8) | `content`\|`ad`; detectors send `content`; ad events send `ad`. |
| `provider` | String | no | `plyr`\|`videojs`\|`vidstack`\|`shaka`\|`jwplayer`\|`youtube`\|`vimeo`\|`playerjs`\|`aps`\|`html5` (detector) or site-supplied. `aps` = Chakavak/APS bridge (§8); `vimeo` = bare Vimeo iframes via Vimeo's documented postMessage API (wrapped Vimeo inside Plyr/Vidstack is claimed by those detectors and keeps their provider tag); `playerjs` = any iframe implementing the Embedly Player.js standard (Bunny Stream — officially documented, api.video, Streamable, SproutVideo, and any future compliant vendor incl. the §9.2 tier-4 partnership ask). |
| `video_title` | String | no | Trim, 300-cap. |
| `video_duration` | Number | no | Seconds, finite ≥ 0. Omitted for live (`Infinity` is not a value). |
| `position_sec` | Number | no | Renamed from `position`. Seconds, finite ≥ 0. |
| `playback_session_id` | String | no | Optional nesting contract (playback session ⊃ content pod ⊃ ad) per the catalog's VOD pack; site/VOD-supplied, trim, 100-cap. Detectors omit it. |

### 3.2 State props (every media event, optional, populated when the player exposes them)

`playback_rate` (Number), `quality` (String), `volume` (Number 0–100 int), `muted` (Boolean), `subtitle_enabled` (Boolean), `subtitle_language` (String), `is_live` (Boolean), `behind_live_sec` (Number — distance from the live edge, live only), `live_latency_ms` (Number — glass-to-glass estimate, only where the stack exposes it: Shaka `getStats().liveLatency`, hls.js `latency`).

Structural guarantee: state is merged by the runtime, not per-detector code — each detector supplies one `readState()`; the runtime normalizes and attaches state to every emit for that handle (single-normalization-point invariant from the !53 pack survives).

## 4. Normalization (single code point: `buildMediaProps`, runtime)

- `playback_rate`: finite, in (0, 16], else omit.
- `volume`: canonical 0–1 float from detectors (JW divides its 0–100 by 100); emitted as integer 0–100.
- `muted`, `subtitle_enabled`: strict Boolean.
- `quality` / `from_quality` / `to_quality`: numeric height → `"<height>p"`; YouTube name map (`hd2160`→`2160p`, `hd1440`→`1440p`, `hd1080`→`1080p`, `hd720`→`720p`, `large`→`480p`, `medium`→`360p`, `small`→`240p`, `tiny`→`144p`, `highres`→`highres`, `default`/`auto`→`auto`); other strings trimmed, lowercased, 50-cap; unknown → omit.
- `subtitle_language`: trimmed, lowercased, 35-cap (BCP-47-ish); unknown → omit.
- `position_sec`, `from_position_sec`, `to_position_sec`, `video_duration`, `behind_live_sec`: finite ≥ 0, else omit (`Infinity` durations are omitted, never sent).
- `startup_time_ms`, `buffer_duration_ms`, `live_latency_ms`: finite ≥ 0 integer ms, cap 1h, else omit.
- `is_live`: strict Boolean; omitted when liveness is unknown (never guessed).
- `milestone_percent`: exactly 25|50|75, written only by the shared milestone tracker.
- Enum-valued strings (`playback_source`, `pause_method`, `change_trigger`, `fullscreen_state`, `ad_position`): registry-enum validated server-side; detectors only ever emit listed values.

## 5. Settled-value semantics (noise control)

- **Debounced events** (`video_seeked`, `video_rate_changed`, `video_volume_changed`, `video_quality_changed`, `video_subtitle_changed`): 1s settle window per handle per event type; emit once with the final value; `video_seeked` aggregates the whole scrub (`from` = pre-burst position, `to` = settled position); suppressed when the settled value equals the last emitted value.
- **Interval events** (`video_buffered`): one per interval, emitted at interval end.
- **Tick events** (`video_heartbeat`): 10s cadence during active playback only.
- **Once-per-handle events**: `video_started`, `video_completed`, each `milestone_percent`, `video_play_intent` (once per handle unless a new load), `video_impression` (once per handle per page).

## 6. Documented heuristics (approximations, not truth — say so in customer docs)

1. **Autoplay detection** (`playback_source=autoplay`): play intent with `navigator.userActivation.hasBeenActive === false` (fallback: no prior pointer/key event recorded by the tracker), or the element's `autoplay` attribute. `suggested` is never inferred — site annotation only (`data-shahin-playback-source="suggested"` on the triggering link/element, honored at next `video_started`).
2. **`startup_time_ms`**: monotonic delta between first play intent and first frame for that handle.
3. **`pause_method`**: `automatic` when the pause coincides with `visibilitychange`→hidden, `pagehide`, or arrives ≤250ms after a programmatic source the detector can see; else `interaction`. Omitted when the detector cannot judge.
4. **Stall watchdog**: while nominally playing, sample `currentTime`; frozen ≥ `stallThresholdMs` (default 5000, settings-overridable) without an accompanying buffer interval → `video_stalled`, once per episode.
5. **YouTube seek inference**: 1s poll discontinuity > 3s (either direction) → `video_seeked` with the polled from/to.
6. **Background-tab fidelity**: timers throttle in hidden tabs; heartbeat cadence may degrade. `video_interrupted` + final-state beacon bound the error. Known industry-wide caveat; documented, not "fixed".
7. **In-iframe interaction proxy** (third-party embeds, §9.2 tier 2): a `window.blur` while `document.activeElement` is a recognized third-party player iframe = the user clicked inside the player — emitted as a low-confidence `video_play_intent` (`provider` set to the embed vendor, no position/duration ever). The ad-tech click-detection technique; explicitly approximate.

## 7. Live streams

Research basis: CTA-2066 (QoE events/metrics standard), Mux/Conviva live practice, player live APIs (2026-07-19). Live needs **no new events** — the family covers live QoE already (join time = `startup_time_ms`, EBVS = `video_play_intent` without a start, rebuffering = `video_buffered`, failures = `video_error`). Live adds **props + rules**:

- **Props** (§3.2): `is_live`, `behind_live_sec`, `live_latency_ms`.
- **Rules when `is_live`:**
  1. `video_progress` (percent milestones) and the 90%-completion path are **suppressed** — percent-of-duration is undefined on a live stream. `video_completed` fires only on actual broadcast end (`ended` while live).
  2. Watch time and retention run purely on `video_heartbeat` (time-based, unaffected).
  3. DVR/catch-up behavior = `video_seeked` + `behind_live_sec` context; no dedicated live-edge event.
- **Concurrent viewers are heartbeat-derived, server-side** (distinct sessions per 10s window). The catalog's `video_concurrent_viewers_sampled` custom-event candidate is superseded (§11).
- **Detection matrix (client-side, per player):** html5/Plyr `duration === Infinity`; Video.js `liveTracker.isLive()` + `seekableEnd` for behind-live; Shaka `isLive()`/`seekRange()` (+ `getStats().liveLatency`); Vidstack `streamType`/`liveEdge` (richest — distinguishes `live` vs `live:dvr`); JW stream-type/DVR position semantics (noisier); YouTube: no reliable live signal — `is_live` omitted (live `getDuration()` returns growing elapsed time); APS bridge: requires `isLive` in the ready metadata (Chakavak backlog, §8).
- `live_reaction_sent` stays a phase-2 custom candidate (site-specific vocabulary).

## 8. APS (Chakavak) bridge detector — first-party VOD/live

Chakavak's player pages (`chakavak-file-storage`, "APS": Plyr/Video.js/Shaka variants for VOD **and** live over HLS, RTMP ingest) are embedded as cross-origin iframes and already ship `aps-player-bridge.js` — postMessage protocol `context:'aps.player', version:1`: `ready` handshake advertising methods/events/metadata (`{id, title, duration, width, isVideo, subtitles…}`), inbound command allowlist, 16 outbound events.

**New detector (AUTO): `aps`** — a sibling of the youtube detector, consuming the bridge instead of a player API. Probe: iframes whose `src` matches the deployment's APS origin(s) (`settings.apsOrigins` hint) plus any iframe that completes the `aps.player` ready handshake. Mapping:

| aps.player event | media event |
|---|---|
| `watch_started` | `video_started` |
| `watch_percent` | `video_progress` (thresholds per §2.1 after Chakavak alignment) |
| `watch_until_end` | `video_completed` |
| `play` / `pause` | `video_resumed` / `video_paused` |
| `seek` | `video_seeked` |
| `time_update` | heartbeat/position source (drives `video_heartbeat`) |
| `speed_change` / `quality_change` / `subtitle_change` / `volume_change` | `video_rate_changed` / `video_quality_changed` / `video_subtitle_changed` / `video_volume_changed` |
| `fullscreen` | `video_fullscreen_toggled` |
| `download` | `video_download` |
| `error` | `video_error` |
| `ready` metadata | `video_id` / `video_title` / `video_duration` |

**Double-count guard (binding):** the bridge currently also fans events out to `window.aai` (legacy GA3 shape) directly. Once the `aps` detector ships, that direct fanout MUST be gated off (bridge config or version gate), or every action counts twice. Coordinated in the Chakavak backlog below.

**Chakavak compat backlog** (filed with the Chakavak team; not this repo's work): align milestones to 25/50/75 and completion 98%→90; emit `buffered` (+duration), `stalled`, `play_intent`/`startup_time_ms`, `interrupted`; add `isLive` (+ `behind_live_sec`) to ready metadata; enrich `quality_change` payload with from/to/trigger; retire the direct `window.aai` fanout behind a flag.

Strategic note: with this detector, Chakavak embeds become the best-instrumented video on any Shahin customer site — a concrete Chakavak↔Shahin cross-sell surface.

## 9. Explicit CANNOT-HAVE list (agreed exclusions)

1. **YouTube walls**: its in-stream ads are invisible to the IFrame API (no `ads_video_*` from YouTube embeds, ever); subtitle state not exposed; volume poll-only; quality `change_trigger` unattributable (prop omitted); live `video_duration` on YT live embeds is a finite growing pseudo-duration (not filtered like Infinity-reporting players) — dashboards must treat YT `video_duration` as untrusted for live content.
2. **Cross-origin embeds without a JS API**: no real-time playback events possible — **except APS/Chakavak (§8), which has a real protocol**. Verified by code teardown (2026-07-19) for both major Iranian players:
   - **Aparat (Romeo player):** exactly one undocumented outbound message (`romeoReady`), zero inbound listeners; `aparat.com/api` is REST metadata only.
   - **ArvanCloud player** (`player.arvancloud.ir`, video.js+Shaka underneath): 61 postMessage refs / 12 message listeners in `arvanplayer.min.js` — ALL internal (rrweb session-recording snapshots to parent, compression/transmux workers, Sentry, DRM key exchange, IAB consent bridges). No events protocol, no command API.

   **Tiered coverage strategy for third-party-hosted video:**
   | Tier | What | Coverage |
   |---|---|---|
   | 1 | **In-page embeds** (raw `<video>` on the host page — e.g. gaj.ir serves Arvan-stored MP4s in a native tag — or Arvan's documented HTMLElement/JS embed modes) | FULL media family via existing detectors. This is the customer integration guidance: prefer in-page embedding over the iframe. Requires the `.video-js` blind-spot fix (§10). |
   | 2 | **Iframe, no cooperation** | `video_impression` (iframe src match + visibility) plus the low-confidence in-iframe interaction proxy (§6.7). Nothing else is structurally reachable. |
   | 3 | **Server-side stats import** (customer owns the VOD account) | Aggregate per-video watch time/views/traffic from the vendor API (Arvan VOD API v2.0 documents per-video reports incl. device/OS/carrier splits; Aparat REST for channel owners) — a GSC-pipeline-pattern importer, dashboard-grade daily aggregates, NOT events. Feasibility spike on exact endpoints before committing. |
   | 4 | **Vendor protocol partnership** (business track) | Propose the `aps.player` protocol (§8) or the public Player.js standard to ArvanCloud/SabaIdea — "implement this and Shahin-instrumented sites light up your embeds." Arvan already bundles rrweb for its own analytics; the value story is understood. |
3. **`cdn_provider` on buffer events**: page JS cannot see the serving edge. Moot — v34 cut the CDN breakdown (v33-only). If ever revived: `Server-Timing` with CDN cooperation is the only path.
4. **True user-vs-system attribution** for pause/quality: heuristics only (§6).
5. **Bandwidth MB consumed; external HLS/DASH error-code monitoring**: PRD out-of-scope, largely unmeasurable in page JS.
6. **Search-visibility band** (Google impressions/clicks, query→play join): GSC pipeline + backend join (Khashayar's access approval), not SDK scope.

## 10. Impact map

- **Registry seed** (`apps/analytics-collector/event_schemas_seed.json` + contract copy `Tech-Specs/Events/registry-seed.v1.json`): remove the six `video_*` entries; add the 26 events above (all `schemaVersion 1-0-0`, fresh family); recompute sha1 `version`. Collector Go code: zero changes (schema-driven validation). `enum` prop type already supported; `milestone_percent` becomes Number (validated by type; exact-value discipline is client-side).
- **Packs runtime** (`packages/analytics/packs/src/00-runtime.js`): `buildVideoProps` → `buildMediaProps` (§4), `readState` merge, settled/interval/tick helpers, milestone tracker replaces quartile tracker (25/50/75 + completion at 90%), impression observer, interrupted beacon hook.
- **Detectors** (7 files + 3 new): emit vocabulary swap + new event wiring per the capability matrix (per-player event names doc-verified at implementation, same discipline as the !53 cycle); new `aps` bridge detector (§8); new `vimeo` iframe detector — Vimeo's documented postMessage API (`player.vimeo.com` embeds; addEventListener envelopes for play/pause/ended/timeupdate/seeked/volumechange/playbackratechange/qualitychange/texttrackchange/error + getVideoTitle/getDuration for identity; no script injection, no enablejsapi precondition; AUTO, lowest priority — Vimeo blocks Iranian IPs, wrapped-Vimeo paths work regardless); new generic `playerjs` detector — the Embedly Player.js standard (`context:'player.js'` envelopes: ready/play/pause/ended/timeupdate/seeked/error + getDuration/getCurrentTime methods); one detector covers Bunny Stream (documented support), api.video, Streamable, SproutVideo, and any compliant future vendor; probe limited to known-vendor iframe src patterns + `settings.playerjsOrigins` hint + spontaneous ready envelopes (base protocol has no volume/rate/quality events — those props simply stay absent). Live detection per §7's matrix. **`.video-js` blind-spot fix:** the html5 fallback's `.video-js` exclusion assumes the videojs detector will claim the element, but bundled video.js builds (e.g. the in-page ArvanCloud player) don't expose `window.videojs` — the html5 detector must claim `.video-js`-wrapped videos when `window.videojs` is absent, else neither detector attaches.
- **Chakavak** (`chakavak-file-storage`): compat backlog per §8, filed as issues with the Chakavak team; the `window.aai` fanout gate is release-coupled with the pack canary.
- **Tracker/SDK**: `track()`/wire unchanged. Pagehide/interrupted path uses the existing sendBeacon flush.
- **Core (later, api-v2 era)**: heartbeat quota exemption (R5) in quota counting; seeder (Task 1.2) reproduces this catalog.
- **Wireframes/PRD**: v34 stale download cell; TTFF/EBVS cards can drop their "next phase" chips once this SDK ships (both auto-collectable — an upgrade vs the PRD's assumption).

## 11. Doc reconciliation (single-canon actions)

1. **Strategy catalog §7.3**: correct `video_buffered` (remove stall wording; add `buffer_duration_ms`); add `video_stalled`, `video_play_intent`, `video_volume_changed`, `video_subtitle_changed`, `video_impression`, `video_download`, `video_cta_clicked`, `video_intro_skipped` (reserved); add `from_quality` to `video_quality_changed`; add `playback_source` (incl. `continue_watching`) + `startup_time_ms` to `video_started`; align prop spellings with §3. VOD-pack cleanups: the referenced-but-never-defined `startup_time_measured` event resolves to the `startup_time_ms` prop on `video_started`; `playback_session_id` is now a base prop (§3.1); the `video_concurrent_viewers_sampled` custom candidate is superseded by heartbeat-derived concurrents (§7).
2. **PRD-Dashboard-Video**: replace `video_*` spellings with the `media_*` canon (alias table for GA4 export stays); Schema-notes section updated (`video_stall`→`video_stalled`, `video_buffer`→`video_buffered`, `video_quality_change`→`video_quality_changed`, autoplay-merge note now points at `playback_source` on `video_started`); resolve pack-numbering drift (catalog "Pack 1" wins).
3. **Runbook** (`Events-Service/Runbook-Events-Operations.md`): seed-change procedure entry for this re-cut; note the SDK site contract (annotations + `track()` fallbacks) as a customer-facing doc dependency.

## 12. Testing & acceptance

- Existing vm-harness pattern per detector; fake-timer control for settle windows/heartbeat/watchdog.
- Normalizer unit tests: quality maps, volume scaling, clamps, enum discipline.
- Cross-player consistency: identical scripted interaction sequence on ≥2 stubs yields identical normalized props.
- APS bridge: vm-harness stub iframe exchanging `aps.player` v1 envelopes (ready handshake → event mapping → detach); double-count guard asserted (no direct `aai` legacy events consumed when the detector claims the iframe).
- Vimeo: vm-harness stub iframe speaking Vimeo's postMessage envelope shape (event subscription → mapping → detach); claim/exclusion asserted both ways vs Plyr-wrapped and Vidstack-wrapped Vimeo (wrapping detector wins).
- Player.js: vm-harness stub speaking the Embedly envelope shape (ready → subscribe → play/timeupdate/ended mapping → detach); non-implementing iframe stays silent and unclaimed; claim precedence vs vimeo/aps/youtube (src-pattern disjoint, shared iframe WeakSet).
- Live rules: stubbed live stream (`duration Infinity` / `isLive`) asserts milestones+90%-completion suppressed, heartbeats unaffected, `behind_live_sec` present on seeks.
- Registry seed validates against `registry-contract.schema.json` (python3 jsonschema, in Docker); collector `go test -short` green (validation is data-driven — seed swap must not need code edits; if it does, that's a finding).
- Size gate per R6: pack ≤ 14 KB gz hard, min advisory. Report sizes in the MR.
- No event outside this catalog; no prop outside §2/§3; `progress`/`completed` discipline verified (once-per-handle, 90% rule).

## 13. Out of scope

Read-model/GraphQL (Phase 5 spec), api-v2 registry endpoint (Tasks 1.1–1.4), billing mechanics of R5 beyond the ruling, Aparat/ArvanCloud iframe event integrations (no API exists — §9.2 tiers; vendor partnerships are a business track), the tier-3 server-side stats importer (separate feasibility spike + service, GSC-pipeline pattern), Chakavak-side bridge changes (filed as their backlog, §8), audio/VOD detector work (the family supports them; only `media_type=video` detectors ship now — the `aps` detector covers Chakavak VOD/live as embedded video), wireframe HTML edits.

## 14. Pack entity model & entitlement (CTPO concerns, added 2026-07-21, rewritten 2026-08-11 — binding on api-v2 Task 1.1)

> **Rewritten 2026-08-11** per `2026-08-11-event-platform-v1-design.md`. The
> previous §14 encoded plan-gated packs, `maxCustomEvents = 0` and
> downgrade-to-quarantine, contradicting Decisions 1, 2, 6 and 12. It was
> declared binding on api-v2 Tasks 1.1–1.4 and scheduled into the first
> migration; that binding is withdrawn.

The pack is a first-class entity spanning two axes; the api-v2 implementation must keep them separate:

```
Business   { id, key, title, status }              -- the unit of delivery (Decision 2)
Pack       { id, key, title, kind: vertical|horizontal, status }
BusinessPack { businessId, packId }                -- many-to-many (Decision 10: video is horizontal)
ProjectPack  { projectId, packId, settings JSON }  -- per-project enablement (design B5)
```

**Effective packs = enabled(project). No plan intersection.**

Rules:
1. **Public vs private packs.** Public = Shahin-predefined (system/canonical/video, this spec). Private = a customer's custom events (the strategy doc's Tier-4), modeled as `EventDefinition`s inside a pack with `visibility:'private'` + `ownerAccountId` — the same registry machinery (validation, quarantine, versioning, debug view) reuses unchanged. **Model now, ship later:** the `visibility`/`ownerAccountId` columns land in the FIRST migration (columns are free; later migrations aren't), but private packs stay phase-2 because they break the collector's single-global-registry assumption: event names become per-tenant (two customers WILL both define `order_shipped`), so collector validation must become `Get(name, token)` and the registry wire contract needs a v2 with per-tenant scoping. That contract-v2 + collector change is the explicit gate for shipping private packs.
2. **Billing events never touch pack configuration.** `ProjectPack` rows are created and removed only by explicit project action; plan changes have no effect on pack enablement — no plan gate exists to remove (§14 axes above).
3. **Provider selection is a delivery concern, not a schema concern.** `ProjectPack.settings.providers`: array from the closed set `html5|plyr|videojs|vidstack|shaka|jwplayer|youtube|vimeo|playerjs|aps`, or the string `"auto"` (= all; the default). It changes which detector artifacts the merger inlines (R6 follow-up) — the event schema is identical regardless of provider (the single-schema principle), so the registry contract does not change. The sites payload's existing `eventPacks: [{key, settings}]` shape carries it as-is.
4. **Data-suggested narrowing (product touch, stretch).** Shahin already knows which `provider` values actually emit per project; the dashboard should surface "this project only fires provider=youtube — narrow the pack and save ~9 KB gz per visitor" as a one-click setting. Trivial query, real differentiation.

### §14.1 Phase-2 proposal — custom events (private packs): naming, entitlement, lifecycle (CTPO, 2026-07-21)

Phase-2 scope (do NOT implement with Tasks 1.1–1.4), but the rules below are **day-one constraints on the data model** — later migration is the expensive path.

1. **Reserved private namespace (the collision ruling).** Custom event names MUST match `^c_[a-z][a-z0-9]*(_[a-z0-9]+)*$` — the `c_` prefix is mandatory for private, forbidden for public. This eliminates all three collision classes at once: tenant×tenant (uniqueness scoped `(ownerAccountId, name)` for private, global for public), tenant×future-public (publishing any future public pack can never collide with any customer's event), and resolution ambiguity (no shadowing rules exist: `c_*` resolves ONLY in the tenant's map, everything else ONLY in the global map — deterministic, zero precedence logic). Raw-name ugliness is free: dashboards render Persian labels (`EventDefinition.title`), never raw names. Precedent: GA4 reserves `ga_`/`google_`/`firebase_`; we reserve everything except `c_`.
2. **Plan changes never affect event acceptance.** Retention depth is the only plan lever (Decision 8), applied as a read-time window clip over per-row `RetentionDays` — never as an ingest gate and never as a data deletion.
3. **Customer schema lifecycle.** Custom definitions evolve minor-additively only (new OPTIONAL props); a prop TYPE change requires a new event name — otherwise historical rows are silently poisoned under the changed schema. `status: draft → active → retired`; a retired definition stops being a validation target — rows already stored stay readable, and later rows are still stored and annotated per the collector's validity flags (Decision 6), never quarantined.
4. **Contract v2 + collector routing (the shipping gate for this whole section).** Registry payload v2 adds per-token custom sections alongside the global catalog (single payload, same poller/ETag machinery; growth = total custom definitions across tenants — trivial at fleet scale). Collector: `SchemaRegistry.Get(name, token)` routes by prefix (`c_*` → tenant map only; else global map only). Until contract v2 + this collector change ship, no private pack is served.
5. **Developer-experience mitigation.** GA4/Mixpanel migrants will `track('order_shipped')`; the event is stored with an `unexpected_name` annotation, not quarantined (Decision 6). The Phase-5 debug view surfaces `unexpected_name: order_shipped` with the hint "create the custom event `c_order_shipped`?"; SDK docs lead with the rule.

**Day-one consequences for api-v2 Tasks 1.1–1.4:** the `EventDefinition` name-format constraint (public regex rejects `c_`; the `c_` pattern is reserved) and `EventPack.visibility`/`ownerAccountId` columns land in the FIRST migration. Everything else in §14.1 waits for phase 2.
