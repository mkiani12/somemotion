# P6 — video dashboard: closing the open sections (design)

Owner asked (2026-09-27) to make items 3–9 clear, complete the dashboard, then
deploy. Facts below were measured on the archive on 2026-09-27 (content rows,
since the 2026-09-25 cut-over; archive current to 18:59 UTC).

| # | Section | Verdict | Work |
|---|---|---|---|
| 3 | Replay rate by date range | buildable | one table replaces `TVideoUserSessions` |
| 4 | Videos viewed + per-video table | buildable after an SDK identity fix | SDK + read-time grouping |
| 5 | Search visibility | buildable as a labelled estimate | GSC join by page, no new GSC collection |
| 6 | Ad breaks (IMA pre/mid/post-roll) | buildable, largest item | IMA detector + Chakavak bridge patch + rollup |
| 7 | Playback error rate | **buildable now** — the data is real | formula + one SDK context prop |
| 8 | Download rate, avg video duration | duration: **a bug, not missing data**; downloads: one column | MV fix + backfill; one state column |
| 9 | Page engagement share | last phase (owner) | — |

## 3. Replay rate over the selected range

**Today.** `TVideoUserSessions` is keyed `(PublicInstanceID, Placement,
VideoID, CidUserChecksum)` with no day, so it can only answer "all time".

**Proposal.** Replace it with `TVideoUserSessionsDaily`, the same states with
`Day` in the key: `ORDER BY (PublicInstanceID, Day, Placement, VideoID,
CidUserChecksum)`. Replay over any range = merge the `uniqExact` session states
across the range's days per (video, user), then count users with ≥ 2. The
all-time figure stays available as the range from the first collected day.
One table, not two (ADR-0062: one fact, one home).

- **Definition within a range:** a user replays if they watched the same video
  in ≥ 2 separate sessions *both inside the range*. A user who watched once
  last month and once this week does not count for "this week". This is the
  honest reading of "in the selected range".
- **Size:** ~100 k rows/day for the heaviest project → ~9 M at 90 days; the
  replay query groups those per (video, user) — expected well under a second,
  to be benched before switching.
- **Cost of the change:** new table + MV, backfill from raw (two days of data),
  drop the old table after the builder switches. Archive DDL → owner approval.

## 4. Videos viewed and the per-video table — what blocks them

Content plays since the cut-over, by `video_id` class:

| Provider | id class | Starts |
|---|---|---|
| html5 | element id / other | 755 695 |
| html5 | **synthesized `html5-media-<n>`** | **531 714** |
| chakavak | URL | 165 734 |
| html5 | URL | 101 454 |

- **Synthesized ids are 34 % of all content plays** — `html5-media-1` alone is
  341 k starts across 52 projects and 47 959 pages. The counter restarts on
  every page view, so every "first unidentified video" on every page is one
  row: the per-video table would rank one fake video first on most sites.
  Top sites: fararu.com, bartarinha.ir, 7sobh.com, faradeed.ir, rokna.net.
- **Ad units still leak** into content (0.4 % of content starts, but they rank
  at the top of per-video lists): the per-session `tavoos` miss, plus ad ids the
  patterns do not cover — e.g. `yn-video-pre_roll-388` (Yektanet in-player
  pre-roll).

**Proposal.**
1. **SDK identity upgrade** (`01-media-props.js`): resolve a stable id from, in
   order, `data-shahin-media-id`, element id, `currentSrc`/`src`/first
   `<source>` (never a `blob:` URL), `poster`, and finally
   `page-path + '#' + DOM index of the video`. Re-resolve at first play if the
   id was still synthesized at attach (sources are often set lazily), and keep
   `playback_session_id` as the join key across the switch. This removes the
   collision instead of hiding it.
2. **Read-time grouping** for anything that still has no id: one
   "unidentified videos" row, kept in every total (measured 33 ms).
3. **Ad patterns:** add `yn-video` (config only, same zero-downtime switch).
4. **Videos viewed** = distinct identified videos + nothing for the
   unidentified row (it cannot be counted as N videos). Label the card with the
   identified share until the SDK fix has aged in.

## 5. Search visibility — an estimate from GSC we already have

The GSC ClickHouse holds, per project, `SearchConsoleData (publicToken, date,
page)` and `SearchConsoleDataWithQuery (… page, query)`. `TVideoDaily` holds,
per (video, page), plays and the canonical page key (`PageID` =
`cityHash64(canonical path)`). GSC reports canonical URLs, so pages join on
the canonical path.

**Funnel (per project, range):**

| Step | Source | Exactness |
|---|---|---|
| Impressions in Google | GSC impressions of pages that carried a content video in the range | page-level, attributed to the video on it |
| Clicks | GSC clicks on those pages | page-level |
| Plays from search | video starts on those pages whose session referrer is Google search (`SRefererURLExternalType = search`, Google host) — `TVideoDailyFilterable` has the referrer columns | **estimated** (amended 2026-10-02, see below) |

> **Amendment 2026-10-02 (owner-approved): plays from search are estimated.**
> The Google app referrer (`com.google.android.googlequicksearchbox`, stored
> as the host) mixes Search and Discover — about 21 % of "search" plays on the
> bench. Per page: `web + app × S/(S+D)`, S = GSC search clicks, D = GSC
> Discover clicks (`DiscoverData FINAL`); a page with S+D = 0 takes the
> project ratio over the matched pages, then 1. No correction (ratio 1) when
> the project's Discover data does not reach the range end within 3 days
> (GSC lag; a stalled Discover feed never passes as corrected). The contract
> has no flag for "corrected"; the tooltip copy says "estimated". S counts all
> search clicks (web + app) while only app plays are split, so the estimate
> leans high for app-heavy pages. Implementation:
> `apps/core-api-legacy/src/DTO/Analytics/Video/VideoOverviewRealReport.js`.

- **Queries that led to plays:** each video page's plays-from-search, split
  across that page's GSC queries in proportion to their clicks. Estimated,
  and labelled so (tooltip copy, 2026-10-02). The denominator is the page's
  `SearchConsoleData` clicks, so anonymised queries stay unattributed; top 6.
- **Index health:** *indexing rate* = video pages with ≥ 1 GSC impression ÷
  video pages seen playing in the range. *Valid schema* needs the page's
  `VideoObject` JSON-LD, which GSC's API does not expose per URL at scale, but
  our script is on the page: a new impression prop `has_video_schema`
  (the SDK reads `script[type="application/ld+json"]` once per page view) makes
  it exact.
- **Two clusters, no cross-cluster SQL:** the archive query returns the video
  pages (≤ a few thousand keys per range); the GSC query takes those keys; the
  DTO joins. Both statements bounded by project + range.
- Gated like every GSC section: shown only when the project granted GSC access,
  otherwise the section's existing empty state.

## 6. Ad breaks: IMA detector and the Chakavak bridge

**Registry today:** `ads_video_started`, `ads_video_completed`,
`ads_video_skipped`, `ads_video_clicked`, each with `ad_position`
(pre/mid/post); only the jwplayer detector emits them.

**PRD zone 4 needs:** ad completion, skip, ad-driven drop-off (the user left
during the ad), CTA click rate — overall and per position.

**Proposal.**
1. **Registry:** add `ads_video_error` and `ads_video_quartile`
   (`ad_quartile` 25/50/75) — drop-off is derived (an ad that started with no
   completed/skipped and no later content event in the playback session).
2. **Page-level IMA detector** (`packs/src/70-detector-ads-ima.js`): when
   `window.google.ima` is present, wrap
   `google.ima.AdsManagerLoadedEvent.prototype.getAdsManager` so every
   AdsManager the page creates gets listeners (STARTED, FIRST_QUARTILE,
   MIDPOINT, THIRD_QUARTILE, COMPLETE, SKIPPED, CLICK, AD_ERROR); position
   from `ad.getAdPodInfo().getTimeOffset()` (0 = pre, −1 = post, else mid);
   the content element the manager is bound to supplies `playback_session_id`.
   Best-effort and try/catch-wrapped (rule #7: never block the host page);
   covers the video.js IMA plugin and hand-rolled IMA integrations.
3. **Chakavak** (IMA runs inside its iframe, invisible to the page): a patch
   for `aps-player-bridge.js` that forwards the same AdsManager events as bridge
   envelopes (`event: 'ad'`, `type`, `position`, `adId`, `duration`,
   `skippable`), plus the matching mapping in `05-detector-media-aps.js`.
   Drafted as a vendor issue with the patch attached; **not submitted until you
   say so** (standing rule).
4. **Rollup:** `TVideoAdsDaily (PublicInstanceID, Day, AdPosition, VideoID)`
   with started/completed/skipped/clicked counts and session states; MV on
   `ads_video_*`.

Banner ad units stay excluded (`placement = 'ad'`); these are ad *breaks
inside content videos*, a separate family by the 2026-09-22 ruling.

## 7. Playback error rate — the data is real

| Error code | Errors | …after a play intent | …and never started |
|---|---|---|---|
| `html5:4` (source not supported) | 136 805 | 127 426 | 125 081 |
| `html5:3` (decode) | 18 051 | 16 896 | 9 624 |
| none (Chakavak) | 8 146 | 2 890 | 76 |

91 % of `html5:4` errors follow a real play intent and the video never
started — exactly the PRD's "failed before the first frame". 70 % come from one
site (parsnews.com, 31 distinct videos on tag pages), which points at that
site's sources (e.g. HLS served to a plain `<video>` on non-Safari browsers):
a real customer problem the card exists to surface, not detector noise.

**Proposal.**
- **Formula:** playback sessions with an intent and an error before
  `video_started` ÷ playback sessions with an intent. Fleet today ≈ 7.5 %
  (≈ 135 k of 1.81 M). Needs session states in the rollup
  (`ErrorBeforeStartSessions`), or the same per-playback-session join as the
  per-source completion until the column exists.
- **SDK context prop** `error_source_type` (`mp4` / `hls` / `dash` / `blob` /
  `other`, from the element's current source) so the card can say *why*.

## 8. Download rate and average video duration

- **Duration is a bug in our view, not missing data.** `video_duration` is
  present on 99.8 % of html5 starts and 89.9 % of Chakavak starts, but the MV
  parses it with `toUInt32OrZero(Props.video_duration::String)` — the values are
  floats (`"100.16"`), so it yields 0 and the rollup kept a duration for only
  17.9 % of plays. **Fix:** `toUInt32(round(toFloat64OrZero(…)))` in
  `MvVideoDaily`, recreate the view, back-fill `VideoDurationSec` for the
  collected days (insert duration-only rows; `max` merges them). Then the PRD's
  own ring formula (watch time ÷ duration) and **average video duration** both
  work; the quartile estimator retires.
- **Downloads:** only Chakavak emits `video_download` (7 078 since the
  cut-over); the PRD defines the rate over sessions. **Fix:** add
  `DownloadSessions AggregateFunction(uniqCombined, FixedString(24))` to
  `TVideoDaily` and its MV (metadata-only ALTER), back-fill the collected days.
  html5 downloads (the `download` attribute / controlsList) are a later SDK
  addition if wanted.

## 9. Page engagement share

Last phase by owner ruling.

## Build order

1. **Data fixes, no SDK** (§8 duration + downloads, §7 error rate, §3 replay
   table): one archive DDL change window with backfill; builders + DTO. Makes
   the ring, avg duration, download rate, error rate and range replay real.
2. **SDK** (§4 identity upgrade, §7 `error_source_type`, §5
   `has_video_schema`) + `yn-video` ad pattern; one script-provider deploy
   (collector first if the registry changes).
3. **Per-video table + videos viewed** (§4) once the new ids have aged in.
4. **Search visibility** (§5).
5. **Ad breaks** (§6): registry, IMA detector, Chakavak patch (after your
   go-ahead to submit), rollup, zone 4.
6. **Deploy** core-api-legacy with the page behind `FF_VIDEO_DASHBOARD`, then
   turn the flag on.
7. Page engagement share (§9), last.
