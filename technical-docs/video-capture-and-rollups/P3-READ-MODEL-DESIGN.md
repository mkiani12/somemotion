# P3 — video dashboard read model (design)
**Date:** 2026-09-20 · **Revised 2026-09-21 after measuring production.**
**Status:** DESIGN — no DDL applied. The two owed measurements are now taken;
see `P0-PRODUCTION-MEASUREMENT.md`, which **overturns this document's source
table** and several of its estimates. Corrections are inline below.

Companion to `ANALYSIS-AND-PLAN.md`. P3 is the only phase with no unresolved
prerequisite: P1 shipped (!728), P2 is gated on network access to the ad
networks, P4 depends on this.

---

## 1. Why a rollup is not optional here

Three verified facts force it:

1. **`Props` is a JSON column, and this repo forbids querying inside one.**
   `.claude/skills/clickhouse-schema-design.md` **Rule 8** — *"JSON columns are
   write-once, query-never … Never query inside JSON columns (no filtering, no
   aggregation) … Extract structured fields to typed columns if queries needed.
   JSON query performance is 10-100× slower."* Every dimension this dashboard
   needs — `video_id`, `provider`, `placement`, `quality`, `playback_source` —
   lives in `Props`.
2. **`EventName` is not in the archive's sort key.** The table is
   `ORDER BY (PublicInstanceID, Created)`. A 30-day video dashboard would prune
   to the project and range, then scan **every event row** in it and
   JSON-extract per row.
3. **Heartbeats dominate the row count.** `video_heartbeat` fires ~every 10 s of
   active playback and the archive's own DDL notes it is held **512 days**. The
   raw table is the worst possible thing to aggregate on demand.

No video rollup exists today — every `T*` table in the archive is
pageview/keyword/session-shaped, and `materialized-views-rv2-staging/clones.sql`
contains **zero** `media_`/`EventName` references. This is greenfield.

---

> ## ⚠️ CORRECTION (2026-09-21) — the source table is `analytics.Records`
>
> This document was written against `analytics.RecordsV2`. **That table does
> not exist**, on the archive or anywhere else (measured, then confirmed by the
> owner). The archive's **`analytics.Records` IS the v2 schema under the v1
> name** — 138 columns including `EventName`, `EventPack`, `Props JSON`,
> `UserProps`, `RetentionDays`, and no breadcrumb columns. 733 GiB,
> `ORDER BY (PublicInstanceID, Created)`, `PARTITION BY toYYYYMMDD(Created)`.
>
> So everything below about shape, sort key and access pattern **holds** — only
> the name was wrong. Read every `RecordsV2` in this document as `Records`.
>
> **And do not hardcode either name.** The owner states the collector tables
> will be swapped soon, also keeping the v2 table as `Records`;
> `ASM_ANALYTICS_COLLECTOR_RECORDS_V2_TABLE` exists precisely so the collector
> can be repointed without a rebuild. Resolve the table by schema (does it have
> `EventName`/`Props`?) or by the same config the collector reads — a literal
> name in an MV, a rollup, a QueryBuilder or a runbook will break silently at
> the swap.

## 2. House pattern this follows

Copied from `TPageVisitsDailyV3` / `TPageVisitsDailyFilterableV3`, which are the
canonical engagement rollups — not invented:

- `ENGINE = AggregatingMergeTree`
- `PARTITION BY toYYYYMM(Day)` (schema-design **Rule 11**: >90-day TTL ⇒ monthly)
- `ORDER BY (PublicInstanceID, Day, <entity key>)` — low-cardinality first, per
  `clickhouse-best-practices` `schema-pk-cardinality-order`
- `SimpleAggregateFunction(sum, UInt64)` for additive counters,
  `AggregateFunction(uniqCombined, FixedString(24))` for distinct users/sessions
- Derived rates as `ALIAS` columns, so the rate formula lives in the schema once
  (rule #17 DRY) instead of in every query
- A **base** table plus a **`Filterable`** sibling carrying the filter
  dimensions in the ORDER BY tail

---

## 3. Grain

**One row per `(PublicInstanceID, Day, VideoID)`.**

`VideoID` is `cityHash64(video_id)` — a `UInt64`, exactly as `PageID` is a
`cityHash64` of the page path. Justification: schema-design **Rule 10**
("UInt64 for high-cardinality IDs") and **Rule 9** (`video_id` is unbounded,
so `LowCardinality` is wrong). The readable `video_id`/`video_title` ride
along as `SimpleAggregateFunction(max, String)`, same as `URLUsed`/`PTitle` do.

### 3.0 ⚠️ Synthesized `video_id`s collide — exclude them

`PageID` is safe to hash because `cityHash64(path)` is 1:1 with the path.
**`VideoID` is not equivalent.** When a detector resolves no id candidate,
`buildMediaProps` synthesizes one from a per-page-view counter:

```js
anonymousMediaSeq += 1;
mediaId = String(provider) + '-media-' + anonymousMediaSeq;   // 01-media-props.js
```

That counter is shared by every provider and every detector **for the lifetime
of one runtime instance** — i.e. one page view. So the first unidentified video
on *every* page view is `chakavak-media-1`, and they all hash to the same
`VideoID`. Different videos, one rollup row, and `max(VideoTitle)` then picks an
arbitrary one of their titles.

> **CORRECTION (2026-09-21), measured:** synthesized ids are **13 rows in
> 12 M (0.00 %)** on `CHyjot2edlsQ` — real in principle, negligible in
> practice. Excluding them still costs nothing, so the decision below stands,
> but it is not the id problem that matters.
>
> **The id collision that DOES matter is different and larger:** `plyr` reports
> `video_id='player'` for **246 k rows** — a generic DOM element id reused on
> every page — and the ad unit `tavoos_video_native-2848_player` collapses
> **1.47 M rows** onto one id. Neither is the synthesized-counter case, and
> neither is fixable by excluding a `<provider>-media-<n>` pattern. Treat a
> suspiciously low `distinct media` for a provider as the signal.

**Decision: exclude synthesized ids from the rollup** — the MV filters out
`video_id` matching `^<provider>-media-\d+$` and they are counted only in a
project-level "unidentified media" bucket. A merged row across unrelated videos
is worse than a missing one, and zone 5's per-video table reads this key
directly.

**This also distorts §7 measurement 2.** Distinct `video_id` per project/day
will read *lower* than reality while synthesized ids are folded together —
if that count looks suspiciously low, this is the first thing to check, not a
sign the grain is comfortable.

### 3.1 `Placement` is a KEY column, not a payload column

This is the join point with request #2 and the most important single decision
here — and the measurement promoted it from important to **mandatory**:
**~93 % of this instance's media events are ad creatives**, and ad share of
`video_started` is ≥ 94 %. Without exclusion the dashboard is 93 % noise.
Every one of those rows currently reads `placement='content'`. Ad exclusion is applied on **every** panel of the dashboard, so it must
prune, not filter after the fact. Putting `Placement` in the ORDER BY
immediately after `Day` means "content only" reads a contiguous key range
instead of reading ad rows and discarding them.

**Type: `LowCardinality(String)`, not an app-layer `UInt8`.** Per
`.claude/skills/clickhouse-app-layer-enums.md`, the three-question test:

| Q | Answer here |
|---|---|
| 1. How many writers? | A **materialized view** (SQL), not a single Go path — the app-layer case is already weaker than its worked example |
| 2. Does a human read it directly in SQL? | **Yes.** Ad misclassification will be debugged by hand, and the label *is* the point of the column |
| 3. Value set growth across schema copies? | Possible (`promo`, `trailer`), but Q2 already decides it |

Q2 is decisive: *"If yes, `Enum8` or `LowCardinality(String)` is the value — the
label is the whole point of the column at read time."*

> ⚠️ **Prerequisite carried from P2:** `placement` is currently written by
> `putTrimmedString(props, 'placement', ex.placement, 20)` — an unvalidated
> 20-char string. Before it becomes a **key column** it must move to `putEnum`
> with `['content','ad']`, or a typo silently becomes a third key value that is
> neither included nor excluded correctly. **This DDL must not land before that
> SDK change.**

---

## 4. Proposed DDL

```sql
-- Base rollup: one row per project/day/media/placement.
CREATE TABLE analytics.TVideoDaily
(
  `Day`               Date,
  `PublicInstanceID`  LowCardinality(String),
  `Placement`         LowCardinality(String),   -- 'content' | 'ad'  (§3.1)
  `VideoID`           UInt64,                   -- cityHash64(Props.video_id)

  `VideoKey`          SimpleAggregateFunction(max, String),  -- raw video_id
  `VideoTitle`        SimpleAggregateFunction(max, String),
  `Provider`          SimpleAggregateFunction(max, LowCardinality(String)),
  `VideoDurationSec`  SimpleAggregateFunction(max, UInt32),

  -- funnel counters (PRD zones 1-2)
  `Impressions`       SimpleAggregateFunction(sum, UInt64),
  `PlayIntents`       SimpleAggregateFunction(sum, UInt64),
  `Starts`            SimpleAggregateFunction(sum, UInt64),
  `Completions`       SimpleAggregateFunction(sum, UInt64),
  `Milestone25`       SimpleAggregateFunction(sum, UInt64),
  `Milestone50`       SimpleAggregateFunction(sum, UInt64),
  `Milestone75`       SimpleAggregateFunction(sum, UInt64),
  `Downloads`         SimpleAggregateFunction(sum, UInt64),

  -- watch time (§5)
  `Heartbeats`        SimpleAggregateFunction(sum, UInt64),
  `WatchSecEstimate`  SimpleAggregateFunction(sum, UInt64),

  -- technical quality (PRD zone 3) — DISTINCT sessions, per the PRD's
  -- "لجر محاسباتی": technical rates count sessions, never events, so one bad
  -- session cannot inflate the number past 100%.
  `StalledSessions`   AggregateFunction(uniqCombined, FixedString(24)),
  `BufferedSessions`  AggregateFunction(uniqCombined, FixedString(24)),
  `ErrorSessions`     AggregateFunction(uniqCombined, FixedString(24)),
  `BufferMsSum`       SimpleAggregateFunction(sum, UInt64),

  `Users`             AggregateFunction(uniqCombined, FixedString(24)),
  `Sessions`          AggregateFunction(uniqCombined, FixedString(24)),

  -- derived rates live here ONCE (rule #17), never re-spelled per query
  `CompletionRate` Nullable(Float64) ALIAS if(Starts > 0, Completions / Starts, NULL),
  `PlayRate`       Nullable(Float64) ALIAS if(Impressions > 0, Starts / Impressions, NULL),
  `AvgWatchSec`    Nullable(Float64) ALIAS if(Starts > 0, WatchSecEstimate / Starts, NULL)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(Day)
ORDER BY (PublicInstanceID, Day, Placement, VideoID)
SETTINGS index_granularity = 8192;
```

### 4.1 Verified on ClickHouse 25.8 (the production image line)

The DDL above was compiled and merge-tested against
`clickhouse/clickhouse-server:25.8-alpine`, not just reasoned about:

- **`SimpleAggregateFunction(max, LowCardinality(String))` is accepted and
  round-trips.** It is the one column that departs from the sibling tables
  (`TPageVisitsDailyV3` uses plain `String` for every `max` column), so it was
  checked explicitly rather than assumed. `Provider` has ~10 distinct values,
  which is squarely inside schema-design Rule 9's "<1K distinct:
  LowCardinality almost always wins".
- Two partial inserts for the same key merged to the expected totals under
  `OPTIMIZE … FINAL`, and the `uniqCombined` states merged to the correct
  distinct count.

> ⚠️ **The `ALIAS` rate columns are correct only on merged data — measured.**
> With two unmerged parts for one key, `SELECT VideoID, PlayRate FROM
> TVideoDaily` returned **two rows, `0.4` and `0.3333`** — per-part partial
> rates, both wrong. The same read with `FINAL`, and an explicit
> `GROUP BY` + `sum()` read, both returned the correct `0.375`.
>
> Background merges are asynchronous, so **unmerged parts are the normal
> production state**, and the naive read is the one a person writes first. This
> property is inherited from the house pattern — `TPageVisitsDailyV3`'s
> `BounceRate` / `EngagementRate` / `AvgTimeOnPage` behave identically — so it
> is not a reason to drop the ALIASes, which still keep each rate formula in
> one place (rule #17). It **is** a reason to state the contract: the report
> layer must read these tables with an explicit aggregate
> (`sum(Starts)/nullIf(sum(Impressions),0)`), or with `FINAL`. P4's QueryBuilder
> should never emit a bare `SELECT <rate>` against this table.
>
> **Checked: nothing is broken today.** No QueryBuilder selects
> `BounceRate`/`EngagementRate`/`AvgTimeOnPage` — every existing report computes
> its rates in JS from summed counters (the `*Report.js` DTOs), which is the
> correct shape. The ALIAS columns are effectively documentation today. This is
> a contract to preserve in P4, not a production incident to raise.

The `Filterable` sibling repeats the head and appends the PRD's global filter
dimensions to the ORDER BY tail — device/browser/OS, country/city, ISP,
referrer channel, UTM set, user type, `playback_source`, and quality — exactly
as `TPageVisitsDailyFilterableV3` does. It is deliberately **not** spelled out
here: its dimension list should be copied from the filter panel that P4
actually builds, not guessed ahead of it.

---

## 5. Watch time — PRD Open Question 1, answered from the code

The PRD asks: *"timestamp difference, or a 10-second heartbeat?"*

**The data settles it: timestamp-diff is not available.** `02-media-session.js`
accumulates `bankedActiveMs` across play segments (`bankActiveSegment` at
`:306`, `beginPlaySegment` at `:317`) — but that total is used only to drive
heartbeat cadence and is **never emitted as a prop**. No event carries elapsed
watch time.

**Recommendation: `Heartbeats × heartbeatMs`.** It is the right estimator, not
merely the available one:

- Heartbeats are driven by **banked active-playback time**, so pause and buffer
  are already excluded — which is precisely the PRD's definition.
- It degrades gracefully: a user who closes the tab keeps every heartbeat
  already delivered. A timestamp-diff would need a reliable final event, which
  page-hide does not guarantee.
- It cannot be inflated by seeking, unlike `position_sec`.

**State the limitation in the UI:** resolution is one heartbeat interval
(~10 s), so a video watched for less than that measures **zero**. That
interacts directly with the PRD's "مدت ویدیو — کوتاه (زیر ۱ دقیقه)" filter: the
shorter the bucket, the coarser this metric. `WatchSecEstimate` is named
`…Estimate` for that reason and should be labelled as such.

**Evidence that would reverse this:** the SDK starting to emit `bankedActiveMs`
as a prop. That is a small SDK change and would give an exact figure — worth
proposing to the pack owner as a follow-up, at which point the column becomes
`WatchSecSum` and the estimator is retired.

---

## 6. Event coverage — the PRD is stale, in the project's favour

The PRD's *"Needs Approval — رویدادهای فاز بعد که هنوز ارسال نمی‌شوند"* list
predates the media-family-v2 pack. Measured against the pack's actual
`emit`/`doEmit` call sites today:

| PRD says "not sent yet" | Reality | Consequence |
|---|---|---|
| `video_impression` | ✅ **emitted** (all 10 detectors) | زون۱ "نرخ نمایش به پخش" can be built now — drop the "فاز بعد" chip |
| `video_play_intent` | ✅ **emitted** (`02-media-session.js`) | EBVS can be built now |
| `video_error` | ✅ **emitted** | زون۳ "نرخ خطای پخش" can be built now |
| `video_subtitle_changed` | ✅ **emitted** (`change('subtitle')`) | buildable |
| `video_cta_clicked` | ❌ not emitted | genuinely next-phase |
| `video_intro_skipped` | ❌ not emitted | genuinely next-phase |

Full emitted set — **24 events**, scanned from every `media_*` string literal
in non-comment code, not only literal arguments to `emit(`/`doEmit(`:

```
ads_video_clicked      ads_video_completed   ads_video_skipped     ads_video_started
video_buffered        video_completed      video_download       video_error
video_fullscreen_toggled  video_heartbeat  video_impression     video_interrupted
video_next_autoplayed video_paused         video_play_intent    video_progress
video_quality_changed video_rate_changed   video_resumed        video_seeked
video_stalled         video_started        video_subtitle_changed  video_volume_changed
```

Not emitted by any detector: `video_cta_clicked`, `video_intro_skipped`.

> ⚠️ **Zone 4 (درآمدزایی) — correction.** An earlier draft of this document
> said *"no detector emits `ads_video_*`"*. **That was wrong**, and the error
> came from scanning only literal arguments to `emit(`/`doEmit(`: the JW Player
> detector emits all four through `emitAd(eventName, e)`
> (`60-detector-video-jwplayer.js:673-704`), passing the name as a variable.
>
> The accurate statement is narrower and still limiting: **`ads_video_*` is
> emitted by the JW Player detector only.** The aps/Chakavak bridge emits no ad
> events at all — which matches
> `dogfood/reports/2026-08-31-chakavak-root-cause.md`, where the design's §8
> bridge-mapping table was found to contain no ad events and `vast_selected`
> was observed empirically but never specced.
>
> **Consequence:** zone 4 is buildable for a JW Player deployment, and has **no
> source for `CHyjot2edlsQ`**, which is a Chakavak publisher. Do not build zone
> 4 against the target instance expecting data, and do not invent an aps ad
> vocabulary before observing real ad envelopes — the drift `sdk-parity.md`
> exists to prevent.
>
> Note JW Player also suppresses `ads_video_*` entirely when it cannot resolve
> `ad_position`, which is registry-required on every one of those events
> (`:143-144`) — so even on JW Player the coverage is conditional.

Note this is a *separate* axis from request #2: `ads_video_*` describes an ad
break **inside** a content video; `Placement='ad'` means the player unit **is**
an ad. Zone 4 needs the former and has none.

---

## 7. Measurements — TAKEN 2026-09-21

Both numbers this section originally owed are now measured
(`P0-PRODUCTION-MEASUREMENT.md`). Neither blocks the design; both confirm it.

1. **`video_heartbeat` share** — **33 %** of all media rows (8.22 M of 24.7 M
   over 13 days). The largest single event by a wide margin. This alone
   justifies pre-aggregating rather than querying raw, and it is why the MV
   must gate on an explicit `EventName IN (…)` list at insert time.
2. **Distinct `video_id` per project per day** — **617 – 1,232**, on
   0.9 M – 3.0 M rows/day. So `(PublicInstanceID, Day, Placement, VideoID)` is
   on the order of **~1 k rows/day/project** before filter dimensions.
   **Comfortable** — the pessimistic branch (millions of rows/day, forcing a
   separate narrower rollup for zone 5's per-video table) does not apply.
   Zone 5 can read this same rollup.

### 7.1 One anomaly found while measuring — chase before trusting two cards

`video_play_intent` (199,088) is **5× lower** than `video_started`
(1,031,808), although both fire once per handle and the aps detector calls
`intent()` immediately before `resumed()` on the same envelope.
**Diagnosed** — see `P0-PRODUCTION-MEASUREMENT.md` §2.1: chakavak is exact
(1.000), the two native-`<video>` providers leak on **autoplay**, because an
element already playing at attach never fires `play` again while `playing`
re-fires on every buffer recovery.

The PRD's **EBVS** card and its **error-rate** formula
(`video_error ÷ video_play_intent`) both divide by this number, so both would
read roughly 5× high. Not diagnosed here. Do not ship either card until it is.

### 7.2 Still not applied

**No DDL has been applied, and none should be from a session without a
measured plan and the owner's approval.** The owner has stated that any
production deployment requires their sign-off first, with a near-zero-downtime
plan. This repo has already had a non-atomic multi-table rename proposed and a
finalize JOIN OOM production ClickHouse (`.claude/memory/mistakes.md`).

## 8. Build order for P3

1. ~~Land the P2 `putEnum` change for `placement` first~~ — **DONE**, merged
   as !744. `placement` is now validated against `content|ad`, so it is safe
   to key on.
2. Write `TVideoDaily` + its MV against the archive's `RecordsV2`, so
   heartbeats are aggregated once at insert instead of scanned per query. Gate
   the MV with an explicit **`EventName IN (…)`** list — the exact 20 names in
   §6 — never `EventName LIKE 'media_%'`. `EventName` is
   `LowCardinality(String)`, the set is known and closed, and an explicit list
   makes the coverage contract readable in the DDL and stops a mistyped or
   newly-invented event name from silently entering the rollup.
3. Backfill for `CHyjot2edlsQ` — note only **13 days** exist (capture began
   2026-09-09, when the minifier fix reached production), so "one month" is
   not available yet. Reconcile counts against raw `Records`, and only then
   write the `Filterable` sibling — whose dimension list should come from P4's
   actual filter panel.
4. **The ad classifier is a prerequisite for a meaningful dashboard, not a
   follow-up.** At 93 % ad share, a rollup built before classification lands
   would show almost nothing but ads. See
   `P0-PRODUCTION-MEASUREMENT.md` §3 for the real host list and why host
   matching alone is insufficient.
