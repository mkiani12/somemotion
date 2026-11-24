## 2026-11-08 — analytics: unfiltered video reads and the video key map take per-video rollups (issue #505 steps 4 and 3)

`TVideoDailyFilterable` is keyed by about 30 dimensions and is the largest byte reader of the Video page. On prod
pPUsRuZitL3f at 365 days (cost gate cg-161415): R13-1 totals 8.35 GiB, run twice for "vs previous"; R13-2 trend
3.45 GiB; R13-3 videos table 5.36 GiB. The read now takes the archive's new `TVideoDailyByVideo` (analytics-archive
migration `20261108-video-by-video-v1.sql`) when the read names no dimension but the video. That table is keyed only by
`(PublicInstanceID, Placement, Day, VideoID)` and fed by a cascade view on the filterable rollup, so it holds the same
sums and `uniqCombined` states.

- **Routing** (`readsByVideo` in `VideoQueryReader`, engine-13.md §3.1). A filterable statement reads the per-video
  table only when all of these hold:
  - no filter term is on another dimension (a VIDEO term goes through the key map, as before);
  - the referrer attribution is unset or `SESSION`;
  - no key is on another dimension;
  - no extra other than `url` is asked for.

  Everything else stays on `TVideoDailyFilterable`: PAGE, PLAYBACK_SOURCE, visit dimensions, channels, campaigns,
  environment, ISP, keywords, and the page-view attribution. The SQL is the same on either table.

- **Key map (issue #505 step 3, engine-13.md §2.3).** Every key map now reads the archive's `TVideoKeysDaily`, not
  `TVideoDaily`. This covers the VIDEO filter, the joined map of a VIDEO key, the titled map of a search, the detail
  panel's map and the narrowed candidate ids. The new table is `TVideoDaily`'s identity columns, titles and starts,
  merged per `(Day, Placement, VideoID)` by a cascade view.
  - The rule text is unchanged; it now runs on that merged row instead of each page's row.
  - Measured on prod: 2.7 content pages per video-day (pPUsRuZitL3f, 30 days), and 0 of 665,392 video-days give a
    different key (three bench projects, all data).
  - The `videos` count and a video row's own fields stay on `TVideoDaily`.
- **Fix: a video's `pageUrl` is deterministic.** It was `argMaxIf(URLUsed, Day, starts > 0)`. A day row holds no time
  of play, so when a video played on several pages on its latest day, the statement returned whichever page it read
  first, and a refresh could show another one. It now takes the latest day, then the page with the most starts that
  day, then the greatest URL.
- **No other new behaviour.** The GraphQL schema, the generated contract (0 pending) and the numbers are unchanged:
  - `videoByVideoParity.e2e.test.ts` re-runs every routed statement on the filterable rollup and requires identical
    rows for totals, the trend, and the videos table (by VIDEO, with a search, asked keys and a VIDEO filter);
  - a unit test parses the routed parts, extras and scope against the table's committed DDL;
  - the same e2e re-runs every key-map statement with its maps on `TVideoDaily`'s page rows and requires identical
    rows (videos table searched, VIDEO filter, detail panel, replay keyed by video, the `videos` total).
- **Deploy order.** The archive migration (both tables) must be applied first, then the 2026-09-25 to T0 heal, then `verify-day`.
  Stage reads the prod archive, so this reader must not ship before both tables exist there: a missing one fails
  every unfiltered video read and every read through the key map.
- **Rollback floor:** any older image (routing only; the tables may stay).
