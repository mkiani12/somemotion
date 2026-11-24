## 2026-10-29 — analytics: `analyticsVideos` and video measures on the breakdowns (slice 13b)

- **`analyticsVideos(groupBy: VIDEO | PLAYBACK_SOURCE | ISP)`** (contract group 4, approved; `engine-13.md` §3.3).
  - VIDEO rows are keyed by the video's text id (`UNIDENTIFIED` for element ids) and carry `title`, `url`, `pageUrl`,
    `duration` and `hasValidSchema`. These fields are read only when selected, and only for the returned keys.
  - PLAYBACK_SOURCE rows pair plays (from the filterable rollup) with per-playback completion (from the playbacks
    rollup).
  - ISP rows are the GeoIP organisation, verbatim.
  - `QUALITY`, `QUALITY_DROP` and `AD_POSITION` are refused by name (`grouping-not-available`) until 13c.
- **Video measures on the group-2 breakdowns.** `video { … }` is served on referrers, campaigns, devices, locations
  (COUNTRY), pages and tags.
  - Its rows are the keys of the sort measure's rollup (#61). Every other rollup is read for the returned keys only.
  - Floors, the sort, the search and `total` apply to that rollup's rows.
  - A floor on a measure of another rollup is refused (`having-not-on-sort-source`). A mix with another measure family
    is refused (`mixed-measure-families`).
  - A breakdown over more than 100,000 keys is refused (`ANALYTICS.TOO_EXPENSIVE`), never cut.
  - A page row's `title`, and a campaign row's `firstSeenAt` / `lastSeenAt`, are refused on video rows: no video rollup
    holds them.
- **`VIDEO_*` sort and floor values.** `AnalyticsMeasure` gains them, all except `VIDEO_QUALITY_DROPS`, which comes
  with 13c.
- **`ISP` is a dimension.** Video measures read it from the filterable rollup, and the hit and event families read raw
  `Records` within the span caps (G2-Q8). The finalized sessions refuse it.
- **Known limit.** `summary.totals { measures { video { … } } }` is six levels deep and the GraphQL depth limit stays
  at 5 (`ASM_GQL_QUERY_DEPTH`, ADR-0049), so those totals are rejected before any resolver runs (engine-13.md N-7,
  ruled 2026-10-29). A client reads a video share base with an `analyticsTraffic` call of the same filters, window,
  context and comparison: on `analyticsVideos` and `analyticsDevices` it equals `summary.totals`, whatever the search,
  floor, sort or limit (unit-tested). The video screen document does so.
- **Tooling.**
  - `verify-videos.ts` checks that the VIDEO rows sum to the site, and that a replay is counted on the text key.
  - The cost gate gains R13-3, R13-3s, R13-4…R13-7 and R13-10. A keyed video statement now answers made-up keys, so
    the reads for the returned keys are emitted too.
