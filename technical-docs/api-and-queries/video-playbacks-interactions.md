# Video: per-video playback errors and in-player interactions (design)

> Status: **DRAFT for owner approval** (2026-11-17; owner rulings: forward-only, §8 Q1 = fix the SDK first). Issue #705, the two "outside" items the owner pulled back in:
> per-video error rate (VW-63, engine-13.md N-5) and in-player interactions with the seek heatmap (VD-31, VW-68,
> VW-71; decision #71). Nothing is built and no DDL has run. Evidence labels: **verified** (read in code or measured
> on prod), **inferred**, **guess**.

## 1. Intent

The video detail panel shows an empty-state card for the playback error rate of one video and for the in-player
interactions and seek heatmap (issue #705). The data exists in `Records`; no rollup keeps it in a shape the video
reads can use, and video reads rollups only (owner 2026-09-26). This design adds two archive rollups and the core-api
reads that serve them, so front-cp can replace the empty states with real values.

## 2. Goals, non-goals, anti-goals

**Goals**
- G1. `errorRate` per video (VW-63). `exitBeforeStartRate` and `playbackCompletionRate` per video come from the same
  rows and are served with it (N-5 lists all three).
- G2. In-player interactions per video (VW-68): count and share of playbacks per action — seek forward, seek back,
  mute, fullscreen enter, speed change, subtitles on.
- G3. Seek heatmap per video (VW-71): seeks per 5 % position bucket of the video, split by direction; the hotspot is
  the bucket with the most seeks.

**Non-goals**
- History before the rollups exist. **Owner 2026-11-17: forward-only.** No backfill from `Records`.
- Share and skip-intro (VW-68 rows): the SDK emits neither event (verified: no `video_shared` / intro-skip emit in
  `packages/sdk-javascript/analytics/packs/src/`). They stay outside until the SDK sends them.
- Pause, unmute, volume level, fullscreen exit, subtitles off: not on VW-68 (unmute is also not derivable, §5.2).
- Any change to the site-level playback reads: they keep `TVideoPlaybacksDaily` and its full history.
- Ad breaks (`ads_video_*`).

**Anti-goals** (a build that does these has failed even if it works)
- A change to `Records` or to any existing table or view on the prod archive (owner 2026-10-14: additive only).
- A raw `Records` read on the request path.
- A number that mixes days before the rollup existed with days after it without saying so.
- A number computed on the client: front-cp shows only what core-api returns (issue #705 display rule).

## 3. Facts the design rests on (verified, prod archive, read-only, 2026-11-17)

One UTC day (2026-11-15), content placement, `Mode = 110`, three video projects (CHyjot2edlsQ, StoIBjKhoqOv,
JkJA9zqErFCM):

| Fact | Numbers |
| --- | --- |
| `video_error`, `video_play_intent`, `video_started` carry `video_id` and `playback_session_id` | 100 % of rows |
| A playback (`playback_session_id`) carries more than one `video_id` | 0 of 50,960 playbacks |
| `video_seeked` carries `video_id`, `video_duration`, `from_position_sec`, `to_position_sec` | 100 % of rows |
| Seeks per day | 3,071 / 25,353 / 18,226 |
| Seeks with `to = from` (no displacement) | 1,003 (33 %) / 6,959 (27 %) / 15,999 (88 %) |
| Seeks with a position beyond `video_duration` | 8 / 230 / 7; none negative |
| `video_volume_changed` / `video_fullscreen_toggled` / `video_rate_changed` per day | 545 / 505 / 197 (CHyjot2edlsQ); 13,730 / 23,129 / 1,992 (StoIBjKhoqOv) |
| `video_subtitle_changed` per day | 1 / 4 / 0 |

SDK (verified, `02-media-session.js`): every media event goes through one `doEmit`, which stamps
`playback_session_id` (created when the player attaches, `:307`, so pre-play events have one), the video id and
`position_sec`. `video_volume_changed` carries `muted` and fires on any change of the `volume|muted` pair (`:707-710`),
so a volume move while muted emits another `muted = true` row: a `muted = true` row is a muted state, not a mute
action. `video_fullscreen_toggled` carries `fullscreen_state` (`enter` / `exit`). `video_rate_changed` carries
`playback_rate` and always fires on the first change after attach (`:781-790`); `video_subtitle_changed` carries
`subtitle_enabled`.

By player (same day and projects; the builder check of 2026-11-17 asked for the split):

| Player | Seeks | `to = from` | of which at 0 s | forward | back |
| --- | --- | --- | --- | --- | --- |
| chakavak | 28,702 | 7,471 | 6,543 | 8,022 | 13,209 |
| html5 | 16,091 | **15,668 (97 %)** | 36 | 271 | 152 |
| plyr | 1,857 | 822 (44 %) | 0 | 1,004 | 31 |

| Event (player) | Rows | at `position_sec ≤ 1` | other |
| --- | --- | --- | --- |
| `video_volume_changed` (chakavak) | 14,268 | 11,422 | 2,182 with `muted = true` |
| `video_rate_changed` (chakavak) | 2,196 | 1,922 | 2,119 at a rate other than 1 |

## 4. Approaches

**Per-video error rate**
- **A (chosen): a new rollup with the video id**, `TVideoPlaybacksByVideoDaily`, the per-playback grain of
  `TVideoPlaybacksDaily` plus `VideoID`.
- B: add `VideoID` to `TVideoPlaybacksDaily`. Rejected: an `ALTER` of an existing prod table (anti-goal).
- C: read `Records` for a VIDEO-filtered error rate. Rejected: video reads rollups only (owner 2026-09-26).

**Interactions and heatmap**
- **A (chosen): one rollup `TVideoInteractionsDaily`** (decision #71's proposal): day × video × action × position
  bucket, with the count and the distinct playbacks per cell.
- B: one rollup per card (interactions, heatmap). Rejected: the same events, keys and grain twice.
- C: pre-computed shares in the rollup. Rejected: a share over a window is not a sum of daily shares.

**History** — owner 2026-11-17: **forward-only**. Backfill was the alternative (full history at once, one large
`Records` scan per rollup).

## 5. Design

### 5.0 SDK fix first (owner 2026-11-17, §8 Q1 = a)

The html5-family detectors (`90-detector-video-html5.js`, `50-detector-video-shaka.js`, `20-detector-video-plyr.js`,
and any other detector that reads `currentTime` at `seeking`) record `from` from the last position the session saw
before the seek (the last `timeupdate`), not from `currentTime` at `seeking`. The unit tests reproduce a browser that
already reports the target at `seeking` (the current `video-videojs.test.js:489-492` fixture sets the old time first,
which hid the bug). The fix ships through the normal analytics SDK release to the served script
(`.claude/skills/video-pack.md` release chain). The verification is a prod read: html5 seeks with `to = from` fall from
97 % to near 0 after the release.

### 5.1 `TVideoPlaybacksByVideoDaily` (archive)

```sql
CREATE TABLE analytics.TVideoPlaybacksByVideoDaily
(
    `Day` Date,
    `PublicInstanceID` LowCardinality(String),
    `VideoID` UInt64,
    `PlaybackSessionID` String,
    `Source` SimpleAggregateFunction(max, LowCardinality(String)),
    `Intent` SimpleAggregateFunction(max, UInt8),
    `Started` SimpleAggregateFunction(max, UInt8),
    `Completed` SimpleAggregateFunction(max, UInt8),
    `Errored` SimpleAggregateFunction(max, UInt8),
    `ErrorSourceType` SimpleAggregateFunction(max, LowCardinality(String))
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(Day)
ORDER BY (PublicInstanceID, Day, VideoID, PlaybackSessionID)
TTL Day + toIntervalDay(400);
```

The view `MvVideoPlaybacksByVideoDaily` is `MvVideoPlaybacksDaily`'s body (same `Records` filter: `Mode = 110`,
`Valid = 1`, content placement, the four event names, a non-empty playback id) with
`cityHash64(CAST(Props.video_id, 'String')) AS VideoID` added to the SELECT and the GROUP BY. `VideoID` uses the
hash every other video rollup uses (`MvVideoQualityDaily`), so a VIDEO filter resolves the same way. A playback has
one video id (§3), so the key splits no playback.

### 5.2 `TVideoInteractionsDaily` (archive)

```sql
CREATE TABLE analytics.TVideoInteractionsDaily
(
    `Day` Date,
    `PublicInstanceID` LowCardinality(String),
    `VideoID` UInt64,
    `Action` LowCardinality(String),
    `Bucket` UInt8,
    `Events` SimpleAggregateFunction(sum, UInt64),
    `Playbacks` AggregateFunction(uniqCombined, String)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(Day)
ORDER BY (PublicInstanceID, Day, VideoID, Action, Bucket)
TTL Day + toIntervalDay(400);
```

`MvVideoInteractionsDaily` reads `Records` (`Mode = 110`, `Valid = 1`, content placement, the five event names
below, a non-empty playback id). `Action` is derived per row; a row that maps to no action is dropped:

| Event | Condition | Action |
| --- | --- | --- |
| `video_seeked` | `to − from ≥ 1` s | `SEEK_FORWARD` |
| `video_seeked` | `from − to ≥ 1` s | `SEEK_BACK` |
| `video_seeked` | `|to − from| < 1` s and `to < 1` s | dropped: the player's start-up seek to 0 (§7, A1) |
| `video_seeked` | `|to − from| < 1` s and `to ≥ 1` s | dropped: no displacement (after the SDK fix, §5.0, a real seek always moves) |
| `video_volume_changed` | `muted = true` and `position_sec > 1` | `MUTE` (muted during playback) |
| `video_fullscreen_toggled` | `fullscreen_state = 'enter'` | `FULLSCREEN` |
| `video_rate_changed` | `playback_rate ≠ 1` and `position_sec > 1` | `SPEED_CHANGE` |
| `video_subtitle_changed` | `subtitle_enabled = true` | `SUBTITLES_ON` |
| `video_started` | any | `PLAYBACK_STARTED` (internal: the base of `interactionRate`, never served as a row) |

The `position_sec > 1` conditions keep the player's own start-up state out: a muted autoplay and a speed restored
from a saved preference fire at the first frame (11,422 of 14,268 volume rows and 1,922 of 2,196 rate rows sit at
`position_sec ≤ 1`). MUTE is a stateless fact, "muted during playback": a repeated row in one playback adds to
`Events` but not to `Playbacks`, and the share reads `Playbacks`.

`Bucket` is the seek's landing position: `least(19, floor(20 × to ÷ video_duration))` for a seek with
`video_duration > 0` (a position beyond the length lands in the last bucket), and `255` ("no position") for every
other action and for a seek without a length. `Events` is the row count; `Playbacks` the distinct playback ids.
Events are stateless (owner 2026-10-25): no action depends on a previous event, which is why unmute (`muted = false`
also fires on a plain volume change) is not derivable and stays out.

### 5.3 Migration (archive)

One owner-run file, `apps/analytics-archive/scripts/migrate/<date>-video-playbacks-interactions-v1.sql`, shaped
exactly as `20261108-video-by-video-v1.sql`: the OWNER REVIEW header, the insert-budget gate (STEP 0c), tables
(STEP 1) before views (STEP 2), the shape assertions (STEP 3), the rollback (views first). Both views fire inside
every `Records` insert, so they use total expressions only (no cast that can throw on a malformed prop:
`toFloat64OrZero`, `CAST(… , 'String')`). The schema dump files under `schema/historical/` gain the four objects.
No `Records` column, existing table or existing view changes; the archiver needs no pause.

**T0** is the first whole UTC day after the views are created on prod. The rollups hold no complete day before it.
MR 1 runs only after the SDK fix (§5.0) is live on the production served script, so every interaction row from T0 on
carries a true `from`.

### 5.4 core-api reads

Two new video sources, each with its own first instant `T0` (a constant set in the reader MR, as
`QUALITY_EVENTS_FROM`):

- `videoPlaybacksByVideo` (`TVideoPlaybacksByVideoDaily`). **Routing:** `errorRate`, `exitBeforeStartRate` and
  `playbackCompletionRate` read it when the request keys or filters by VIDEO; otherwise they keep
  `TVideoPlaybacksDaily` (full history at site level). `dimensionsHeldBy` for the three measures gains VIDEO;
  `playbackCompletionRate` keeps PLAYBACK_SOURCE on the old source only.
- `videoInteractions` (`TVideoInteractionsDaily`). Two new `VideoGrouping` values on `analyticsVideos`:
  - `INTERACTION`: a row per action key (the closed vocabulary above), measures `interactions` (Events) and
    `interactionPlaybacks` (Playbacks), and `interactionRate` = `interactionPlaybacks ÷` the `PLAYBACK_STARTED`
    row's Playbacks over the same videos and window. Both terms come from the one rollup (the reader's rule: a
    measure's parts come from one source, `video.ts:178`), so no ratio mixes days or sources. Capped at 1 (a pre-play mute on a playback that never started), as
    `COMPLETION_CAP`; null over zero started playbacks.
  - `SEEK_POSITION`: a row per bucket 0–19 (key = the bucket's start percent, `"0"` … `"95"`), measures
    `seeks` (all seek Events landing in the bucket), `seeksForward` and `seeksBack`. Bucket 255 is never a row. The
    hotspot is the row with the most `seeks`; the client reads it from the rows, as it reads any top row.

  Both groupings take VIDEO as a filter (the detail panel) and nothing else (`measure-not-available-for-dimension`
  for any other dimension), and serve the site total when unfiltered.

**Windows before T0.** No response may mix days before T0 with days after it without saying so (anti-goal 3), and
the client cannot know T0 unless it is told (builder check: `analyticsDataRange` reads the site's first hit, not a
rollup's). So:
- A call that selects a measure of the two new sources (per-video `errorRate` / `exitBeforeStartRate` /
  `playbackCompletionRate`, every `INTERACTION` and `SEEK_POSITION` measure) together with a measure of any other
  source is refused by name, as `mixed-window-grain` refuses video plus non-video today: the client makes two calls.
- In such a call the server moves the window's start to T0 when it starts earlier, and echoes the moved window in
  `summary.range` ("The window applied", `analyticsQuery.graphql:967`). The client labels the card "since <range.from>"
  whenever it differs from the asked start. No new contract field.
- `previous` and `change` are null when the comparison window starts before T0 (decision #72).

The screen document therefore splits `VideoDetail`'s per-video error fields into their own query
(`VideoDetailHealth`), beside `interactions` and `seeks`.

**Contract:** the new groupings, the three measures above and the action keys are added to
`analyticsQuery.graphql` and to the design draft `contract.graphql`; `screens/video.graphql` adds `errorRate`,
`exitBeforeStartRate` to `VideoDetail`'s measures and two queries (`interactions`, `seeks`) to `VideoDetail`.
`coverage.json` moves VD-31, VW-63, VW-68, VW-71 from outside to served; group-4.md N-5 and G4-Q11 record it.

### 5.5 Rollout

0. **MR 0 (packages/sdk-javascript/analytics):** the seek `from` fix (§5.0), released and live on production; the
   prod read confirms html5 `to = from` seeks near 0.
1. **MR 1 (analytics-archive):** the migration file, the schema dump, a throwaway-container run log. Owner review;
   the owner runs it on prod; T0 is fixed from the run.
2. **MR 2 (core-api):** sources, routing, groupings, contract, screen document, tests, changelog fragment. Merged
   only after MR 1 has run on prod: stage core-api reads the prod archive, so a reader naming a missing table breaks
   the Video page (the !1716 rule).
3. **front-cp:** an issue for the front team (front-cp is front-only, not changed here): replace the four empty
   states with the served values.

### 5.6 Tests

- Archive: the migration applied to a throwaway ClickHouse 25.8 with seeded `Records` rows covering every action
  rule, a seek beyond the length, a seek without a length, a zero-displacement seek, a malformed prop; assert the
  rollup rows.
- core-api: unit tests for the routing (VIDEO → new source, none → old), the action and bucket vocabularies, the
  T0 rule; e2e on the dev ClickHouse for both groupings and per-video `errorRate`, and the screen document's
  `VideoDetail` run verbatim.

## 6. Left to the builder

- Names of the GraphQL measures and keys, within the shapes above.
- Refusing VIDEO together with PLAYBACK_SOURCE on the playback measures (the new source holds no source-split
  completion; `playbackCompletionRate` by PLAYBACK_SOURCE stays site-level).
- Per-source T0 and TTL in `videoSourceFrom`.
- Adapting the 20261108 template's pre-flight and post-checks (that file asserts its views read no `Records`; these
  two do).
- The seeded fixture rows and the e2e layout.

## 7. Assumptions, checked on prod (read-only, 2026-11-17, same day and projects as §3)

- **A1 — revised by the per-player split (§3).** Start-up seeks to 0 s are chakavak's (6,543 of its 7,471 `to = from`
  rows) and are dropped. But html5's seeks are 97 % `to = from` at mid-video positions: the html5-family detectors
  read `from` from `currentTime` at the first `seeking` event (`90-detector-video-html5.js:399-401`,
  `50-detector-video-shaka.js:533-535`, `20-detector-video-plyr.js:518-521`), when browsers already report the target.
  These are real seeks whose `from` the SDK lost; `to` is right. See §8 Q1. The first reading follows, kept for the
  record.
- *First reading (superseded):* Of the `to = from` seeks, 6,133 of 6,959 sit at exactly
  0 s on StoIBjKhoqOv, and the median position is ≈ 0 % of the video on JkJA9zqErFCM (15,999 rows); CHyjot2edlsQ's
  1,003 sit mid-video (median 15 %), consistent with the SDK's 1 s settle window collapsing a scrub that returns to
  where it began. None lacks a `from`. Players: chakavak, html5, plyr. They carry no direction and no displacement, and
  would swamp bucket 0, so the design drops them (`|to − from| < 1` s).
- **A2 — superseded by the SDK reading in §3:** a `muted = true` row is a muted state; MUTE is defined as "muted during
  playback" (§5.2). *First reading:* Playbacks with a mute row: 145 / 36 / 1,986; with more
  than one: 3 / 2 / 27 (1–2 %), and those also carry unmute rows, the shape of mute → unmute → mute.
  `interactionPlaybacks` counts distinct playbacks, so a repeated mute cannot inflate the share.

## 8. Owner decisions

- **Q1 — html5 and plyr seeks lose their direction. Ruled 2026-11-17: (a), fix the SDK first.** 15,668 of html5's 16,091 seeks (and 822 of plyr's 1,857) arrive
  with `from = to` because the detector reads `from` too late. Their landing position is right, their direction is
  not. Options:
  - **(a) Fix the SDK first** (record `from` from the last position before `seeking`), release it, and set T0 after
    the release. The heatmap then has a direction for every player from day one. Cost: one SDK MR and release before
    MR 1 runs.
  - (b) Ship now and count these as seeks with no direction: they add to `seeks` (density, hotspot) but to neither
    `seeksForward` nor `seeksBack`, and to no `SEEK_*` interaction row. The SDK fix follows; direction fills in from
    its release.
  - (c) Drop them: html5 sites get almost no seek data.
