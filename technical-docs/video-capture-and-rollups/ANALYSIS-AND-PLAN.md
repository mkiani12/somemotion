# Video auto-capture + Video dashboard — analysis, design, plan
**Date:** 2026-09-20 · **Author:** x.mousavi (session) · **Status:** DRAFT — Q1 resolved from vendor source; 3 open questions block Phase 2/3 scope

Three requests were raised: (1) change the Chakavak detection strategy away from
iframe-URL matching, (2) flag banner/ad videos separately from content video,
(3) move the video dashboard from mock data to real data for
`PublicInstanceID = CHyjot2edlsQ`, with GSC as an acknowledged estimate.

This document records what is **verified in the code** versus what is
**assumed**, because two of the three requests turn out to be partly built
already, and one is gated on a possible live bug.

---

## 0. Verification status legend

| Tag | Meaning |
|---|---|
| **[V]** | Verified by reading the file cited |
| **[I]** | Inferred from verified facts |
| **[?]** | Unknown — needs a measurement or a vendor/owner answer |

---

## 1. Request #1 — Chakavak detection without the iframe URL

### 1.1 The request's premise is already half-satisfied [V]

`packages/analytics/packs/src/05-detector-media-aps.js` already implements
**two independent discovery paths**, documented in its own header (lines 98–135)
and implemented at lines 355–392:

1. **Operator hint** — `settings.apsOrigins`, an exact-match origin allow-list.
   This is the URL-based path the request wants to move away from.
2. **Spontaneous-`ready` discovery** — one shared `window` `message` listener
   watches for a valid `aps.player` `ready` envelope from **any iframe in the
   document, regardless of `apsOrigins`**. On a match it resolves the iframe by
   `contentWindow === event.source` (`findIframeBySource`), claims it through
   the shared `packs.claimIframe` WeakSet, and calls `packs.rescan()` so the
   normal `probe()`/`attach()` path produces a real handle.

The per-message trust check is `evt.origin === originOf(iframe.src)` — i.e.
**self-consistency between the envelope and that iframe's own src**, *not*
membership of an allow-list. `apsOrigins` gates only the proactive probe.

**So: "Chakavak serves from different URLs" is already handled by design.**
The correct framing of request #1 is therefore *not* "build event-based
detection" — it is **"why is the existing event-based path not sufficient in
the field?"** That reframing changes the work item substantially.

### 1.2 Answering the literal question: does the iframe API send a load event? [V]

Yes. The `aps.player` bridge emits a `ready` envelope, and the detector already
consumes it as its identity/metadata handshake. Envelope shape required by
`isValidEnvelope` (lines 310–318):

```js
data.context === 'aps.player'   // APS_CONTEXT
data.version === 1              // APS_VERSION — strict equality
typeof data.event === 'string' && data.event !== ''
```

`ready` additionally carries metadata whose `id` is the second-precedence
`media_id` candidate (after a `data-shahin-media-id` attribute, before the raw
`src`).

### 1.3 Three concrete defects in the existing path [V]

| # | Defect | File / line | Consequence |
|---|---|---|---|
| D1 | **Strict version pin** — `data.version === 1` | `05-...aps.js:280,315` | A vendor bump to `2` silently kills **both** paths. No log, no event, no quarantine row. Fails closed and invisibly. |
| D2 | **Listener-install race** — `ensureMessageListener()` is called *inside* `probe()`, i.e. on first probe only | `05-...aps.js:401,426–435` | If the bridge fires `ready` **before** the video pack activates, and `ready` is one-shot, the envelope is lost permanently. The iframe is then only discoverable via `apsOrigins` — exactly the URL path we are trying to retire. |
| D3 | **Listen-only, no parent→child hello** — stated in the header: *"this v1 detector — listen-only, per the task brief"* | `05-...aps.js:88` | Detection depends on *catching an unprompted event at the right moment*. There is no way to ask "is anyone there?" after the fact. |

D2 is the highest-severity of the three: it is the one that makes detection
**non-deterministic**, and non-determinism is what the request is really
complaining about.

### 1.4 RESOLVED from vendor source [V] — the bridge answers a ping

Settled by reading Chakavak's own bridge, `chakavak-file-storage`
(`app/api/public/js/aps-player-bridge.js`, cloned 2026-09-20). Three verified
facts, all decisive:

**F1 — `ready` IS one-shot.** `register()` is documented *"Called once by each
player as soon as its instance exists"* (:307–312) and posts `ready` exactly
once (:319). There is no timer and no re-send. **So defect D2 is real**: an
iframe that registers before Shahin's video pack activates is permanently
invisible to the spontaneous path.

**F2 — the bridge has an inbound command dispatcher that ALWAYS replies**
(:344–389). It accepts `{context:'aps.player', method, value, callId}` and
responds on `callId`. Critically, it replies **even when the player has not
registered yet**:

```js
if (!adapter)                       { respond(undefined, 'NOT_READY');      return; }
if (!ALLOWED_METHODS.includes(method) || typeof adapter[method] !== 'function')
                                    { respond(undefined, 'UNKNOWN_METHOD'); return; }
```

Either error response is **positive proof that this iframe is an APS player** —
no playback, no user interaction, and no successful `ready` required.

**F3 — the inbound listener accepts ANY origin, by explicit design** (:31–33):
> *"The inbound listener accepts messages from ANY origin (outbound origin stays
> `'*'`), so dispatch is gated on this list — a raw `adapter[method]` lookup
> would be prototype-pollution exposed."*

Outbound is `window.parent.postMessage(message, '*')` (:156).

### 1.5 Revised design — active probe, no vendor change needed

The earlier option table proposed **B (parent handshake)** as "medium cost,
needs a vendor verb". **F2 retires that caveat: the responder already exists
and already ships.** Option B is now the cheapest *correct* fix, not the
expensive one.

**Recommended design:**

1. **Active liveness probe.** For each unclaimed `<iframe>`, post
   `{context:'aps.player', version:1, method:'getDuration', callId:<uuid>}`.
   `getDuration` is read-only and side-effect free — it cannot start playback,
   change volume, or enter fullscreen. Any reply on that `callId` (**including
   `NOT_READY` / `UNKNOWN_METHOD`**) claims the iframe as `provider:'aps'`.
   This is deterministic: it does not depend on catching an unprompted event at
   the right moment, and it works for iframes that registered long before the
   pack loaded.
2. **Keep the passive `ready` listener** as the fast path — it still carries the
   metadata (`fileUnique`, `title`, `duration`, `isLive`) that the probe reply
   does not.
3. **Fix D1** — accept a version range rather than `=== 1`, so a vendor bump
   degrades instead of going silent.
4. **Move `ensureMessageListener()` earlier** (D2) so a `ready` that lands
   between pack-eval and first probe is not dropped.

**Two implementation details that will otherwise cost a debugging day:**

- ⚠️ **Shahin's `isValidEnvelope` will REJECT the probe reply.** It requires
  `typeof data.event === 'string' && data.event !== ''`
  (`05-...aps.js:310-318`), but an `APSPlayerResponse` has **no `event` field**
  — it carries `{context, version, method, callId, value, error}`. A **separate
  response validator** is required; reusing `isValidEnvelope` silently drops
  every reply and the probe appears to do nothing.
- ⚠️ **`postMessage` goes to `window.parent`, i.e. the DIRECT parent only.** A
  Chakavak iframe nested inside another iframe never reaches a top-level
  Shahin. Worth confirming against real customer markup before assuming
  top-level embedding.

⚠️ **Async claim vs. the first-claim-wins contract.** Checked
`17-detector-video-playerjs.js` for a competing speculative probe: it has none —
it claims **synchronously** from `src`, gated on `VENDOR_SRC_PATTERN` or its own
`playerjsOrigins` allow-list. So there is no probe-vs-probe race today [V]. But
note the asymmetry the active probe introduces: every existing detector claims
**synchronously during the probe pass**, while the aps probe claims **on an
async reply**. File sort order (`05-` before `17-`) therefore no longer confers
claim priority for this detector — a sync-claiming detector whose pattern also
matched would win regardless. Chakavak's src does not match playerjs's vendor
pattern, so the practical risk is low; record it so the next detector added with
a broad pattern does not silently steal APS iframes.

**Secondary passive fallback:** `time_update` is in `ADVERTISED_EVENTS` (:60–77)
and repeats during playback, so a *playing* video re-announces itself
continually. That covers the one-shot-`ready` miss for any video the user
actually plays — but not for one that is merely present, which is why the
active probe is still the primary mechanism.

**Security posture:** the probe broadcasts a constant, non-sensitive envelope;
it leaks no host-page data, cannot modify host-page cookies (rule #6), and is
async so it cannot block the host page (rule #7). It should still be
rate-limited (probe each iframe once, not on every rescan) and skipped for
iframes already claimed by another detector.

## 2. Request #2 — flag ad videos separately from content video

### 2.1 The property already exists [V]

`Tech-Specs/Events/2026-07-19-media-family-v2-design.md` line 89 already
specifies:

| Prop | Type | Req | Notes |
|---|---|---|---|
| `placement` | String | no (R8) | `content`\|`ad`; detectors send `content`; ad events send `ad`. |

and `buildMediaProps` already emits it (`01-media-props.js:216`). **No new
event, no new prop, no schema migration is needed for the value itself.**

### 2.2 Do not conflate two different axes [V] — state this in the MR

The event catalog already contains `media_ad_started`, `media_ad_completed`,
`media_ad_skipped`, `media_ad_clicked`
(`apps/analytics-collector/event_schemas_seed.json`). Those describe
**in-stream ad breaks inside a content video** (pre/mid/post-roll —
`AD_POSITION_VALUES` at `01-media-props.js:55`).

The request is about something different: **the player unit itself is an
advertisement** (a video banner from `*.mediaad.org`, `*.tavoos.net`,
`*.tapcd.ir`). These are two orthogonal axes and must never be merged:

- `placement = 'ad'` → *this whole media object is an ad creative*
- `media_ad_*` events → *an ad interrupted this content media object*

### 2.3 Two real gaps [V]

- **G1 — no host-suffix matching exists anywhere.** The only origin matching in
  the pack is `apsOrigins.indexOf(origin) !== -1` — exact string equality on
  `scheme://host[:port]`. The request's examples are wildcards (`*.mediaad.org`),
  so suffix matching is **new logic** wherever it lands. A search of
  `apps/analytics-collector/internal` and `packages/analytics` found no reusable
  host/domain matcher.
- **G2 — `placement` is not enum-validated.** It is written with
  `putTrimmedString(props, 'placement', ex.placement, 20)`
  (`01-media-props.js:216`) while the spec says `content|ad`. If `placement`
  becomes **load-bearing for dashboard exclusion**, it must move to `putEnum`
  with `['content','ad']`, or a typo silently becomes a third category that
  neither includes nor excludes correctly.

### 2.4 The layer decision — and its tiebreaker

Three candidate layers:

| Layer | Where | Pro | Con |
|---|---|---|---|
| **SDK** | detector sets `placement:'ad'` from the iframe src | Zero server cost; the value travels with the event | List updates need a bundle roll (cache TTL); **cannot fix rows already collected** |
| **Collector enrichment** | classify at ingest | One authoritative list, no bundle roll | Still cannot fix rows already collected |
| **Read-time** | exclusion list applied in the dashboard query | **Retroactive** — a list update instantly corrects all history | Per-query cost; needs the host to be recoverable from the stored row |

**The tiebreaker is retroactivity.** Request #3 says ads must be excluded from
the report. Ad-network domains are discovered *over time* — the list on day 1 is
never the list on day 90. If classification is SDK-only, **every list update
leaves all historical rows permanently misclassified**, and the dashboard's
past numbers silently disagree with its present ones.

**Recommendation:** dual-layer.
1. **SDK sets `placement`** where it can (it has the iframe `src` at attach) —
   cheap, and makes the common case correct at source.
2. **An authoritative server-side list drives read-time exclusion** — so the
   dashboard stays correct retroactively when a new ad network is discovered.

**DECIDED 2026-09-20 (§6): dual authority, with a single global
Shahin-maintained list.** See §6.1 for the two obligations this creates and the
one unverified assumption it rests on.

---

## 3. Request #3 — real data instead of mock

### 3.1 What exists [V]

- **Mock dashboard:** `product/wireframes/video-dashboard/v36.html`
  (207 KB standalone, the "نسخه فعال" per the PRD).
- **PRD:** `product/product-document/Events-Service/PRD-Business-Video.md`
  — Final/V4, five zones, full metric definitions and bilingual tooltips.
- **Implementation:** **none.** `apps/front-cp/app/pages/` has no `events/` or
  video route. This is greenfield in the app.
- **Repo pattern to follow:** the `analytics-report-page` skill is the documented
  end-to-end pattern (GraphQL → Preflight → Pipeline → QueryBuilder → DTO, then
  Nuxt page/store/components/sidebar/flag).

### 3.2 Data-layer constraints — these shape the whole build [V]

**C1 — the collector cluster is a 7-day write buffer, not a read source.**
`apps/analytics-collector/clickhouse/schema.sql:~490` caps
`RecordsV2` at `TTL Created + toIntervalDay(LEAST(RetentionDays, 7))`, with the
comment: *"This collector instance is a WRITE BUFFER … all analysis reads the
archive instead."* The dashboard must read **analytics-archive**.

**C2 — the archive's `RecordsV2` is read-tuned but not media-tuned.**
`apps/analytics-archive/schema/historical/tables/RecordsV2.sql`:
```
ENGINE = MergeTree
ORDER BY (PublicInstanceID, Created)
PARTITION BY toYYYYMMDD(Created)
```
Good: per-project + date-range pruning is exactly the dashboard's access shape.
Bad: **`EventName` is not in the sort key** and **`Props` is a native JSON
column**. A 30-day video dashboard would scan *every event row* for the project
and JSON-extract per row. **No media rollup tables exist** — every `T*` table in
the archive is pageview/keyword/session-shaped.

**C3 — GSC keywords: the forbidden join has a cheap legal substitute.**
`TKeywordsDailyFilterableV3.sql:13-17` warns:
> *"This table keys on PURL, NOT on the canonical-or-plain token the page tables
> use … PageID here is NOT comparable to PageID on the page tables …
> **NEVER join the two on PageID.**"*

Reading the two MVs shows *exactly* why, and hands us the fix [V]:

| Side | `PageID` expression | Source |
|---|---|---|
| **GSC keywords** | `cityHash64(if(path(PURL) = '', '/', path(PURL)))` | `MvKeywordsDailyFilterableV3.sql:59` |
| **Page tables** | `cityHash64(… path(if(PCanonicalURL != '', PCanonicalURL, PURL)))` | `MvPageVisitsDailyFilterableV3.sql:16` |

The keywords side hashes the **raw** path; the page side hashes the
**canonical-or-plain** path. For any URL carrying a canonical they differ — hence
the prohibition.

**The substitute:** `RecordsV2` carries its own `PURL String` (archive
`RecordsV2.sql:66`), so we can compute the **keywords-flavoured** key directly
from the event row and join on a `UInt64`:

```sql
-- keywords-compatible PageID, computed from the EVENT row's own PURL.
-- Mirrors MvKeywordsDailyFilterableV3.sql:59 verbatim. Do NOT substitute the
-- page tables' canonical-aware expression here — that is the forbidden join.
cityHash64(if(path(PURL) = '', '/', path(PURL)))
```

This is **materially cheaper than the "build a URL normalizer" framing in the
first draft of this document** — no normalizer is needed, only a verbatim copy
of one existing expression. Per rule #17 it must be written once, with a comment
pointing at the MV it mirrors, never re-derived per query.

> ⚠️ Note `RecordsV2` has **no `PageID` column at all**, and
> `TKeywordsDailyFilterableV3` has **no `PURLChecksum`** — so neither a stored
> `PageID` join nor a `PURLChecksum` join is available. The computed expression
> above is the only sanctioned key.

**C4 — RESOLVED, and it was never going to be found by reading the pack.**
The impression-only failure was **CLOSED 2026-09-02**
(`dogfood/reports/2026-08-31-chakavak-root-cause.md`). Root cause:
`tdewolff/minify` — the Go **merger's** minifier, one step after the packs'
own build — rewrites

```
return void(a === b && c())   ->   return 0[0]
```

`0[0]` is `undefined`, so the side-effecting call is **discarded**. `uglify-js`
emits exactly that shape for the ordinary source
`if (origin matches) { handleEntry.onEnvelope(data); } return;`, so it reached
the served bundle through the normal build, and destroyed **all three**
cross-origin iframe detectors at once. `media_impression` survived only because
detectors emit it via `emit()` directly, never through the session.

Every test stayed green because the packs' suites run the *uglify* output and
the corruption happens inside the Go merger — the harness could not see it.
Adding an instrumentation marker changed the shape enough that uglify stopped
emitting `return void(…)`, which is why it read as a Heisenbug and cost two
sessions.

Fixed, with two regression tests in `internal/minify` — one pinning the emitted
constructs, one minifying the **actual embedded pack** and failing if the
`onEnvelope` call count drops. Proof on the real pipeline: 4/4 trials
impression-only before, 3/3 with `media_play_intent` + `media_started` after.

**Consequence for this plan: P3–P5 are NOT blocked.** The capture pipeline
works. (Note `dogfood/` exists only on recent `main`; a checkout on an older
branch will not have these reports at all — which is why the first draft of
this document treated C4 as an open risk.)

### 3.3 The GSC estimate — the fan-out trap

The user already frames GSC as an estimate, and the PRD agrees ("تا آن زمان
اعداد تخمینی‌اند"). The specific trap to design around: **one page can host
several videos**, so page→video attribution is **many-to-many**. Naively
attributing a page's impressions/clicks to each video on it **double-counts**.

**Recommendation:** present the metric honestly as *"search queries for pages
that contain this video"* — never *"impressions for this video"* — and exclude
`placement='ad'` media from the page set before building it. Label the band as
an estimate in the UI, as the PRD already envisages.

---

## 4. Sequencing — revised after measurement

The first draft gated everything on a production read and on C4. **Both
assumptions were wrong**, and measuring beat planning:

- **C4 is closed** (§3.2) — the pipeline captures correctly. P3–P5 are open.
- **Request #1 is built and shipped to review** — MR **!728**, below.

| Phase | Work | Status |
|---|---|---|
| **P1 — Chakavak detection** | Active bridge probe; URL-independent | ✅ **MR !728 (draft)** |
| **P2 — ad classification** | `putEnum` for `placement`; host-suffix matcher; global list + read-time exclusion | **Gated on access**, not effort — the blob/MSE check needs a host that can reach all three ad networks (§6.1) |
| **P3 — read model** | Media rollups in the archive; `clickhouse-best-practices` first | **Open with no unresolved prerequisite — the right next phase** |
| **P4 — dashboard** | `analytics-report-page` pattern; port v36 zone by zone | Open, unblocked |
| **P5 — GSC band** | Keywords-flavoured `PageID` (§3.2 C3); ads excluded; labelled estimate | Open, unblocked |

### 4.1 What shipped in P1 — MR !728

**The premise turned out to be half-built and half-broken, in that order.**
Reading the code showed spontaneous discovery already existed and was already
URL-independent, and `main` had since improved it to claim on **any** valid
envelope rather than only `ready`. Four browser variants confirmed that path
works today. So the obvious fix — moving `ensureMessageListener()` out of
`probe()` — would have been **redundant**, and was dropped before a line was
written.

The real gap was narrower and worse: an embed whose one-shot `ready` was
missed **and that is never played** sends nothing at all, so it is invisible
forever — no `media_impression`, no presence, no inventory row. Measured
baseline on pristine `main`: `TRACKS: []`.

The fix is an **active liveness probe**, justified by the vendor source: the
bridge answers any command carrying a `callId`, from any origin, even before
the player registers (`NOT_READY`). The detector now asks instead of waiting.
Verified against the **merger-minified bundle** — the exact bytes served, not
the uglify output — where the same embed now yields `media_impression`, 2/2
runs, with the played-embed lifecycle unchanged.

Two traps worth keeping: the reply has **no `event` field**, so it needs a
validator of its own; and probing once is not enough, because at first scan the
iframe may not have executed its script yet (this cost a debugging cycle — the
probe fired into a document with no listener). It now probes immediately **and**
on `load`.

**Not changed:** `15-detector-video-vimeo.js` and `17-detector-video-playerjs.js`
share the one-shot-handshake exposure, but neither vendor is documented to
answer a parent-initiated command, so the fix is not known to transfer. Each
needs its own spec check.

## 5. P0 measurement — one item blocked, one not

### 5.1 NOT blocked — run this first

C4 (impression-only) is the highest-risk unknown in the plan and is settleable
**locally in ~2 minutes** via the playerjs repro (§3.2 C4). Do this before any
production request; it can invalidate P1's premise on its own.

### 5.2 Blocked — production reads

`ssh <archive-host>` + `docker exec … clickhouse-client` was **denied by the
auto-mode classifier** (reason: *Production Reads*). Either grant the
permission, or run the statements below and paste the output.

**Query BOTH clusters.** The archive alone cannot distinguish three outcomes
that need three different plans:

| Archive result | Could mean | Distinguished by |
|---|---|---|
| empty | capture is broken | collector cluster also empty |
| empty | RV2 transfer not live for this project (note the archive carries a `materialized-views-rv2-staging/` dir — *staging*) | collector cluster has rows, archive does not |
| empty | the project genuinely has no video traffic | both empty **and** no `media_impression` either |

**On the collector cluster** (7-day write buffer — answers *"is capture working
right now?"*):

```sql
SELECT EventName, count() AS rows, max(Created) AS last_seen
FROM analytics.RecordsV2
WHERE PublicInstanceID = 'CHyjot2edlsQ'
  AND Created >= now() - INTERVAL 7 DAY
  AND EventName LIKE 'media_%'
GROUP BY EventName
ORDER BY rows DESC;
```

**On the archive box** (`ssh <archive-host>`, `docker exec -i
shahin-analytics-historical-clickhouse clickhouse-client --database=analytics
--multiquery` — answers *"is there history to build on?"*). **Pipe SQL via
stdin**; quoting mangles through `ssh … -q "…"` and silently produces wrong
identifiers:

```sql
SELECT EventName,
       count()                    AS rows,
       uniqExact(toDate(Created)) AS days,
       min(toDate(Created))       AS first_day,
       max(toDate(Created))       AS last_day
FROM analytics.RecordsV2
WHERE PublicInstanceID = 'CHyjot2edlsQ'
  AND Created >= now() - INTERVAL 30 DAY
  AND EventName LIKE 'media_%'
GROUP BY EventName
ORDER BY rows DESC;

-- Props is a native JSON column: its fields read as Dynamic, so CAST them
-- explicitly or GROUP BY returns odd output.
SELECT Props.provider::String  AS provider,
       Props.placement::String AS placement,
       count()                 AS rows
FROM analytics.RecordsV2
WHERE PublicInstanceID = 'CHyjot2edlsQ'
  AND Created >= now() - INTERVAL 30 DAY
  AND EventName LIKE 'media_%'
GROUP BY provider, placement
ORDER BY rows DESC
LIMIT 50;

-- Sizes the ad-host list from real data instead of a guessed list, and
-- settles whether a host is recoverable at all (the §6.1 risk to Q2).
SELECT Props.media_id::String AS media_id, PURL, count() AS rows
FROM analytics.RecordsV2
WHERE PublicInstanceID = 'CHyjot2edlsQ'
  AND Created >= now() - INTERVAL 30 DAY
  AND EventName LIKE 'media_%'
GROUP BY media_id, PURL
ORDER BY rows DESC
LIMIT 100;
```

## 6. Owner decisions — RESOLVED 2026-09-20

All four questions are settled. Q1 from vendor source (§1.4); Q2–Q4 by the owner.

| # | Question | Decision |
|---|---|---|
| Q1 | Chakavak bridge behaviour | **Answers a ping.** `ready` is one-shot; the inbound dispatcher replies from any origin, even pre-registration. Active probe, no vendor change. (§1.4, verified) |
| Q2 | Ad-classification authority | **Dual — SDK + server list.** SDK sets `placement` at capture; an authoritative server-side list drives read-time exclusion so history reclassifies retroactively. |
| Q3 | Ad list scope | **Global, Shahin-maintained.** One fleet-wide list. No per-project overrides in v1. |
| Q4 | Dashboard treatment | **Separate ads view.** The content video dashboard excludes `placement='ad'` entirely; ad video gets its own surface. |

### 6.1 Consequences of Q2 (dual authority)

The two layers must not silently disagree. Required discipline:

- **One list, two consumers.** The SDK's matcher and the read-time filter are
  fed from the **same** source — per rule #17 (DRY), the list has exactly one
  authoritative home, and the SDK copy is a generated/served artifact of it,
  never a second hand-maintained list.
- **Read-time wins on conflict.** When a stored `placement` disagrees with the
  current list, the list is authoritative — that is the entire point of
  retroactivity. The stored value is an optimisation, not the truth.
- ⚠️ **The ad unit may have no host on EITHER side.** If these networks render
  a `<video>` with a `blob:`/MSE source rather than an iframe, there is no ad
  host anywhere in the DOM: `90-detector-video-html5` claims the element and
  **neither** layer has anything to match on. This is a capture-side risk to Q2,
  not just a read-side one, and it must be settled **before** the matcher is
  built.
- ⚠️ **That check is partly gated on network access, not effort.** Measured from
  this workstation, 2026-09-20:

  | host | DNS | HTTPS |
  |---|---|---|
  | `mediaad.org` | `0.0.0.0` (sinkholed) | 301 |
  | `tapcd.ir` | 157.119.191.211 | **timeout** |
  | `video.tavoos.net` | 212.33.197.125 | 200 |

  So `tapcd.ir` is unreachable from here and `mediaad.org` resolves to a
  sinkhole. (`video.tavoos.net` **is** reachable now, which contradicts
  `dogfood/reports/2026-08-31-chakavak-root-cause.md` — it recorded every
  connection timing out from this workstation while the Iranian box could
  reach it. Reachability has changed since; do not trust either record without
  re-measuring.) A definitive DOM inspection across all three networks needs
  the Iranian box, or a page/DOM dump from the owner.
- **The read-time filter needs a host to match on.** This is **unverified** and
  is a live risk: it depends on `media_id` / src / page URL carrying a
  recoverable ad host in the stored row. **The blocked P0 query settles it.**
  If the host is *not* recoverable, read-time exclusion cannot work on history
  and Q2's retroactivity guarantee fails — at which point the decision needs
  revisiting, not quietly downgrading to SDK-only.

### 6.2 Consequence of Q3 (global list)

A global list cannot catch a site that serves its own ad player from its own
domain. Accepted for v1. If that case appears in real data, revisit as
"global + per-project overrides" rather than expanding the global list with
customer-specific domains.

### 6.3 Open scoping question from Q4 — which surface?

Q4 chose "separate ads view". Checking the two existing candidates, **neither
is actually a home for video-ad creatives** [V]:

| Wireframe | Title | What it is |
|---|---|---|
| `wireframes/ads-dashboard/v5.html` | درآمد تبلیغات / **Ads Revenue** | Monetization/revenue-shaped, not creative-performance |
| `wireframes/events-advertising/v3.html` | داشبورد تبلیغات / **Advertising — Events** | The Advertising *event pack* surface |

Neither describes "video ad units captured by the media pack". Three options,
**not yet decided**:

- **(a)** **A separate route backed by shared components** — its own page and
  sidebar entry (so it is genuinely a separate view, per Q4, not a toggle on the
  content dashboard), rendering the same panel components against
  `placement='ad'`. Cheapest that still satisfies the decision; reuses every
  panel and the whole P3 read model. **Recommended default.**
- **(b)** A section inside `events-advertising` — fits the naming, but that
  surface is built around the Advertising event pack, not media events.
- **(c)** A new dedicated wireframe + PRD — most work, and premature before P0
  shows how much ad-video volume actually exists.

This is **Phase 4/5 scope and blocks nothing now**. Recommendation: assume (a)
unless PM says otherwise; revisit once P0 quantifies the ad-video volume.

## 7. Repo-hygiene notes for whoever executes this

- `commit.gpgsign` verified `true` [V].
- This checkout is shared with another session and **switches branches
  mid-task** — take a `git worktree` before any branch work.
- Branch from `main`, signed commits, MR via `.claude/skills/mr-workflow.md`;
  agents never merge.
- Any new heavy directory must be added to the root `.graphifyignore` in the
  same MR; run `make drift-check` **after** committing.
