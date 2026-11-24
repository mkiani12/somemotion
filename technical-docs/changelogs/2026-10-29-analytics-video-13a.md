## 2026-10-29 — analytics: video measures on `analyticsTraffic` (slice 13a)

The video part of the analytics contract is approved (#61, #68–#72; `docs/design/analytics-queries/engine-13.md`).
`AnalyticsMeasures` and `AnalyticsMeasureChanges` gain `video { … }` (34 fields; `qualityDrops` arrives with 13c), and
`AnalyticsDimension` gains `VIDEO` and `PLAYBACK_SOURCE`. This slice serves them on `analyticsTraffic` only. Every other
query refuses a video measure by name (`measure-not-available`) until 13b and 13c.

- **Sources.** Each measure is read from the one archive `TVideo*` rollup that defines it, never raw:
  - `TVideoDailyFilterable`: plays, users, completion, watch time, buffer and stall;
  - `TVideoDaily`, read merged by its sort key before any length or identity condition: videos, milestones, length,
    downloads, startup, rebuffering;
  - `TVideoUserSessionsDaily`: replay rate;
  - `TVideoPlaybacksDaily`: error, exit before start, per-playback completion;
  - `TVideoAdsDaily`: ad breaks, clamped per position as legacy does.

  Content video only (#68).

- **Refusals.** A filter the measure's rollup does not hold is refused by name (422,
  `measure-not-available-for-dimension`). On video, CITY, VIEWPORT, VIEWPORT_HEIGHT and ORIENTATION are always
  refused. A call that mixes video with any other measure is refused (`mixed-window-grain`).
- **Windows.** A video read snaps its windows to whole UTC days (#15) and echoes them, with the context in UTC.
- **Comparison before the data.** A comparison window that starts before the video data (2026-09-25 15:00 UTC) has no
  `previous` and no `change` (#72).
- **VIDEO key.** `VIDEO` is the video's text id, with `UNIDENTIFIED` for element ids. It is resolved through a key map
  built from merged `TVideoDaily`, so a pre-release id cut of its query string matches on every rollup.
- **`PLAYBACK_SOURCE` keys.** `MANUAL`, `AUTOPLAY`, `SUGGESTED`, `CONTINUE_WATCHING`; any other value is `UNKNOWN`.
- **Caps.** Completion rates are capped at 1 (owner question §5.2-g, built to the recommendation).
- **Screen document.** The video screen gains a client rule: under a filter-bar filter the client hides the cards whose
  rollup holds no visit dimension (N-1).
- **Tooling.**
  - `tools/parity/analytics-r0/verify-videos.ts` checks rule 1 for the sums and the uniq states, and the reader against
    raw (passes on the dev ClickHouse).
  - `prod-13-columns-probe.sql` confirms on production the columns the repo DDL only shows.
  - The cost gate gains R13-1 and R13-12.
