# The analytics query engine — the Video dashboard (slice 13)

**Status:** plan, written 2026-10-29 before any slice-13 code; go-ahead the same day. **13a built** (the video
measures on `analyticsTraffic`: `VideoQueryReader`, `domain/query/video.ts`, `readVideoTraffic.ts`; the served
`video { … }`; R13-1 and R13-12; `verify-videos.ts` and `prod-13-columns-probe.sql`, which confirmed the columns on prod 2026-10-29, §7). The team lead adjudicated §5.2-b, c, d, e, f, h, j, k, m and N-1 (the client hides the cards
under a filter); §5.2-a, g, i and l are the owner's, built to the recommendation (one constant or set each). **13b built**
(`analyticsVideos` by VIDEO, PLAYBACK_SOURCE and ISP; video measures on the group-2 breakdowns; ISP on the hit and event
families' raw reads: `readVideoBreakdown.ts`, the keyed reads of `VideoQueryReader`; R13-3, 3s, 4–7, 10; R13-1 and 12
came with 13a; N-7 ruled). **13c built** (2026-10-31: `analyticsSeries` for video, `QUALITY` / `QUALITY_DROP` /
`AD_POSITION`, `qualityDrops`, the `VIDEO_QUALITY` and `AD_POSITION` dimensions, the detail panel run from the screen
document, R13-2, 8, 8d, 9, 11, 13, the R0 verification and the legacy-comparison items; §12). Rulings
this follows:

- #61: one measure vocabulary, `video { … }` on every query, refused by name where its rollup lacks the dimension;
- #68: content only, no `VIDEO_PLACEMENT`;
- #69: VD-4…6 belong to SEO;
- #70: users = any content-video event;
- #71: in-player interactions stay outside;
- #72: a window before a source sums what exists; `previous`/`change` are null;
- #101 (issue #457, !1476, open): session completion is ÷ sessions with a play;
- #102 (issue #458, !1477, on main): the client shows the table's growth as N/A below 100 previous play sessions;
- the general ones: #15 / G2-1 (UTC days), Q-P3 (UTC-day series), F-1…F-12 (F-3 change, F-11 no paging, F-12 read only
  what is asked), G2-Q8 (raw within the span caps).

Paths are under `apps/core-api/`; DDL is under `apps/analytics-archive/schema/historical/`; legacy is under
`apps/core-api-legacy/src/`. Source of every item: `screens/video.graphql`, `coverage.json` (VD-1…32, VW-\*),
`group-4.md`.

**Evidence labels.** _verified_ = read in the repo file named (the repo DDL is "PROPOSED — not dumped", so a column the
fleet probe did not read is verified only as repo DDL); _prod_ = a recorded probe; _inferred_; _unproven_ = §7 lists it
for a probe.

## 1. Facts the design rests on

### 1.1 The sources (repo DDL; rows per project from `g4-project-*.out`, 2026-10-27, ~33 days of data)

| Id  | Table (sort key after `PublicInstanceID, Day`)                                                                                   | Holds                                                                                                                                                                                                                                                  | pPUs rows | CHyjot rows               |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------------------------- |
| F   | `TVideoDailyFilterable` (`Placement, VideoID, PageID, PlaybackSource`, UA, screen, geo, ASN org, P/S referrer, UTM, `PKeywords`) | sums: Impressions, Starts, Completions, Heartbeats; uniq: Started/Stalled/Buffered/Error/Completed sessions, Users, Sessions                                                                                                                           | 10.07 M   | 9.49 M (ad rows included) |
| D   | `TVideoDaily` (`Placement, VideoID, PageID`)                                                                                     | F's sums + PlayIntents, Milestone25/50/75, Downloads, Seeks, Pauses, BufferMsSum, StartupMsSum/Count; `max` columns VideoKey, VideoTitle, Provider, VideoDurationSec, VideoIdSource, HasVideoSchema, URLUsed, PTitle; uniq: + Intent/Download sessions | 0.73 M    | 0.57 M                    |
| U   | `TVideoUserSessionsDaily` (`Placement, VideoID, CidUserChecksum`), TTL 400 d                                                     | `uniqExact` sessions with a `video_started`                                                                                                                                                                                                            | 4.38 M    | 3.64 M                    |
| P   | `TVideoPlaybacksDaily` (`PlaybackSessionID`), TTL 400 d; content only in the view                                                | per playback per day: `max` Source (from the start), Intent, Started, Completed, Errored                                                                                                                                                               | 4.30 M    | 0.07 M                    |
| Q   | `TVideoQualityDaily` (`Placement, VideoID, Quality`)                                                                             | Heartbeats, Starts, Downloads, Sessions per rendition (`''` stored as `unknown`)                                                                                                                                                                       | 0.90 M    | 0.16 M                    |
| QS  | `TVideoQualityShiftDaily` (`Placement, VideoID, FromQuality, ToQuality, Trigger`)                                                | Shifts as the SDK sent them                                                                                                                                                                                                                            | 0         | 1,946                     |
| QE  | `TVideoQualityEvents` (MergeTree, from 2026-10-25 14:34 UTC)                                                                     | **no DDL anywhere in the repo**; legacy reads `PublicInstanceID, Day, Created, Seq, PlaybackID, Quality, IsChange, Trigger` (`VideoQualityDropsQueryBuilder.js` derivedBranch)                                                                         | —         | —                         |
| A   | `TVideoAdsDaily` (`AdPosition, VideoID`), TTL 400 d; no `Placement`                                                              | Started, Completed, Skipped, Clicked, Errors (`ads_video_*`)                                                                                                                                                                                           | 0         | 35                        |

Every daily rollup holds data from 2026-09-25 15:00 UTC; A and P were backfilled to that day (prod, group-4 §1.2). The
fleet probe proved rule 1 for the four sums of F and D (= raw, per placement, 2026-10-25, two projects), **never for
the uniq states** (prod; `prod-g4-project-probe.sql` §2 compares sums only).

### 1.2 Five facts the contract does not state, each of which changes the design

1. **`TVideoDaily` is read merged (correctness; verified).** VideoKey, VideoTitle, Provider, VideoDurationSec,
   VideoIdSource and HasVideoSchema are `SimpleAggregateFunction(max)`. With 17 parts on prod, unmerged rows are the
   normal state. Legacy uses them in row-level conditions before it aggregates (`sumIf(Starts, VideoDurationSec > 0)`,
   `IDENTIFIED_VIDEO_PREDICATE`, `VIDEO_KEY_EXPR`, `min(VideoIdSource) = ''`), so its avgCompletion, avgDuration,
   `videos` and identity depend on the merge state. This already happened once: the P6 backfill read 30 % duration
   coverage until merges finished (memory `aggregating-mergetree-alias-rates-need-final`). v2 groups every D read first
   by the table's sort key (`Day, Placement, VideoID, PageID`), and only then applies conditions. That is FINAL's result
   without FINAL. F, Q, QS, U and A have no condition on a `max` column, so a plain aggregate is exact.
2. **The `VIDEO` key exists only in D (verified).** Telling a real video from an element id needs VideoIdSource and
   Provider (`VideoSqlHelper.js:100`), which only D holds. The key of pre-release rows is
   `cutQueryStringAndFragment(VideoKey)`, but only on rows with no `VideoIdSource`; applied blindly on F it would strip
   `#v1` from page-slot ids. So F, U, Q, QS and A cannot key or filter a video by themselves. §2.3 builds a **key map**
   from D.
3. **`users` and the session states differ between F and D (verified).** `MvVideoDaily` counts Users and Sessions over
   14 event names; `MvVideoDailyFilterable` counts them over 7 (impression, started, completed, heartbeat, stalled,
   buffered, error). The contract serves `users` from F (#70 does not say which). Legacy's detail-panel users
   (`VideoDetailMetaQueryBuilder.js`) reads D, so VD-28 differs for a user whose only events were an intent, a
   progress milestone, a download, a pause, a resume, a seek or an interruption. Inferred: such a user is rare, because
   a play emits heartbeats. Owner question §5.2-a.
4. **F lacks four dimension columns that the contract says it serves (verified).**
   - **`CITY`:** the engine's key is `toString(GeoResultCityGeoNameID)` (`AnalyticsQueryReader.ts:488`). F holds only
     `GeoResultCity`, the name: the geo rollup carries both columns, and F carries only the name.
   - **`REFERRER_SOURCE`:** the engine's key falls back to `SRefererURLExternalDomain`, which F lacks.
   - **`VIEWPORT`, `VIEWPORT_HEIGHT`, `ORIENTATION`:** these read `ScrViewportWidth/Height` and
     `ScrScreenOrientationIsPortrait`. F has only the `ScrViewport` string.
5. **QE has no DDL (verified absent).** The dev archive (`make migrate ONLY=analytics-archive` applies
   `schema/historical/`) therefore has no QE. Neither R0 nor e2e can run the derived quality-drop branch, and its
   `VideoID` and `Placement` columns are unproven (§7).

## 2. The video family in the engine

### 2.1 Measures, their source and their SQL parts

There is one new family, `video`. Its measures are the `AnalyticsVideoMeasures` fields, and the internal ids are dotted
(`video.plays`), so `measuresIn` reads `rows.measures.video.plays` straight from `selectedPaths`. The `AnalyticsMeasure`
values `VIDEO_*` map onto them for `sort` and `having`. Ratios are computed from parts in the same row (engine §3). A
zero denominator gives null. Watch time = heartbeats × 10 s (`HEARTBEAT_SECONDS`, `VideoSqlHelper.js:69`).

| Measure(s)                                              | Source                           | Parts → value                                                                                                                                                                                                                                              | Change    |
| ------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| impressions, plays, completions                         | F                                | `sum(Impressions)`, `sum(Starts)`, `sum(Completions)`                                                                                                                                                                                                      | rel       |
| playSessions, users                                     | F                                | `uniqCombinedMerge(StartedSessions)`, `…(Users)`                                                                                                                                                                                                           | rel       |
| impressionToPlayRate                                    | F                                | plays ÷ impressions (the contract lists it under no source; F holds both)                                                                                                                                                                                  | pts       |
| completionRate                                          | F                                | completions ÷ plays                                                                                                                                                                                                                                        | pts       |
| sessionCompletionRate                                   | F                                | `uniqCombinedMerge(CompletedSessions)` ÷ playSessions (#101)                                                                                                                                                                                               | pts       |
| watchTime, avgWatchTimePerPlay                          | F                                | `sum(Heartbeats)` × 10; ÷ plays                                                                                                                                                                                                                            | rel       |
| stallRate, bufferRate                                   | F                                | Stalled / Buffered sessions ÷ playSessions                                                                                                                                                                                                                 | pts       |
| videos                                                  | D (merged)                       | `uniqExactIf(vkey, starts > 0 AND identified)`                                                                                                                                                                                                             | rel       |
| progress25/50/75, downloads                             | D                                | `sum(Milestone25…)`, `sum(Downloads)`                                                                                                                                                                                                                      | rel       |
| downloadRate                                            | D                                | `uniqCombinedMerge(DownloadSessions)` ÷ D's `uniqCombinedMerge(StartedSessions)`                                                                                                                                                                           | pts       |
| avgCompletion                                           | D (merged)                       | `least(1, sumIf(hb, dur > 0) × 10 ÷ sumIf(starts × dur, dur > 0))`, null when the divisor is 0                                                                                                                                                             | pts       |
| avgDuration                                             | D (merged)                       | `sumIf(starts × dur, dur > 0) ÷ sumIf(starts, dur > 0)`                                                                                                                                                                                                    | rel       |
| rebufferRatio                                           | D                                | `BufferMsSum/1000 ÷ (Heartbeats × 10 + BufferMsSum/1000)`                                                                                                                                                                                                  | pts       |
| avgStartupTime                                          | D                                | `StartupMsSum ÷ StartupMsCount ÷ 1000`                                                                                                                                                                                                                     | rel       |
| replayRate                                              | U                                | per (video, user) over the window, `uniqExactMerge(Sessions) ≥ 2`: replay users ÷ users                                                                                                                                                                    | pts       |
| errorRate, exitBeforeStartRate, playbackCompletionRate  | P                                | per `PlaybackSessionID` over the window (`max` of each flag): failed-not-started ÷ (intent OR failed-not-started); intent AND NOT started AND NOT errored ÷ intent; started AND completed ÷ started                                                        | pts       |
| on QUALITY rows: watchTime, plays, downloads            | Q                                | `sum(Heartbeats)` × 10, `sum(Starts)`, `sum(Downloads)`                                                                                                                                                                                                    | rel       |
| qualityDrops                                            | QS before 2026-10-26, QE from it | adaptive changes whose parsed height falls: `toUInt32OrNull(extract(q, '^(\\d+)p$'))` of from and of to, both non-null and to < from (legacy's `heightOf`, `VideoOverviewRealReport.js:358–378`, moved into SQL so the site total is exact)                | rel       |
| adStarts, adCompletions, adSkips, adClicks + four rates | A                                | per position: completed′ = min(completed, started), skipped′ = min(skipped, started − completed′), dropOff = started − completed′ − skipped′; a total = Σ positions (legacy's `clampAdOutcomes`, `VideoOverviewRealReport.js:790`); click rate capped at 1 | rel / pts |

Two cases still keep rule 1 (one value per measure):

- On a QUALITY row, watchTime, plays and downloads read Q, the only source keyed by rendition. Σ over renditions must
  equal F's heartbeats and starts and D's downloads; verify-videos checks this (§9).
- `downloadRate` takes its denominator from D, not from F's playSessions. A ratio is read from one row of one source,
  and the two uniq states cover the same `video_started` events.

### 2.2 The measure × dimension matrix (a dimension outside its source's set is refused by name)

The refusal is 422 `field: 'measures'`, `reason: 'measure-not-available-for-dimension'`, `{measure, dimension}`. It is
the same refusal the dwell legs give (`routing.ts:616–641`). A video measure never falls back to raw.

| Source               | Filter, row key, `secondary` and split dimensions                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F                    | PAGE (`PageID = cityHash64(path)`, the same hash as the V3 page rollups; `CONTAINS` reads `path(URLUsed)`, which is exact because every row of a `PageID` shares one path), TAG (`PKeywords`), REFERRER*CHANNEL, REFERRER_HOST, REFERRER_SOURCE (**Name only**: §5.2-d), UTM*_ , CAMPAIGN_TAGGED, OS, OS_VERSION, BROWSER, BROWSER_VERSION, DEVICE_TYPE, DEVICE_BRAND, PLATFORM_SUPPORT, COUNTRY, VIDEO (via the map), PLAYBACK_SOURCE, ISP; both attributions (P_/S\* columns) |
| D                    | VIDEO, PAGE                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| U                    | VIDEO                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| P                    | PLAYBACK_SOURCE (playbackCompletionRate only); nothing else                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Q                    | VIDEO_QUALITY, VIDEO                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| QS + QE              | VIDEO (QS proven; QE `VideoID` unproven, §7), the QUALITY_DROP key                                                                                                                                                                                                                                                                                                                                                                                                              |
| A                    | AD*POSITION, VIDEO (**unproven**: an `ads_video*\*`event's`video_id` may not be a content video's id, §7)                                                                                                                                                                                                                                                                                                                                                                       |
| every source refuses | CITY, VIEWPORT, VIEWPORT_HEIGHT, ORIENTATION (§1.2-4), ENTRY_PAGE, USER_TYPE, PAGE_TYPE, EVENT_NAME                                                                                                                                                                                                                                                                                                                                                                             |

### 2.3 The VIDEO key: a map from D

The row `key` and the filter value are the contract's text id:

- for P7 rows, `VideoKey`;
- for pre-release rows, `cutQueryStringAndFragment(VideoKey)`;
- every unidentified id is `UNIDENTIFIED`.

Its cityHash64 is legacy's decimal id, so the comparison maps one to the other. One statement fragment builds the map
for the windows the read covers:

```sql
vmap AS (
  SELECT VideoID,
         if(max(identified) = 1, argMax(key, src != ''), 'UNIDENTIFIED') AS vkey,
         if(max(identified) = 1, nullIf(max(title), ''), NULL) AS vtitle          -- only when title/search is read
  FROM (SELECT VideoID,
               if(max(VideoIdSource) != '', max(VideoKey), cutQueryStringAndFragment(max(VideoKey))) AS key,
               max(VideoIdSource) AS src,
               <IDENTIFIED_VIDEO_PREDICATE over max(VideoIdSource), max(VideoKey), max(Provider)> AS identified,
               if(max(VideoTitle) != '', max(VideoTitle), max(PTitle)) AS title
        FROM TVideoDaily
        WHERE PublicInstanceID = {p} AND Placement = 'content' AND Day BETWEEN {d0} AND {d1}
        GROUP BY Day, Placement, VideoID, PageID)                                  -- merged (§1.2-1)
  GROUP BY VideoID)
```

How each source uses the map:

- **Keyed reads.** F, U, Q, QS and A aggregate by `VideoID` first. Then they `LEFT JOIN vmap USING (VideoID)` and
  re-aggregate by `if(vkey = '', 'UNIDENTIFIED', vkey)`: uniq states merge with `…MergeState` and then `…Merge`.
- **A VIDEO filter** is `VideoID IN (SELECT VideoID FROM vmap WHERE vkey IN {keys})`.
- **`search`** folds over `vkey` and `vtitle` inside the map.

What this changes from legacy:

- **Pre-release rows.** A filter or a row now covers them on every rollup. Legacy's `videoScopePredicate` reads only
  `VideoID = id` there, and its per-video replay reports null when `hasLegacyRows` (`VideoOverviewRealReport.js:541`,
  mapVideos).
- **Identity per id, not per row.** It is decided per raw id: any identified row identifies it. Legacy decides per row
  and can split one id between a key and `0`. Inferred: this is rare.

**The merged row since #505 step 3.** The map now reads `TVideoKeysDaily`, not `TVideoDaily`. That table is D's
`VideoKey`, `VideoIdSource`, `Provider`, `VideoTitle`, `PTitle` (max) and `Starts` (sum), merged per
`(Day, Placement, VideoID)` by a cascade view on D (`apps/analytics-archive/scripts/backfill/lib-video-by-video.sh`).
The rule text is unchanged, but the identified predicate is now evaluated on that merged row, not on D's
`(Day, Placement, VideoID, PageID)` row. The inner `GROUP BY` is `Day, Placement, VideoID`, and the outer grouping by
`VideoID` is as before. The candidate ids of a narrowed map read the same table.

- **Measured on prod (read-only, 2026-11-08):** 2.7 content pages per video-day on pPUsRuZitL3f over 30 days. Over all
  data of the three bench projects (pPUsRuZitL3f, UKRlSkNOScQA, CHyjot2edlsQ; content placement), 0 of 665,392
  video-days give a different identified result when the rule runs per `(Day, VideoID)` instead of per
  `(Day, VideoID, PageID)`.
- **The only possible divergence:** an id with no `video_id_source` that is seen with `youtube` or `vimeo` on one page
  and, on another page the same day, with a provider that sorts after it. The merged row's `max(Provider)` is then the
  later one, so the id is no longer identified on that day. Only pre-2026-10-01 scripts can produce such rows.
- **Not moved:** D's `videos` count and a VIDEO row's own fields (`videoFields`' `r` side: URL, page URL, length,
  VideoObject flag) stay on D's page rows. Only `videoFields`' id map moves.
  - `videos` shares one statement with the D parts whose length conditions need the page-level merged row (§1.2-1).
  - No screen reads `videos` alone, so moving it would add a statement rather than remove a scan.
  - The e2e shows its total is the same on the merged day rows.

The map is complete for F, U and Q because their views read a subset of D's events with the same
`cityHash64(video_id)` (verified). For A it is unproven (§7). P has no video id, so `errorRate`,
`exitBeforeStartRate` and `playbackCompletionRate` per video stay refused (VW-63, group-4 §5.3).

### 2.4 Windows, buckets and sources' first days

- **Every video read is on whole UTC days.** The window snaps (#15: start to the nearest UTC midnight, end to the next
  one) and the snapped window is echoed. On breakdowns this is G2-1 as it stands.
- **`analyticsTraffic`.** A call that selects any video measure is planned like a breakdown's totals
  (`readTraffic(…, utcDays = true)`). If it also selects any non-video measure, it is refused by name:
  `field: 'measures'`, `reason: 'mixed-window-grain'`. The rule does not depend on whether the window already falls on
  UTC days, so the only input is the selection.
- **`analyticsSeries`.** A series of video measures is DAY, WEEK or MONTH, with UTC-day buckets (Q-P3). The rules:
  - context `UTC` is required: any other zone is refused, `field: 'context'`, `reason: 'time-zone-not-available-for-measure'`;
  - HOUR is refused, `granularity-not-available-for-dimension`, as page series are (`GetSeriesUseCase.ts:131`);
  - AUTO resolves to DAY;
  - mixing video with another family is refused, `mixed-window-grain`.
  - **As built (13c).** The ad fields and `qualityDrops` are refused on a series (`measure-not-available`); a series
    takes the dimensions the selected measures' rollups hold (`assertVideoDimensions`). A bucket is read as the video
    measure over its own days, so it equals the traffic read of those days (`verify-videos.ts` pins DAY and WEEK on F, D,
    U and P). §12.
- **`analyticsActivityPattern`.** Its cells are hours in the reader's zone, so a video measure is refused,
  `mixed-window-grain`.
- **#72, the sources' first days.** These are `VIDEO_FROM`:
  - F, D, U, P, Q, QS and A: `2026-09-25T15:00:00Z`. A snapped window starts at a midnight, so a comparison window
    starting 2026-09-25 begins before the data, and its `previous`/`change` are null. That equals legacy's
    `COLLECTION_FIRST_FULL_DAY = 2026-09-26` (`VideoSqlHelper.js:127`, `VideoOverviewReport.js:93–98`).
  - qualityDrops: the same day, since QS covers it before QE's 2026-10-26.
  - The 400-day TTLs (U, P, A) move each source's first day to `today − 400 d`, with the same rule. They first bite on
    2027-10-30.
  - The current window always sums what exists. Nothing is refused.

### 2.5 Breakdown rows and families

- **One rule everywhere: video measures never share a call with another family.** On traffic and series #61 already
  refuses the mix. On breakdowns this plan refuses it too, by name, `mixed-measure-families`. No screen mixes them, and
  serving the mix needs a third side in the joined statement (engine-3 §5). This is an owner question (§5.2-j).
  Additive later.
- **Within the video family, the rows are the sort measure's source's keys (#61 rule 2).** The default sort is the
  first selected measure (`breakdownSelection.ts`). Every other source in the selection reads the same keys:
  `key IN (top keys)` for a limited statement (engine §5, the 1c pattern). The other sources' measures are null on a key
  they lack.
- **A `having` on a measure from a source other than the sort's is refused by name** (`field: 'having'`,
  `reason: 'having-not-on-sort-source'`). Applying it after a limited read would make which rows pass a floor depend on
  `limit` (the defect class F-1 rules out). No screen needs it: channels, campaigns and providers floor and sort on F.
  Additive later (a joined statement) if a screen does. Owner question §5.2-j.
- **`total`** counts the sort source's keys. **`summary.totals`** is `readTraffic` over the population, video measures
  included.
- **Both windows in one statement per source** (`-If` combinators on `Day`, engine-1c §2.1). The comparison window is
  read only when `previous`, `change`, the sort or a floor needs it (F-12).
- **`limit` caps at 1000 (G2-Q7).** The videos table asks for 500; legacy showed the top 50.

- **As built (13b).** The order's rollup is read over every key of the window (the search a folded `HAVING` on the
  first key, a VIDEO key's title too), and its rows are floored, sorted and cut in the use case with the same
  `videoMeasures` math the values use, so no measure formula is written twice (rule #17). A read over more than
  `VIDEO_KEY_CAP` (100,000) keys is refused (`ANALYTICS.TOO_EXPENSIVE`), never cut. The comparison window is read
  unrestricted only when the order, a floor or `previousTotal` reads it, and otherwise for the returned keys and the
  rollups of the measures selected under `previous` or `change` only. A VIDEO key joins the key map at row level
  (`LEFT JOIN … USING (VideoID)`); `TVideoDaily` keys at its id level after the merge; replays per video group by the
  text key, so a replay across a pre-release id's cache busters counts (legacy: per raw id).

### 2.6 Which query serves which video measures

| Query                                                             | Video measures                                                                        | Notes                                                                                                                                                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `analyticsTraffic`                                                | all, by the matrix                                                                    | §2.4 grain rule; `freshness.hitsUntil` as for hits (the views fire on `Records` insert)                                                                                        |
| `analyticsSeries`                                                 | all but qualityDrops and the ad fields (one value per bucket from the source's `Day`) | split: VIDEO, PLAYBACK_SOURCE, the F device and referrer dimensions                                                                                                            |
| `analyticsReferrers` / `Campaigns` / `Devices` / `Pages` / `Tags` | F measures (D on PAGES)                                                               | `Locations(CITY)` refused (§1.2-4); `Locations(COUNTRY)` served; a Campaigns row keyed by video measures needs no tagged hit (#74 is for the hit and session families; §5.2-k) |
| `analyticsVideos`                                                 | by grouping (§3.3)                                                                    | the population is content video                                                                                                                                                |
| `analyticsEvents`, `analyticsActivityPattern`, journey, page flow | refused by name                                                                       | EVENT_NAME / hours / no measures object                                                                                                                                        |

## 3. The SQL per call shape

Every statement carries:

- the project first (bound);
- `Placement = 'content'` on F, D, U, Q and QS;
- `Day BETWEEN {c0} AND {c1}`, or, when comparing, `(Day BETWEEN {c0} AND {c1} OR Day BETWEEN {p0} AND {p1})` (never
  the span between them: under PREVIOUS_YEAR or CUSTOM that would read up to 13 months);
- the circuit-breaker settings;
- `prodCaps.ts` in the parity harnesses.

One statement runs per source, in parallel, merged in memory (engine §5).

### 3.1 The hero (`VideoSummary.site`: `analyticsTraffic`, compared)

```sql
-- F (one row; -If per window)
SELECT sumIf(Starts, Day BETWEEN {c0} AND {c1}) AS plays_c, sumIf(Starts, Day BETWEEN {p0} AND {p1}) AS plays_p, …,
       uniqCombinedMergeIf(StartedSessions, Day BETWEEN {c0} AND {c1}) AS playSessions_c, …
FROM TVideoDailyFilterable WHERE PublicInstanceID = {p} AND Placement = 'content' AND (Day BETWEEN {c0} AND {c1} OR Day BETWEEN {p0} AND {p1}) AND <filters>
-- D (merged first)
SELECT sumIf(m25, cur) …, least(1, sumIf(hb, cur AND dur > 0) * 10 / nullIf(sumIf(st * dur, cur AND dur > 0), 0)) …
FROM (SELECT Day, VideoID, max(VideoDurationSec) AS dur, sum(Starts) AS st, sum(Heartbeats) AS hb, sum(Milestone25) AS m25, …,
             uniqCombinedMergeState(DownloadSessions) AS ds, … , Day BETWEEN {c0} AND {c1} AS cur
      FROM TVideoDaily WHERE … GROUP BY Day, Placement, VideoID, PageID)
-- `videos`: the same inner rows joined to vmap (identified, starts > 0)
-- U
SELECT uniqExactIf(user, s_c > 0) AS users_c, uniqExactIf(user, s_c >= 2) AS replay_c, … FROM (
  SELECT VideoID, CidUserChecksum AS user, uniqExactMergeIf(Sessions, cur) AS s_c, uniqExactMergeIf(Sessions, prev) AS s_p
  FROM TVideoUserSessionsDaily WHERE … GROUP BY VideoID, CidUserChecksum)
-- P
SELECT countIf(st = 1 AND …) … FROM (SELECT PlaybackSessionID, max(Started) st, max(Intent) it, max(Errored) er,
  max(Completed) co FROM TVideoPlaybacksDaily WHERE … AND Day BETWEEN {c0} AND {c1} GROUP BY PlaybackSessionID)
-- (P per window is a separate GROUP BY: a playback that spans the boundary belongs to both, as in legacy)
-- A
SELECT AdPosition, sumIf(Started, cur) … FROM TVideoAdsDaily WHERE … AND AdPosition IN ('pre_roll','mid_roll','post_roll')
  GROUP BY AdPosition                                -- clamps per position in the app, then Σ
```

U groups the window's (video, user) pairs: legacy's shape, over the selected range (owner 2026-09-27). A VIDEO filter
on U, Q, QS or A is the `vmap` sub-select. A PAGE filter is `PageID IN (…)` on F and D.

**Read cost (issue #505).** Four changes, all in `VideoQueryReader`:

- **The replay is estimated over 90 days (decision #144).** A window of more than `REPLAY_EXACT_MAX_DAYS` (90) UTC days
  counts only the users with `cityHash64(CidUserChecksum) % 8 = 0`. Unkeyed, that is a WHERE predicate. Keyed, the other
  users fold into one NULL user per key (`if(<sample>, CidUserChecksum, NULL)`, `uniqExactMergeIf(Sessions, <sample>)`),
  so the read returns every key it would return exactly, and the title search still sees every row. Each window
  decides on its own length, and so does each comparison window. A sampled row whose `replayBase` is under
  `REPLAY_SAMPLE_FLOOR` (30) has `replayRate: null` (`videoMeasures`). Up to 90 days nothing changes.
- **A VIDEO `IN` filter narrows every key map** (the filter's and the joined one) to the ids that have a row whose
  `VideoKey`, or its cut, is a filtered key. The key rule then runs over all rows of those ids, so every key is
  unchanged. There is no narrowing when a key is `UNIDENTIFIED`. `videoFields` is narrowed the same way by the
  returned keys, on both sides of its INNER JOIN (the field rows and the map). This is exact because the join keeps only
  those ids.
- **Step 4: an unfiltered F read takes `TVideoDailyByVideo`.** This is F with every dimension but the video dropped,
  keyed `(PublicInstanceID, Placement, Day, VideoID)`. It holds `VideoKey` and `URLUsed` (max), the four sums and the
  seven `uniqCombined` states. Its feed `MvVideoDailyByVideo` is a cascade on `TVideoDailyFilterable`, not on
  `Records`: it merges F's own sums and states, so every figure is F's over the same rows (decision #124's users
  included). The archive side is `apps/analytics-archive/scripts/backfill/lib-video-by-video.sh` and its migration
  `20261108-video-by-video-v1.sql`.

  The routing rule is `readsByVideo(filters, keyed)`, one pure function. A statement on F reads the per-video table
  only when all four of these hold:
  - no filter term is on a dimension other than VIDEO (a VIDEO term resolves to `VideoID` through the key map);
  - the referrer attribution is unset or `SESSION`;
  - every key is VIDEO, or there is no key;
  - every extra is one the table holds. Only `url` qualifies, as `max(URLUsed)`.

  Every F base count, the scope (`hitScope`: project, `Day`, `Placement = 'content'`) and the series bucket (`Day`)
  read columns the table holds. The route therefore serves the hero totals and their comparison window (R13-1), the
  trend (R13-2), and the videos table's F part by VIDEO with a search or the asked keys (R13-3). Everything else stays
  on F: PAGE, PLAYBACK_SOURCE, every visit dimension, channels, campaigns, environment, ISP, keywords, and the
  page-view attribution. The statement is the same SQL on either table; only the table name differs.

  The tests:
  - the unit test parses the routed parts, extras and scope against the table's committed DDL;
  - the e2e `videoByVideoParity.e2e.test.ts` re-runs each routed statement on F and requires identical rows.

  `uniqCombined` can differ between the tables in one case: a merged state of exactly 4096 distinct values, by merge
  order. F has the same property across thread splits (`KNOWN-DEFECTS-analytics-rollups.md` §8). The table must exist
  on the archive before this reader ships: stage core-api reads the prod archive. The migration runs first, then the
  history heal from 2026-09-25 to T0, then `verify-day`.

- **Step 3: every key map reads `TVideoKeysDaily`** (§2.3). This covers the filter's map, the joined map, the titled
  map of a search, `videoFields`' map and the narrowed candidate ids. The map reads one row per video-day instead of
  one per page (2.7 content pages per video-day on pPUsRuZitL3f). The rule runs on the merged
  `(Day, Placement, VideoID)` row, and 0 of 665,392 prod video-days differ. The e2e `videoByVideoParity.e2e.test.ts`
  re-runs every map-bearing statement with its maps on D's page rows and requires identical rows for:
  - the videos table searched;
  - a VIDEO filter on F, D and U;
  - the detail panel;
  - the replay keyed by video;
  - the `videos` total (which stays on D) on the merged rows.

A search stays a HAVING over the grouped keys (the key, or a VIDEO key's top title). A key-level pushdown of the search
before the (video, user) grouping was built and measured in the cost gate (cg-153806). It showed no gain: the gate's
term `a` matches nearly every key, and R13-3s at 90 days went from 10.1 s to 11.6 s, with 55 spills instead of 31. So it
was dropped.

### 3.2 Series (`VideoSummary.trend`, `VideoDetail.trend`, VW-49)

The statement is F's (or D's, U's) with `GROUP BY bucket[, key]`. The bucket is the engine's daily-source bucket over
`toDateTime(Day, 'UTC')`, and empty buckets are filled from the bucket list (engine §6). A VIDEO split groups by vmap's
key, restricted to `keys`. U per bucket reads replayRate within each bucket.

**As built (13c).** Every rollup's statement groups by the bucket (the engine's own `bucketSql`, by arithmetic for DAY and by
the edges for WEEK and MONTH): F and the rendition rollup `GROUP BY bucket`, D carries `bucket` through all three
nesting levels (merged rows, per id, per key), U puts it in the inner `GROUP BY` (a replay is within a bucket), P groups a
playback by `(PlaybackSessionID, bucket)`. A D key (a video's identity) is therefore decided inside its bucket, which keeps
the series equal to the traffic read of that bucket. The split keys become an `IN` filter term and the statement's HAVING,
so a VIDEO split reads only the asked videos (the key map is still read twice there: once in the join, once in the filter).

### 3.3 `analyticsVideos(groupBy)`

| Grouping        | Rows from                                                           | Statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| VIDEO           | the sort measure's source (F for plays)                             | inner `GROUP BY VideoID` → `LEFT JOIN vmap` → `GROUP BY vkey`; `count() OVER ()` for `total`; `ORDER BY <sort>, vkey LIMIT {limit}`; the extras (`title`, `url`, `pageUrl`, `duration`, `hasValidSchema`) read from merged D for the returned keys only: `url` = `maxIf(cut(VideoKey), src IN ('source','') AND match(VideoKey,'^https?://'))` (`VideoDetailMetaQueryBuilder.js`); `pageUrl` = `argMax(URLUsed, (Day, starts, URLUsed))` over page rows with starts (the latest day; on it, the page with the most starts, then the greatest URL, since a day row holds no time of play; ties on `Day` alone were arbitrary until #505); `duration` = `max(VideoDurationSec)` (null when 0); `hasValidSchema` = `if(max(src) != '', maxIf(HasVideoSchema, src != '') = 1, NULL)` (`VideoSqlHelper.js:108–109`) |
| PLAYBACK_SOURCE | F's `PlaybackSource` (plays); P's `Source` (playbackCompletionRate) | key map (§5.2-f): `autoplay`→AUTOPLAY, `manual`→MANUAL, `suggested`→SUGGESTED, `continue_watching`→CONTINUE_WATCHING, else UNKNOWN; prod values seen are `autoplay`, `manual`, `''` (pPUs)                                                                                                                                                                                                                                                                                                                                                                                                                         |
| QUALITY         | Q                                                                   | `GROUP BY Quality`; labels verbatim (`unknown` included); legacy's folding of `''`/`0p` into `unknown` and its share base are client work (group-4 §5.12, ruled l). **As built:** plays, heartbeats and downloads only, from Q (one parts override: `partSource(part, quality)`); every other measure is refused naming `VIDEO_QUALITY`                                                                                                                                                                                                                                                                            |
| QUALITY_DROP    | QS ∪ QE                                                             | QS branch: `Day < 2026-10-26 AND Trigger = 'adaptive'`, `sum(Shifts)` by (From, To). QE branch: legacy's window over `PlaybackID` (`lagInFrame(Quality) OVER (PARTITION BY PlaybackID ORDER BY Created, Seq)`, the day before the window included so the first change has its "from"). The two are `UNION ALL`ed, then the downgrade filter (§2.1). Key `from>to`                                                                                                                                                                                                                                                  |
| AD_POSITION     | A                                                                   | the three registry positions → `PRE_ROLL`, `MID_ROLL`, `POST_ROLL`; clamps per row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ISP             | F's `GeoIPAutonomousSystemOrganization`, verbatim                   | carrier brands are a curated map, the client's or later (group-4 §5.1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

**As built (13c), the downgrades and the ad positions.**

- **QUALITY_DROP** is one logical source, `QUALITY_SHIFTS`, over two tables with the cut `QUALITY_EVENTS_FROM` (2026-10-26).
  The statement emits only the branches the window touches, `UNION ALL`ed under one outer `WHERE` that keeps the
  downgrades: both heights parse (`toUInt32OrNull(extract(q, '^(\\d+)p$'))`, the pattern a bound parameter), both are above 0
  (row m) and the target is lower. The events branch reads the day before the window and only the playbacks with an
  adaptive change in it; a VIDEO filter applies to those playbacks (one key map per branch), a VIDEO key joins the map
  outside. The key is `from>to`; `fromQuality` / `toQuality` are cut at the first `>`.
- **AD_POSITION** is a key and a filter on the ad rollup alone, each position `transform`ed to its key and clamped on its
  own (`clampedAds` per row); unkeyed, the sum of the clamped positions. VIDEO is refused (N-6).
- **Dimensions.** `VIDEO_QUALITY` and `AD_POSITION` are public (`AnalyticsDimension`); the drop path is internal and
  key-only (`VIDEO_QUALITY_DROP`, with `VIEWPORT_HEIGHT`). Q holds `VIDEO_QUALITY` and `VIDEO`; QS and QE hold the drop
  path and `VIDEO`; A holds `AD_POSITION`. The hit, session and event families refuse all three by name.

### 3.4 The detail panel (`VideoDetail`)

- **The row.** The VIDEO row with `filters: VIDEO IN [$v]`, `limit 1`, and the extras.
- **The trend.** A series split by `VIDEO keys [$v]`.
- **Quality.** QUALITY rows under the VIDEO filter.
- **Devices.** `analyticsDevices(DEVICE_TYPE)` reading F's playSessions under the VIDEO filter.
- **Providers.** ISP rows under the VIDEO filter.
- **The key.** All of these resolve `$v` through vmap, so a pre-release video is whole.
- **As built (13c).** No new code path: the panel is the composition above. `videoGraphql.e2e.test.ts` runs the
  `VideoDetail` and `VideoSummary` operations verbatim from `screens/video.graphql` (so the document and the server cannot
  drift, and the depth limit is checked), and the cost gate runs the five reads as R13-11 / 11t / 11q / 11d / 11p. The
  fleet-wide 360p benchmark has no field (row i, a coverage note on VD-30); the unknown renditions leave the share base on
  the client on both quality cards (row l, comments in the screen document and a note on VD-18).

### 3.5 Video on the group-2 breakdowns

- **CHANNEL / SOURCE / HOST** read `S*` or `P*` by `input.attribution` (engine-6 §2), using the engine's own key
  expressions on F's columns. `CAMPAIGN` reads the UTM columns, population `CAMPAIGN_TAGGED IN [TAGGED]`.
- **Devices** use the engine's device keys (`DEVICE_TYPES` codes, the version label, `parent`), from F's UA columns.
- **The floor** is `having VIDEO_PLAY_SESSIONS ≥ 100` over `uniqCombinedMerge(StartedSessions)`. That is legacy's
  `CHANNEL_MIN_SESSIONS` on the same state (#61's example: identical counts on CHyjot2edlsQ).

## 4. Items → calls → sources, vs legacy

= equal · R = ruled difference · **U-x** = question x of §5.2, since ruled (decision log #124–#137) · N = not buildable as specified (§6).

| Items                                        | Call (`screens/video.graphql`) | Source                     | vs legacy (`Service/Analytics/Video/*`, `DTO/…/VideoOverviewRealReport.js`)                                                                                                                                                                                                                                                       |
| -------------------------------------------- | ------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VD-1 videos                                  | site                           | D + vmap                   | = in value, but merged-row identity: **U-b**                                                                                                                                                                                                                                                                                      |
| VD-2, VD-8, VD-10 watch time, VW-76 plays    | site                           | F                          | legacy reads D (`VideoSummaryQueryBuilder`); equal sums by rule 1 (prod)                                                                                                                                                                                                                                                          |
| VD-7 avgCompletion, VD-9 avgDuration         | site                           | D merged                   | formula = (`VideoOverviewRealReport.js:170–184`); merged rows **U-b**; legacy rounds (F-2: R)                                                                                                                                                                                                                                     |
| VD-10 completion, session completion, replay | site                           | F, F, U                    | completionRate =; sessionCompletionRate = (#101; legacy's channel card caps at 100 %, its hero does not (`:91–104`): **U-g**); replayRate = (same U shape)                                                                                                                                                                        |
| VD-11 downloadRate                           | site                           | D                          | = (`downloadSessions ÷ startedSessions` on D)                                                                                                                                                                                                                                                                                     |
| VD-12, VW-42 trends                          | trend                          | F, UTC days                | = per UTC day (legacy reads D; rule 1); legacy rounds per day and shows 0 on a day with no play, v2 null (contract: zero base)                                                                                                                                                                                                    |
| VD-13 sources                                | sources                        | F + P                      | plays =; legacy drops `''` from the share base (client); per-source completion = (`VideoPlaybackSessionsQueryBuilder`); a zero base is null, not 0 (contract: R)                                                                                                                                                                  |
| VD-14, VW-81, VW-93 funnel                   | site                           | D (+ F plays, completions) | =                                                                                                                                                                                                                                                                                                                                 |
| VD-16, VW-37 channels / campaigns            | channels, campaigns            | F                          | = counts (#61's example), keys are the vocabulary (`SEARCH` vs `2`), the scale 0..1 (R, F-2); campaigns are new (no legacy)                                                                                                                                                                                                       |
| VD-17 stallRate, errorRate                   | site                           | F, P                       | =                                                                                                                                                                                                                                                                                                                                 |
| VD-18 quality                                | quality                        | Q                          | = per label; shares are the client's. Legacy keeps `unknown` (with `''`/`0p`) in the overview's share base but removes it in the detail panel (`VideoDetailRealReport.js:176`, :209): **U-l**                                                                                                                                     |
| VD-19 drops                                  | drops                          | QS ∪ QE                    | the downgrade rule = legacy's `heightOf`, which parses `0p` as height 0 so X → `0p` counts as a drop: **U-m**; legacy cuts at `LIMIT 50` before filtering, v2 does not: **U-h**                                                                                                                                                   |
| VD-20, VD-21, VW-48 environment              | VideoEnvironment               | F                          | users = (F `Users`, as legacy's environment builder); shares and the share change are client work (as #61; legacy's share change is in points on rounded shares, its trend divides by the top 6's users); legacy keys are lower-cased raw values, v2 the engine vocabulary (R); VW-48 versions are new (legacy has none)          |
| VD-22, VD-24 ads                             | site, adPositions              | A                          | = with legacy's clamps (**U-e**: the contract states only completion ≤ started)                                                                                                                                                                                                                                                   |
| VD-25, VW-57 table                           | VideoTable                     | F + U (replay) + vmap      | values =; legacy's top 50 → `limit` (≤ 1000); growth has no floor (F-3; the N/A is #102, client); replay on pre-release rows: v2 serves it, legacy null (**U-c**)                                                                                                                                                                 |
| VD-27…30 detail                              | VideoDetail                    | F, D, U, Q + vmap          | users: F vs legacy's D (**U-a**); legacy's detail trend clamps per-play completion to 0..100, v2 does not (**U-g**); legacy's device split keeps unknown and bot in the base (client); legacy's quality benchmark `platformAvg360pSharePct` (fleet-wide 7 d, `VideoQualityBenchmarkQueryBuilder`) has no contract field (**U-i**) |
| VD-32, VW-44 providers                       | providers                      | F                          | new (legacy has no ISP block)                                                                                                                                                                                                                                                                                                     |
| VW-41 bufferRate, VW-58…60                   | site                           | F, D, P                    | bufferRate =; VW-58…60 (startup, exit before start, rebuffer ratio) are new: legacy computes none of them (mean startup only, group-4 §5.4)                                                                                                                                                                                       |
| VW-3, 6 filters (VIDEO, PLAYBACK_SOURCE)     | any F read                     | F + vmap                   | new (legacy has no filters)                                                                                                                                                                                                                                                                                                       |
| VW-7, 8, 10, 11, 13 filters                  | F reads                        | F                          | new; **N-1** on the hero and the sources card                                                                                                                                                                                                                                                                                     |
| VW-9 COUNTRY / CITY filter                   | F reads                        | F                          | COUNTRY new; CITY **N-2**                                                                                                                                                                                                                                                                                                         |
| deltas on every card                         | `change`                       | —                          | legacy is relative % on rates too; v2 is points (F-3, R, group-4 §5.10). Legacy compares raw instants; v2 compares snapped UTC days (#15, R). For a Tehran window starting 2026-10-20T20:30Z, legacy reads 10-20 and v2 starts 10-21                                                                                              |

**Every other item** (one line each; outside and client reasons are `coverage.json`'s):

| Items                                                        | Mapping                                                                                                                                                      | vs legacy                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| VD-3, VD-26 page-engagement share                            | outside: the owner's last phase (2026-09-29)                                                                                                                 | legacy absent / null                                                     |
| VD-4, 5, 6 search visibility                                 | outside: SEO's (#69); plays from Google = F under a REFERRER_SOURCE filter (§5.2-d); VD-5's valid-schema share = the client's count of `hasValidSchema` rows | legacy serves them from GSC (moves to SEO)                               |
| VD-15, VW-4 content category                                 | outside: not collectable                                                                                                                                     | —                                                                        |
| VD-23 in-player CTA                                          | outside (owner 2026-10-04)                                                                                                                                   | legacy has no card                                                       |
| VD-31, VW-84 interactions, speed                             | outside (#71)                                                                                                                                                | legacy "not collectable"                                                 |
| VW-1, 72 presets                                             | client (F-5)                                                                                                                                                 | —                                                                        |
| VW-2, 86 compare mode, VW-73 the shared drawer's filters     | `analyticsTraffic` input (`compare`, `filters`); filters per §2.2, N-1                                                                                       | legacy has neither                                                       |
| VW-5 video-length band                                       | outside: no rollup holds length beside the visit dimensions                                                                                                  | —                                                                        |
| VW-12 USER_TYPE                                              | refused by name (§2.2)                                                                                                                                       | —                                                                        |
| VW-14 option lists                                           | `analyticsVideos(VIDEO, search)`, `(ISP)`; `analyticsLocations(COUNTRY)`; `analyticsReferrers` (13b)                                                         | new                                                                      |
| VW-15 required events arrived                                | `analyticsEvents` `EVENT_NAME IN` the video events (served today)                                                                                            | new                                                                      |
| VW-16 report builder                                         | outside: the chart engine (G3-9)                                                                                                                             | —                                                                        |
| VW-38 conversion marking                                     | outside: event-registry configuration                                                                                                                        | —                                                                        |
| VW-43 CDN incident window                                    | outside: not collected; rollups are daily                                                                                                                    | —                                                                        |
| VW-49 environment share trend                                | `analyticsSeries` split by the device dimension, `video.users`, DAY/WEEK/MONTH, UTC (13c)                                                                    | legacy's environment trend, F per UTC day: = counts; shares the client's |
| VW-63 per-video download rate                                | `analyticsVideos(VIDEO)` `downloadRate` (D); per-video `errorRate` refused (N-5)                                                                             | = (D)                                                                    |
| VW-74 verdict sentence, VW-75 segment vs site                | client (two `analyticsTraffic` calls for VW-75)                                                                                                              | —                                                                        |
| VW-80 watch-length distribution                              | outside: rollups sum per day, not per play                                                                                                                   | —                                                                        |
| VW-85, VW-97 conversion per event                            | `analyticsEvents` `users` ÷ site users (client)                                                                                                              | —                                                                        |
| VW-87, 92, 94, 95, 98 paywall, subscription, catalogue, TVOD | outside: no registry event                                                                                                                                   | —                                                                        |
| VW-88 buffering by ISP × device                              | `analyticsVideos(ISP)` under DEVICE_TYPE (F, 13b); the trial part outside                                                                                    | new                                                                      |
| VW-89 plays with users                                       | site (F, #70)                                                                                                                                                | as VD-10 / VD-28                                                         |
| VW-96 continue-watching, rebuffer                            | `analyticsVideos(PLAYBACK_SOURCE)` CONTINUE_WATCHING row; `rebufferRatio` (D); subtitles, speed, binge outside (#71)                                         | new                                                                      |

## 5. Differences from legacy

### 5.1 Ruled

- F-2 / F-3: fractions, points, no rounding.
- #15 / G2-1: snapped UTC days.
- #61: vocabulary keys, refusals by name.
- #68: content only.
- #70: users = any content-video event.
- #72: first days.
- #101: session completion ÷ sessions with a play.
- #102: the growth N/A is the client's.
- Contract: a zero denominator gives null.

### 5.2 Questions raised by this plan (all ruled: decision log #124–#143)

Each question below is now a decision-log row: a → #124, b → #125, c → #126, d → #127, e → #128, f → #129,
g → #130, h → #131, i → #132, j → #133, k → #134, l → #136, m → #137. The owner ruled a, g, i and l; the team lead
adjudicated the rest. The recommendations below are what was ruled.

- **a. Which events make a video user (and a video session).**
  - F counts 7 event kinds; D counts 14 (§1.2-3).
  - Recommendation: F, the only source that holds every dimension. VD-28 then differs from legacy by the users whose
    only video events were D-only kinds: at most 0.2 % on prod (probe statement 3, 2026-10-29).
  - Measure the gap first: probe statement 3 (§7).
- **b. Merged reads of `TVideoDaily`.**
  - v2 reads every D measure merged by the sort key; legacy depends on the merge state (§1.2-1).
  - Recommendation: merged. The gap between v2 and legacy is legacy's noise, and the legacy comparison labels it.
- **c. The VIDEO key.**
  - Text id; identity per raw id; pre-release rows joined through the map (§2.3).
  - Recommendation: as described.
- **d. REFERRER_SOURCE on video.**
  - Serve it with F's `SRefererURLExternalName` alone. The collector writes the registrable domain into Name for every
    unknown site (engine-6 §1; R0: no hit with Name `''` and a host).
  - Or refuse it. VD-4…6 hand-off to SEO needs "plays from Google" by source, so the recommendation is to serve it and
    prove it on R0 and in probe statement 4.
- **e. Ad clamps.**
  - completed ≤ started, skipped ≤ started − completed, both per position; the total = Σ positions; click rate ≤ 1;
    only the three registry positions count (legacy `VideoAdsQueryBuilder`, `clampAdOutcomes`).
  - Recommendation: legacy's rules.
- **f. PLAYBACK_SOURCE keys.**
  - The closed map in §3.3, with every other value under UNKNOWN.
  - Recommendation: as described. Legacy shows raw values.
- **g. Caps on completion rates.** _Ruled (owner, 2026-10-31): accepted; built in 13a and applied by 13c's series through the same `videoMeasures`._
  - Legacy caps session completion on its channel card but not on its hero, and caps per-play completion on the detail
    trend but not on the hero or the table. Its impression-to-play rate and funnel shares are never capped.
  - Recommendation: cap `sessionCompletionRate` and `completionRate` at 1 everywhere, as `avgCompletion` (a completion in
    the window can belong to a start just before it); leave `impressionToPlayRate` and the milestone counts uncapped.
- **h. Quality drops beyond legacy's 50 rows.**
  - v2 counts every downgrade path.
  - Recommendation: as v2 does.
- **i. The fleet-wide 360p benchmark in the detail panel.** _Ruled (owner, 2026-10-31): accepted, outside._
  - It is a cross-project number with no contract item.
  - Recommendation: outside, as a coverage row. It reads other tenants' data.
- **j. Mixing families on a breakdown.**
  - Refuse it by name (§2.5); inside the video family, refuse a `having` on a source other than the sort's.
  - Recommendation: both refusals, additive later. The alternative is a joined statement per source pair.
- **k. #74 for video rows.**
  - A video-only Campaigns row needs no tagged hit.
  - Recommendation: as described.
- **l. Unknown renditions in the quality share base** (client rule, front issue). _Ruled (owner, 2026-10-31): accepted._
  - Legacy keeps them in the overview's base and removes them in the detail panel. v2 returns the labels verbatim.
  - Recommendation: one rule for both cards, removed from the base (the detail panel's); the front team applies it.
- **m. `0p` as a drop target.**
  - Legacy's `heightOf` parses `0p` as height 0, so 720p → 0p is a drop, while its share code treats `0p` as unknown.
  - Recommendation: a height of 0 is no rendition, so a change to or from `0p` is not a drop.

## 6. Not buildable as specified

- **N-1: the hero and the sources card fail under any filter-bar filter.**
  - `VideoSummary.site` passes `$filters` and selects D, U, P and A measures.
  - `VideoSummary.sources` selects `playbackCompletionRate` (P: PLAYBACK_SOURCE only).
  - Under #61 both are refused as soon as a device, location, referrer or UTM filter is set (VW-7…11). Legacy has no
    filters, so nothing regresses.
  - Fix, a screen-document change for the team lead: split `site` into an F call that takes `$filters` and an
    unfiltered call for the D/U/P/A cards, or have the client hide those cards under a filter.
  - **Ruled (team lead, 2026-10-29):** the client hides those cards under a filter; the screen document carries the
    client rule (13a). The refusal's reason does not reach the client: every engine refusal's `reason` rides in the
    Throwable's extensions, which the GraphQL envelope drops (issue #462, out of slice 13's scope).
- **N-7: `summary.totals` of video measures is past the GraphQL depth limit** (found building 13b, verified on the
  dev stack). `ASM_GQL_QUERY_DEPTH` is 5 (`configSchema.ts`, `.env.example`, ADR-0049); the `video { … }` sub-object
  adds a level, so `analyticsDevices { summary { totals { measures { video { users } } } } }` (VideoEnvironment, VD-20's
  share base) and `analyticsVideos { summary { totals { measures { video { plays } } } } }` (VideoTable) are six deep
  and rejected before any resolver runs. Rows (`rows { measures { video { … } } }`, five) and every other screen call
  fit. The server serves the totals.
  - **Ruled (team lead, 2026-10-29): the depth limit stays at 5.** `ASM_GQL_QUERY_DEPTH` is a DoS guard (ADR-0049),
    and one screen's shape does not justify widening it fleet-wide. VideoEnvironment and VideoTable read their share
    bases with an `analyticsTraffic` call of the same filters, window, context and comparison (four deep); the screen
    document carries it (13b).
  - **Equivalent, verified** (`readVideoBreakdown.test.ts`, "video breakdown totals"): on `analyticsVideos` and
    `analyticsDevices`, `summary.totals` is `readVideoTraffic` over the breakdown's filter terms, the same function and
    the same `VideoQueryReader.counts` calls (filters, parts, windows) as `analyticsTraffic`, so the two payloads are
    equal. A `search`, a `having`, the `sort` and the `limit` narrow the rows and `total` only, never the totals.
  - **Not general.** `analyticsCampaigns`' totals carry its population (`CAMPAIGN_TAGGED IN [TAGGED]`) and
    `analyticsTags`' the tagged pages (`totalsFilters`), so on those two a plain traffic call of "the same filters"
    is not their totals. No video screen reads them.
- **N-2: CITY on video** (VW-9). F has no GeoNames id. It is refused until an additive archive column exists.
- **N-3: VIEWPORT, VIEWPORT_HEIGHT, ORIENTATION on video.** They are refused, and no item needs them.
- **N-4: VD-19 (QUALITY_DROP, `qualityDrops`) is blocked until QE's DDL is in the repo.**
  - QE has no DDL in the repo (§1.2-5), so the from-2026-10-26 branch cannot be built or tested, and every current
    window reaches that day. A refusal for such windows would contradict #72, so the field is not served at all yet.
  - Unblock: `SHOW CREATE` of QE and `MvVideoQualityEvents` from prod (§7, statement 1, runnable now), committed by the
    archive's dump flow. No new DDL is involved.
  - QUALITY_DROP stays in 13c only if the dump has landed by then; otherwise it moves to a 13d.
  - **Resolved 2026-10-29 (probe statement 1):** QE is a MergeTree, `ORDER BY (PublicInstanceID, Day, PlaybackID,
Created, Seq)`, TTL 400 d, with `VideoID` and no `Placement`: its view keeps content only (an empty placement is
    content) and only rows with a playback id and a quality. QUALITY_DROP is buildable in 13c (no 13d), VIDEO included
    through the key map. The DDL is in `tmp/analytics-parity/slice-13/qe-ddl-prod.sql`; 13c decides whether it goes
    into `schema/historical/` (the archive's dump convention) or stays a test fixture.
  - **Decided (13c, 2026-10-31): committed to `schema/historical/`** as the deployed shape (`TVideoQualityEvents`,
    `MvVideoQualityEvents`; prod `SHOW CREATE` formatted by `formatQuery`, the database templated, the golden sums added
    as !1450 did). Evidence that no path reaches the prod archive: `schema/historical` is read by `apply-schema.sh` (the
    devstack's `ch-apply.sh`, the R0 stack, core-api's CI ClickHouse image) and by the archive's shell tests; the archiver
    image copies no `schema/`; `dump-schema.sh` runs the other way (prod to files); prod objects arrive only through
    `scripts/migrate/*.sql` (owner-run). So the files mirror prod, and nothing here applies DDL to a server.
- **N-5: per-video `errorRate`, `exitBeforeStartRate` and `playbackCompletionRate`** (P has no video id). This is
  already recorded as VW-63 / group-4 §5.3.
- **N-6: VIDEO on ad fields — refused (probe statement 5, 2026-10-29).** Only 2 of CHyjot2edlsQ's 32 ad rows (30
  days, 6.25 %) carry a `VideoID` that `TVideoDaily` knows as content; pPUsRuZitL3f has no ad rows. An ad break's
  `video_id` is not reliably its content video's, so a per-video ad read would match about 6 % of ad breaks. The ad
  fields keep AD_POSITION only (project-wide) and refuse VIDEO by name (`measure-not-available-for-dimension`); draft
  decision row "ads per video".

## 7. Unproven columns and the probe (read-only; the team lead runs it, as `prod-g4-project-probe.sql` is run)

**Ran 2026-10-29** (team lead, prod archive, read-only; `tmp/analytics-parity/slice-13/probe-13-*.out`):

1. Every column of the nine `TVideo*` tables equals the repo DDL, names and types (F 46, D 37, U 6, P 9, Q 9, QS 9,
   A 9; verified by a script diff), and `Records.GeoIPAutonomousSystemOrganization` exists. QE: 10 columns, DDL above
   (N-4).
2. F's `GeoResultCity` holds names (Tehran first; `''` is 6,238 of 186,104 rows): CITY stays refused (N-2).
3. §5.2-a: users F 6,278 vs D 6,281 (CHyjot2edlsQ), 53,863 vs 53,973 (pPUsRuZitL3f), a gap of at most 0.2 %; play
   sessions identical (1,767; 61,227). The seven-kind recommendation stands.
4. Nameless session referrers with a host: 0 of 9,121 and 276,674 rows: REFERRER_SOURCE = name is exact (row d).
5. Ad breaks' content `VideoID`: 6.25 % (N-6).

The statements are written but not committed yet; they land as `tools/parity/analytics-r0/prod-13-columns-probe.sql`
in 13a. Unproven:

- every column the plan reads on F, D, U, P, Q, QS and A (the repo DDL is not a dump);
- all of QE;
- `Records.GeoIPAutonomousSystemOrganization` (for ISP on raw).

```sql
-- 1. Every column of the video tables and the ISP column on Records; the QE pair's DDL.
SELECT table, name, type FROM system.columns
WHERE database = 'analytics' AND (table LIKE 'TVideo%' OR (table = 'Records' AND name = 'GeoIPAutonomousSystemOrganization'))
ORDER BY table, position SETTINGS max_execution_time = 30, log_comment = 'g13-probe:columns';
SELECT name, create_table_query FROM system.tables
WHERE database = 'analytics' AND name IN ('TVideoQualityEvents', 'MvVideoQualityEvents', 'MvVideoAdsDaily')
SETTINGS log_comment = 'g13-probe:qe-ddl';
-- 2. F's GeoResultCity holds names (one closed day).
SELECT GeoResultCity, count() FROM analytics.TVideoDailyFilterable
WHERE PublicInstanceID = {project:String} AND Day = '2026-10-27' AND Placement = 'content'
GROUP BY 1 ORDER BY 2 DESC LIMIT 5 SETTINGS max_memory_usage = 8000000000, max_threads = 4, max_execution_time = 60;
-- 3. The users / sessions gap between F (7 events) and D (14 events), content, one closed day (§5.2-a).
SELECT (SELECT uniqCombinedMerge(Users) FROM analytics.TVideoDailyFilterable WHERE PublicInstanceID = {project:String}
          AND Day = '2026-10-27' AND Placement = 'content') AS f_users,
       (SELECT uniqCombinedMerge(Users) FROM analytics.TVideoDaily WHERE PublicInstanceID = {project:String}
          AND Day = '2026-10-27' AND Placement = 'content') AS d_users,
       (SELECT uniqCombinedMerge(StartedSessions) FROM analytics.TVideoDailyFilterable WHERE PublicInstanceID = {project:String}
          AND Day = '2026-10-27' AND Placement = 'content') AS f_play_sessions,
       (SELECT uniqCombinedMerge(StartedSessions) FROM analytics.TVideoDaily WHERE PublicInstanceID = {project:String}
          AND Day = '2026-10-27' AND Placement = 'content') AS d_play_sessions
SETTINGS max_memory_usage = 8000000000, max_threads = 4, max_execution_time = 60;
-- 4. REFERRER_SOURCE: content plays whose session referrer has a host but no name (expected 0).
SELECT countIf(SRefererURLExternalName = '' AND SRefererURLExternalHost != '') AS nameless, count() AS rows
FROM analytics.TVideoDailyFilterable WHERE PublicInstanceID = {project:String} AND Day = '2026-10-27' AND Placement = 'content'
SETTINGS max_memory_usage = 8000000000, max_threads = 4, max_execution_time = 60;
-- 5. Ad events' VideoID: the share present in TVideoDaily's content ids (30 d; 1.0 = the map covers A).
SELECT countIf(VideoID IN (SELECT VideoID FROM analytics.TVideoDaily WHERE PublicInstanceID = {project:String}
         AND Day >= today() - 30 AND Placement = 'content')) / count() AS covered, count() AS ad_rows
FROM analytics.TVideoAdsDaily WHERE PublicInstanceID = {project:String} AND Day >= today() - 30
SETTINGS max_memory_usage = 8000000000, max_threads = 4, max_execution_time = 60;
```

How the probe runs:

- **Projects:** CHyjot2edlsQ (it has ads and quality shifts) and pPUsRuZitL3f.
- **Statements 2–5:** once per project.
- **Statement 1:** once.

## 8. The cost gate (COST_ONLY R13-\*; `prodCaps.ts` on every statement)

The gate runs on three projects, at 30, 90 and 365 days:

- CHyjot2edlsQ, the bench;
- pPUsRuZitL3f, the largest content project;
- UKRlSkNOScQA, heavy with ad units, which tests that `Placement` in the sort key prunes them.

**Video data starts 2026-09-25, so the 90- and 365-day cases read about 35 days.** The gate reports bytes per day, and
the year's cost is extrapolated (×10.4), not passed.

Expected rows at 30 days (≈ 30/33 of §1.1):

| Case      | Call                                                                  | Sources           | Expected rows read (pPUs / CHyjot)                                                                         |
| --------- | --------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| R13-1     | hero, compared (2 windows = 60 d of reads)                            | F, D, U, P, A     | F 9 M + D 0.66 M + U 4 M + P 3.9 M / F ≤ 8.6 M (ad rows pruned by the key) + D 0.5 M + U 3.3 M             |
| R13-2     | trend, DAY                                                            | F                 | as R13-1's F, current window only                                                                          |
| R13-3     | videos table, sort plays, compared, `total`, totals, limit 500        | F + vmap (D) + U  | F 9 M grouped by ~VideoID (pPUs ids: unknown; the blob-id case 2.1 M ids / 4 days, `VideoSqlHelper.js:96`) |
| R13-3s    | the same, sorted by replayRate, with `search`                         | U + vmap          | U 4 M, grouped by (video, user)                                                                            |
| R13-4 / 5 | channels / campaigns, `having` ≥ 100                                  | F                 | F                                                                                                          |
| R13-6     | environment OS and BROWSER_VERSION, compared, totals                  | F                 | F                                                                                                          |
| R13-7     | sources                                                               | F + P             | P 3.9 M grouped by playback                                                                                |
| R13-8     | quality (R13-8); drops (R13-8d, N-4 resolved)                         | Q; QS ∪ QE        | small; the drops window function reads only the playbacks with an adaptive change (+ the day before)       |
| R13-9     | ad positions                                                          | A                 | tiny                                                                                                       |
| R13-10    | providers, `having` ≥ 100                                             | F                 | F, grouped by ASN org                                                                                      |
| R13-11    | detail (row + trend + quality + devices + providers under VIDEO)      | F, D, U, Q + vmap | the vmap scan of D per call                                                                                |
| R13-12    | hero F-measures under DEVICE_TYPE + COUNTRY                           | F                 | F with predicates                                                                                          |
| R13-13    | the screen's share bases (N-7): `video.users` compared, `video.plays` | F                 | F, two `analyticsTraffic` calls (the totals the breakdowns no longer carry past the depth limit)           |

**13c cases as written** (`cost-gate-sql.ts`, `videoScreenCases`): R13-2 the trend; R13-8 renditions (watch time and
downloads) and R13-8d the downgrade paths; R13-9 the three ad positions; R13-11 the detail row under a VIDEO filter, with
R13-11t its split trend, R13-11q its renditions, R13-11d its devices and R13-11p its providers; R13-13 the two share
calls. R13-11t, 11q, 11d and 11p each read the key map once more than R13-1 does, so the vmap scan of D is the cost to watch.

**Likely the heaviest:** R13-3s and R13-1's U (exact uniq per video × user) and R13-3 on a blob-id project. They run under
`prodCaps.ts` (8 GB, 4 threads) and the 60 s timeout. A failure there gets an optimisation proposal, never a raw fallback.

## 9. R0 verify, e2e and the legacy comparison

**`verify-videos.ts` (R0).** The seed gains its own project, `r0video001`, so no existing verify script's counts move
(memory: seeds have readers). It plants every video event kind with the props the views read:

- placement content and ad;
- page slots;
- a pre-release id with a query string;
- an element id;
- a playback crossing UTC midnight;
- adaptive up- and downgrades;
- three ad positions plus an excess.

Checks:

- rule 1 for sums **and** uniq states (F vs D vs raw);
- Σ Q = F/D;
- the vmap keys and UNIDENTIFIED;
- merged D under a forced unmerged insert;
- every refusal in §2.2;
- each item's value against a direct statement.

**e2e.** `tests/e2e/analytics/videoGraphql.e2e.test.ts` runs on the shared dev ClickHouse, with fixtures seeded into
the TVideo\* tables in the existing `seed()` pattern. QE stays out until N-4 is resolved.

**Legacy comparison.** The `legacy-compare.ts` VD items follow #11, with the legacy statements captured on R0
(`legacy-capture.cjs`). Every U-row in §4 is labelled.

**As built (13c).**

- **`verify-videos.ts`** is idempotent: it deletes `r0video001` from `Records` and every `TVideo*` table (synchronous
  `ALTER … DELETE`; a view never cascades one), only on a local server (`r0parity-clickhouse`, `shahin-clickhouse`) and a
  project id starting with `r0`; any other host exits 2 before a statement. Its 13c checks: Σ renditions = F plays and
  heartbeats and D downloads, and per label = raw; the downgrades = a raw window function over the shift days, the events
  days, a window over the cut, and under a VIDEO filter; the ad positions = raw, clamped per position; every series bucket
  (DAY, WEEK; F, D, U, P) = the read of that bucket's days, a VIDEO-split series = raw plays per day; the refusals.
- **The R0 stack** (`stack.sh up`, ClickHouse 25.8.24.21) now creates `MvVideoQualityEvents` from the committed file, so
  the events branch is verified on prod's version.
- **e2e** (`videoGraphql.e2e.test.ts`) adds renditions, downgrades before the cut (shift rollup) and from it (events,
  a playback across a day edge, a user's switch, `0p`, an upgrade), ad positions, series (DAY, MONTH, splits, refusals,
  #72) and the screen document's `VideoDetail` and `VideoSummary` verbatim.
- **Legacy comparison.** `legacy-compare.ts` carries the video items VD-12, 18, 19, 24 and 27 (detail trend and
  renditions; `CMP_VIDEOS` names the video per project); the hero, table, sources, channels and environment items of
  13a/13b have no item yet.

## 10. The MR split (each green on its own; each exposes only what it serves)

| MR      | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Items                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **13a** | contract: the video part PROPOSED → approved (#61, #68–#72; commerce, exchange, `currency`, `searches` stay proposed); served SDL: `AnalyticsVideoMeasures` and `…Changes` without `qualityDrops`, `VIDEO_*` measure values, the `VIDEO` and `PLAYBACK_SOURCE` dimensions as filters; domain `video.ts` (measures, matrix, `VIDEO_FROM`, refusals) and measureMath; the reader for F, D (merged), U, P, A and vmap; `analyticsTraffic` with the grain rule; the R0 project, `verify-videos` (traffic half), `prod-13-columns-probe.sql`, e2e, changelog | VD-1, 2, 7–11, 14, 17, 22; VW-41, 58–60, 76, 81, 89, 93; filters VW-3, 6, 7, 10, 11, 13 (but N-1) |
| **13b** | `analyticsVideos` (VIDEO with its extras, search, sort, compare and `total`; PLAYBACK_SOURCE; ISP) and `VideoGrouping`; the `ISP` dimension; video on the referrers, campaigns, devices, locations (COUNTRY), pages and tags breakdowns plus `summary.totals`; ISP on the hit and event families' raw reads (G2-Q8) and refused on sessions; the cost-gate cases R13-1, 3, 3s, 4–7, 10, 12                                                                                                                                                              | VD-13, 16, 20, 21 (client), 25, 28, 29, 32; VW-8, 14, 37, 44, 48, 57, 63, 96                      |
| **13c** | `analyticsSeries` for video (UTC days, splits); QUALITY, AD_POSITION and QUALITY_DROP (only if N-4's DDL dump has landed, else a 13d); `VIDEO_QUALITY` and `AD_POSITION` dimensions and `qualityDrops`; detail-panel composition; R13-2, 8, 9, 11; the legacy comparison                                                                                                                                                                                                                                                                                | VD-12, 18, 19, 24, 27, 30; VW-42, 49                                                              |

13a carries the most risk: the vmap, merged D and the grain rule. Everything else reuses them.

**13c as built:** series (`readVideoSeries.ts`), the three groupings and `qualityDrops` (reader: `qualitySql`,
`qualityShiftsSql`, `adRows`), the dimensions, the screen run verbatim, R13-2/8/8d/9/11/13, the R0 verification and the
legacy items. VD-12, 18, 19, 24, 27, 30 and VW-42, 49 are served. N-4 is resolved (the DDL is in the repo); no 13d.

## 11. Open risks

- **13c.** The drops' events branch has never run on prod volume (R13-8d), and a VIDEO-split series reads the key map
  twice (R13-11t). Prod's `MvVideoAdsDaily` carries `Created >= 2026-10-04` (the repo file is the no-cutoff form, its
  header says so; probe statement 1 proved the columns, not the view bodies), so ad counts before that day came from
  the backfill, not the view. The views still bake in `Valid = 1`.

- **The views bake in `Valid = 1`.** The owner's 2026-10-28 direction ("drop stored Valid; never bake it into new
  tables") will change these views. Video counts move when it does, on the archive's schedule, not this slice's.
- **The vmap costs on blob-id projects.** It reads one D scan per call, with millions of raw ids. If R13-3 fails, the
  fallback is an id map read once per request and shared by its statements, not a new table.
- **The uniq states have never been compared across F and D on prod.** Rule 1 for sessions is inferred, not proven,
  until verify-videos and probe 3 run.
- **N-1 is a client rule.** The screen document carries it (13a); the front team applies it.
- **The legacy comparison needs legacy's video page on prod** (legacy v1.0.1, 2026-10-21). Its QE branch
  (`QUALITY_EVENTS_FIRST_FULL_DAY`) may not be deployed (stateless-quality rollout), so VD-19 compares on QS days only.
