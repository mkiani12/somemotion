## 2026-10-31 — analytics: video series, renditions, downgrades, ad positions and the detail panel (slice 13c)

- **`analyticsSeries` serves video measures** (contract group 4; `engine-13.md` §2.4, §3.2).
  - Buckets are UTC days (DAY, WEEK, MONTH). The context must be `UTC` and AUTO is DAY. Another zone is refused
    (`time-zone-not-available-for-measure`), as is HOUR (`granularity-not-available-for-dimension`) and a mix with
    another measure family (`mixed-window-grain`).
  - A bucket equals the `analyticsTraffic` read of its own days: each rollup is grouped by the bucket, a uniq state is
    merged inside it, a playback that crosses a bucket edge belongs to both. Empty buckets are filled, counts 0 and rates
    null. The completion caps apply per bucket (the traffic read's own math).
  - The split keys are pushed into the statements, so a `VIDEO` split reads only the asked videos. The split takes the
    dimensions the selected measures' rollups hold (a device split with `replayRate` is refused by name).
  - The ad fields and `qualityDrops` are not served on a series (`measure-not-available`).
- **`analyticsVideos(groupBy: QUALITY | QUALITY_DROP | AD_POSITION)`** replaces the 13b refusals.
  - `QUALITY` rows are renditions, labels verbatim (`unknown` included): `watchTime`, `plays` and `downloads` from the
    rendition rollup. Under a rendition key or filter every other measure is refused by name
    (`measure-not-available-for-dimension`, `dimension: VIDEO_QUALITY`). The unknown renditions leave the share base on
    the client (decision row l).
  - `QUALITY_DROP` rows are `from>to` paths with `fromQuality` and `toQuality`, counted by `qualityDrops` (new on
    `AnalyticsVideoMeasures`, `AnalyticsVideoMeasureChanges` and as `VIDEO_QUALITY_DROPS`). Before 2026-10-26 they are
    read from the shift rollup, from it from `TVideoQualityEvents` with the previous rendition derived per playback
    (the day before the window included); a window over the cut reads both. Adaptive changes to a lower rendition
    only: a user's switch, an upgrade and a change to or from `0p` are none (row m); every path counts, not legacy's
    first 50 (row h).
  - `AD_POSITION` rows are `PRE_ROLL`, `MID_ROLL`, `POST_ROLL`, each clamped on its own. A `VIDEO` key or filter on the
    ad fields is refused by name (N-6).
  - `VIDEO_QUALITY` and `AD_POSITION` are filter, split and key dimensions of the video measures; the hit, session and
    event families refuse them by name.
- **`TVideoQualityEvents` and `MvVideoQualityEvents`** are in `apps/analytics-archive/schema/historical` as deployed
  (prod `SHOW CREATE`, probe statement 1). They reach the dev `apply-schema.sh` and core-api's CI ClickHouse image only;
  no DDL is applied to a server by this change.
- **The video screen document runs verbatim.** The e2e executes `VideoSummary` and `VideoDetail` from
  `screens/video.graphql` (the depth limit included). The two quality cards carry the client rule for unknown
  renditions; the detail panel's fleet-wide 360p benchmark has no field (owner 2026-10-31, rows i and l in coverage).
- **Tooling.**
  - `verify-videos.ts` is idempotent (it deletes `r0video001` from `Records` and every `TVideo*` table first, on a local
    dev or R0 server only) and checks the renditions (Σ renditions = the site), the downgrades against a raw window
    function (before, after and over the cut, and under a VIDEO filter), the ad positions, every series bucket against
    the read of its own days (DAY and WEEK, on four rollups) and the refusals.
  - The cost gate gains R13-2, R13-8, R13-8d, R13-9, R13-11 (and its parts t, q, d, p) and R13-13, the screen's share
    bases (N-7).
  - `legacy-compare.ts` gains the video items VD-12, 18, 19, 24 and 27 and registers them with the report (`CMP_VIDEOS`
    names the detail video per project).
