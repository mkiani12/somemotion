# P5 — video dashboard: section inventory (real data vs pending)

Owner rulings this follows (2026-09-26): fleet-wide page, archive rollups only
(no realtime report), banner ads excluded (`Placement = 'content'` everywhere),
ad-video blocking is the last phase, replay rate is all-time per project.
Rule for everything below: **a section is either served from real data or
returned empty** — never mock data in a production response
(`ASM_VIDEO_MOCK` stays a dev-only switch). **Owner ruling 2026-09-26: front-cp
components are not changed for real data — only the data is.** Empty sections
therefore use the shapes the existing components already render as their own
empty state (`[]`, `null` only where the component reads it with `??`), and
the response keeps the mock contract's field names and order.

Mapping source: `Events-Service/PRD-Business-Video.md` zones 1–5, rollups in
`ddl-v2/01_tables.sql`, data checks on the archive 2026-09-26.

| Zone | Section (contract field) | Status | Built from | Why / blocker |
|---|---|---|---|---|
| 1 | Videos viewed (`heroKpis.videosViewed`) | **ready** | `TVideoDaily` distinct `cutQueryStringAndFragment(VideoKey)` with starts, identified ids only; P7 rows are identified by `VideoIdSource` and grouped by `VideoID`, older rows by the legacy shape rule; a page slot counts as a video | identified = an http(s) source URL or a YouTube/Vimeo platform id (owner 2026-09-30: an element id is never a video id). Not counted: synthesized ids, `blob:`/`data:` URLs (MSE mints one per page view), element ids. Fleet 2026-09-26..30: only 15 % of content plays carry an identified id — the P7 SDK identity work (`video_id_source`) fixes that. chakavak.media 2026-09-26..29: 423 |
| 1 | Impression → play rate (`heroKpis.impressionToPlay`) | **ready** | `TVideoDaily` `Starts / Impressions` | PRD marks it "next phase" pending `video_impression`; that event now ships |
| 1 | Video share of page engagement (`heroKpis.pageEngagementShare`) | **pending** | — | needs total time on page from the session table joined to video watch time — a separate design |
| 1 | Search visibility band (`searchVisibility`) | **ready — funnel (plays estimated) + index health + queries (estimated)** | archive: `TVideoDaily` per `PageID` (content starts, `HasVideoSchema` on P7 rows) LEFT JOIN `TVideoDailyFilterable` starts whose session referrer is Google organic search (type 2, name `Google`, host ≠ `discover.google.com`), split into `playsFromGoogleApp` (host = `VideoSqlHelper.GOOGLE_APP_HOST`, `com.google.android.googlequicksearchbox`) and `playsFromGoogleWeb` (the rest), top 2000 pages by plays; GSC page read: `SearchConsoleData FINAL` impressions/clicks for those keys, `page` re-keyed with `QueryHelper.pageIdExpr('page')` (= `PageID`); GSC Discover read (own statement): `DiscoverData FINAL` clicks for the same keys plus the project's Discover coverage (`max(date)` of `DiscoverData` in the range); GSC query read: `SearchConsoleDataWithQuery FINAL` clicks per (page key, query), clicks > 0, capped at 5000 rows by clicks; joined in the DTO, no cross-cluster SQL | P6 §5 (amended 2026-10-02). Gated on the project's GSC plan (`isGSCEnabled`, admins bypass); no plan, no video pages, no GSC connection, a failing archive or GSC search page read, or no video page matched in GSC → `null` (the section's empty state), never a 500. Funnel = impressions → clicks → plays from search on the matched pages, **estimated**: per page `web + app × S/(S+D)` (S/D = GSC search/Discover clicks), project ratio when a page has no clicks, 1 when that is undefined; **no correction** when Discover data does not reach the range end within 3 days or the Discover read fails (it never empties the band) (no contract field says so — documented, copy says "estimated"); rounded. Play-through is not capped. Indexing rate = matched pages ÷ pages seen playing. Valid schema = share of P7-known pages with VideoObject; with no P7 page `indexHealth` is null. **Queries (estimated)** = Σ pages est × query clicks ÷ page `SearchConsoleData` clicks (anonymised remainder unattributed), rounded, zeros dropped, top 6; a failing query read empties only that card (`[]`). Owner question on labelling closed 2026-10-02: estimates served, tooltip copy says "estimated" (en + fa). Page match (path encoding, trailing slash, AMP URLs in Discover) not yet proven on prod data |
| 2 | Avg watch time per play (`watchDepthTime.heroStats`) | **ready** | `Heartbeats × 10 s / Starts` | watch time = heartbeats × `heartbeatMs` (SDK default 10 000, not overridden in served config); resolution one heartbeat (P3 §5) |
| 2 | Total watch time (`watchDepthTime.stats`) | **ready** | `Heartbeats × 10 s` | as above |
| 2 | Completion rate (`watchDepthTime.stats`) | **ready** | `Completions / Starts` | PRD formula `video_completed ÷ video_started` (plays) |
| 2 | Completion rate, session-based (`watchDepthTime.stats`, tone warning) | **ready** | `CompletedSessions / StartedSessions` | the PRD's session twin; chakavak 2026-09-26..29: 257 / 426 = 60.33 % |
| 2 | Replay rate (`watchDepthTime.stats`) | **ready** | `TVideoUserSessions` | all-time per project, labelled as ignoring the date range |
| 2 | Avg completion ring (`watchDepthTime.ring`) | **ready — estimator** | quartiles passed × 25 % ÷ starts | `video_duration` covers only 9.7 % of plays, so the PRD's watch time ÷ duration is replaced by milestones reached; reads low by up to a quarter per play |
| 2 | Avg video duration (`watchDepthTime.heroStats`) | **pending** | — | `video_duration` present on only 9.7 % of content rollup rows |
| 2 | Download rate (`watchDepthTime.stats`) | **pending** | — | PRD defines it over sessions; the rollups store download *counts*, not a session-distinct state |
| 2 | Watch-time trend (`watchTimeTrend`) | **ready** | `TVideoDaily` by `Day` | daily avg watch time per play + started sessions |
| 2 | How playback started (`playbackSource`) | **ready** | shares: `TVideoDailyFilterable.PlaybackSource`; completion per source: join of `video_started` to `video_completed` on `playback_session_id` over raw archive rows (`ASM_TABLE_VIDEO_EVENTS`) | the SDK put the source on `video_started` only; MR !823 carries it forward, after which the rollup alone can answer; the join stays correct either way |
| 2 | Completion funnel, overall (`completionFunnel.overall`) | **ready** | `Starts`, `Milestone25/50/75`, `Completions` | counts of milestone events per play; the PRD tooltip says sessions — label follows the data |
| 2 | Completion funnel by category (`completionFunnel.categories`) | **not collectable** | — | no content-category signal exists; returned empty |
| 2 | Completion rate by channel (`perChannelCompletion`) | **ready after `ddl-v2/06` + `07`** | `TVideoDailyFilterable` by `SRefererURLExternalType` (the Referrer report's channel: 0 Direct, 1 Referral, 2 Organic Search, 3 Social, 4 Email) | rate = `CompletedSessions / StartedSessions` (the tooltip's session definition), `sessions` = distinct started sessions; channels under 100 sessions excluded (`CHANNEL_MIN_SESSIONS`), top 20 by sessions. Needs the `CompletedSessions` column (06) and a per-day backfill (07). Channels only: campaigns are not delivered, and the card's static "excluded campaign" footnote is component text, not data |
| 3 | Stall rate (`playbackHealth.stallRate`) | **ready** | `StalledSessions / StartedSessions` | PRD formula (DISTINCT session) |
| 3 | Playback error rate (`playbackHealth.errorRate`) | **ready** | `TVideoPlaybacksDaily`: errored ∧ never started ÷ attempts (an intent, or a failure without one) | owner 2026-09-30: a load failure emits no intent but is a play that never started (34 of chakavak's 44 errors). chakavak 2026-09-26..29: 30 / 728 = 4.12 %. Its errors carry no `error_code` (vendor bridge); `error_source_type` now records why a load failed |
| 3 | Quality: watch vs download share (`qualityComparison`) | **ready** | `TVideoQualityDaily` heartbeats / downloads | when no rendition is known at all the section is empty, not one 100 % "Unknown" bar — Chakavak's cross-origin bridge reports no quality (100 % unknown on chakavak.media) |
| 3 | Adaptive quality drops (`qualityDrops`) | **ready, empty** | `TVideoQualityShiftDaily` `Trigger = 'adaptive'` | every recorded shift so far is `user`; the PRD counts system drops only, so the honest result today is an empty list |
| 3 | User environment (`userEnvironment`) | **ready** | `TVideoDailyFilterable` device/OS/browser/brand | users, share, buffer rate (`BufferedSessions / StartedSessions`), trend by day; △share null while the previous window predates collection |
| 4 | Ad KPI row (`adMonetization`) | **ready after ddl-v2/08+09 — completion, skip, drop-off; no CTA card** | `TVideoAdsDaily` (ddl-v2/08, backfill 09) summed over the three registry positions; the all-ads row's shares; deltas vs the previous window | the `ads_video_*` **family** is the discriminator, not placement: the JW detector stamps `placement = 'ad'` on every ad-break event, while banner ad UNITS are `video_*` events with `placement = 'ad'` and never reach this table (ruling 2026-09-22). All rates are of STARTED ads, counted by event (no emitter sends `playback_session_id` or an ad id on `ads_video_*`). Skip is over started, not skippable, ads: JW reports `skipoffset` only on click/skip, never on the start. Drop-off = started ads that neither completed nor were skipped (the user left during the ad; an ad that errored after starting counts here — `Errors` is stored for a later split). **CTA click rate is omitted**: the PRD defines it as the site's own in-player CTA (`video_cta_clicked`, over all plays), which no pack emits; an ad click is a different metric (PRD: the ad-click card was removed) and stays in the position table — owner question whether to keep the 3-card row or wait for `video_cta_clicked`. Today only JW emits (≈1 100 starts since 2026-09-25, all pre-roll, 3 projects). Before 08 is applied the section degrades to `[]` |
| 4 | Ad performance by position (`adPerformanceByPosition`) | **ready after ddl-v2/08+09** | `TVideoAdsDaily` per `AdPosition` (pre/mid/post-roll), rows with ≥ 1 started ad, in that order; `overall` from the summed clamped counts | completion + skip + drop-off are exclusive shares of the position's started ads and sum to exactly 100.00 (completed capped at started, skipped at what is left, the rest dropped off; largest-remainder rounding); `overall` sums the CLAMPED counts; click rate = `ads_video_clicked` ÷ started, separate, capped at 100. No started ad → `{ overall: null, positions: [] }` (the card's empty state); before 08 the same |
| 5 | Per-video table (`videos`), detail panel (`videoDetail`) | **table ready; detail panel ready (2026-10-04, block by block below)** | `TVideoDaily` grouped by the identity key (`if(IDENTIFIED, VIDEO_KEY_EXPR, 0)`; key 0 = one "Unidentified videos" row so totals add up), top 50 by plays; previous-window plays for the same ids (growth); `TVideoUserSessionsDaily` per video (replay) | `sharePct` is of the summary's total content starts; `growthPct` null without a previous window or previous plays; `replayRatePct` null when the replay id has no match (legacy URL ids with a query/fragment hash differently from the table key); `pageEngagementSharePct` always null (last phase). Detail panel: see the table below
| — | Deltas vs previous period | **ready with a floor** | same statements, previous window | null (never 0 or ∞) when the previous window starts before collection began, 2026-09-25 15:00 UTC |

Consequences for the contract (components unchanged): `searchVisibility`,
`searchVisibility.indexHealth` and `adPerformanceByPosition.overall` become nullable (their components read them
with `??`); every other pending section is `[]`; environment dimensions come
in the card's order (os, browser, device, brand) with display labels in the
mock's style. Owner-requested exceptions (2026-09-26): `viewers` /
`totalViewers` / `uniqueViewers` renamed to `users` / `totalUsers` /
`uniqueUsers` end to end (contract, store, the three components reading them,
video locale copy en + fa), and the hero card's hardcoded "next phase" chip
removed now that impression→play is real. The use case pins archive-only (freshness trails by up to
~85 min). Known component behaviour left as it is, pending discussion: replay rate is
all-time with no on-page note.

### Zone 5 — detail panel (`videoDetail`), block by block

Opened with the row's `id` (decimal UInt64 `VIDEO_KEY_EXPR`). The id `'0'`
(unidentified group), a malformed id, or an id with no plays in the range
answers `videoDetail: null` — the panel's own empty state (the root field and
`stats.durationSeconds` became nullable; the front-cp selection is unchanged).
TVideoDaily is the only rollup with `VideoIdSource`, so only it evaluates the
key (`VideoSqlHelper.videoScopePredicate`); the rollups keyed by the raw
`VideoID` match `VideoID = key`, exact for P7 rows only, so for a group with
legacy rows (`hasLegacyRows`) those reads are skipped (the replay precedent).

| Block (contract field) | Status | Built from | Why / blocker |
|---|---|---|---|
| Header (`id`, `title`) | **ready** | `TVideoDaily`, the box's own row read (`VideoTableQueryBuilder` `ids: [id]`) | title rule of the box (video title, then page title) |
| Trend (`trend`) | **ready** | `TVideoDaily` by `Day`, key-scoped (`VideoDetailTrendQueryBuilder`) | daily plays, `Completions / Starts` (capped 100), `BufferedSessions / StartedSessions`; zero-filled days |
| Stats: plays, full completion, avg watch, buffer, stall, replay (`stats`) | **ready** | the box row through the overview's `mapVideos`; replay from `TVideoUserSessionsDaily` (`VideoReplayByVideoQueryBuilder`) | same numbers as the clicked row; replay null for a legacy group (box rule) |
| Stats: avg completion, duration (`stats`) | **ready** | `TVideoDaily` summary, key-scoped, through the overview's `metricsOf` | watch time ÷ duration over plays with a duration; duration = mean over those plays; null when no play carried one |
| Stats: unique users (`stats.uniqueUsers`) | **ready** | `TVideoDaily.Users`, key-scoped (`VideoDetailMetaQueryBuilder`) | same `Users` state as the overview's user totals: any event of the video, impressions included |
| Stats: page engagement (`stats.pageEngagementSharePct`) | **pending** | — | last phase (owner); null |
| SEO (`seo`) | **ready, partial** | `TVideoDaily` `HasVideoSchema` on P7 rows (own optional read, `VideoDetailSchemaQueryBuilder`); `VideoKey` when the id is a P7 `source` id or a legacy http(s) URL (never an `explicit` id, which a site may set to its page URL) | `hasValidSchema` true only when a P7 row carried VideoObject; unknown (no P7 row, or the schema read failed) is `null` and the block shows its empty state. Snippet pre-fills name (the box title rule without its 'Untitled video' placeholder), ISO duration, source URL; description / thumbnail / upload date / embed URL are `''` (not collected) |
| Queries (`queries`) | **ready — estimated** | the overview's search-visibility service (`VideoSearchVisibility`) scoped to the video: its pages (`TVideoDaily`, key-scoped) and their Google plays (`TVideoDailyFilterable`, `VideoID = key`), then GSC pages / Discover / queries for those pages | same estimate rules as the band (`mapSearchVisibility`); GSC plan gate (`userRole` now passed by the resolver); `[]` for a legacy group, without GSC, or when nothing matched. For one video, the no-click fallback ratio is computed over THAT video's matched pages, not the project's, so a page's estimate can differ slightly from the band's |
| Retention (`retention`) | **ready — 5 points** | `TVideoDaily` milestones, key-scoped | share of plays reaching 0/25/50/75/100 % at those points of the known duration (capped 100); `null` without a duration or plays — the block shows its empty state, no dip note. Base: milestones ÷ ALL starts, including plays without a known duration (which cannot fire a milestone), so a video with mixed duration reporting under-reads — chosen to match the overview's completion-funnel base |
| Quality (`quality`) | **ready** | the video: `TVideoQualityDaily`, `VideoID = key`; the platform: `VideoQualityBenchmarkQueryBuilder` — every project's content rows, a FIXED trailing 7 days ending at the range's last day (independent of the range start, so the cost is bounded; no cache) | both sides over KNOWN renditions only (unknown / '' / 0p leave numerator and denominator), so players that never report a rendition cannot skew the comparison; the table lists known renditions. Without a platform base (no known rendition, or the read failed) `platformAvg360pSharePct` is null (now nullable) and, when the video has a 360p row (the only case the panel compares), the block is its empty state. `[]` for a legacy group. Cost of the platform read not yet benched on prod (A6b) |
| Device split (`deviceSplit`) | **ready** | `TVideoDailyFilterable` by `UaType`, `VideoID = key` | started sessions; mobile / desktop / tablet only (the panel has no unknown / bot label), shares of all the video's started sessions |
| Player interactions (`playerInteractions`) | **not collectable yet** | — | no rollup carries seek direction, mute, share or subtitle events (`Seeks` has no direction); `[]` |
| Carrier split (`carrierSplit`) | **pending** | — | `TVideoDailyFilterable.GeoIPAutonomousSystemOrganization` exists, but no verified ASN-org → irancell / mci / tci mapping does; `[]` |
| Seek heatmap (`seekHeatmap`) | **not collectable yet** | — | no rollup carries seek positions; empty buckets (the component hides the hotspot note) |

Controller rulings 2026-10-04 (rule: never show a number or warning the data
cannot support; use the component's empty state, never a component change):
- **Unique users** keeps the overview's `Users` definition (any event of the
  video, impressions included), so on autoplay / impression-heavy videos it can
  exceed plays — kept, documented.
- **Legacy groups** keep the replay precedent (raw-VideoID blocks empty) — kept.
- **Platform average** is the platform's: fleet-wide, trailing 7 days, known renditions (above).
- **SEO verdict for a video with no P7 row** and **retention without a
  duration**: RESOLVED (owner exception to the front-cp component rule). The
  backend returns `seo.hasValidSchema = null` (unknown) and `retention = null`
  (no duration or no plays); `SeoSection` and `RetentionSection` render the
  block's card-level `BaseCardEmptyState` for them, with no warning and no dip
  note. No layout change.

Review fixes 2026-10-04: only the row, summary, trend and meta (users, source
URL) reads may fail the panel; replay, the schema flag, the video's quality,
the platform benchmark and the device split each degrade to their block's
empty state with a warning (search already degrades inside its service). The
search service now logs on the caller's logger, so the overview's warnings
keep their namespace.
