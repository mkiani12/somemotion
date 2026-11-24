# P7 — video identity and ad separation in the SDK (spec)

Status: **draft for owner review**, 2026-09-30. Supersedes P6 §4 (SDK identity
upgrade) and carries P6 §5's `has_video_schema` and P6 §7's
`error_source_type`. P6 build order step 2.

## 1. Goal

Every play in the video report is attributed to a real, stable video, and
in-page ad units are recognised as ads, so every card reflects editorial video
only. Measured on the production archive, 2026-09-26..30, content plays only:

| `video_id` shape | Plays | Distinct ids | What it is |
|---|---|---|---|
| `blob:` URL | 1.73 M | 2.13 M | MSE players (hls.js, Shaka, …): a new blob per page view, so a new "video" every view |
| synthesized `<provider>-media-<n>` | 1.31 M | 1 247 | no source at attach; `html5-media-1` alone is 188 k plays on 17.7 k rokna pages |
| http(s) URL | 0.53 M | 161 k | real sources; the only identity that works today |
| element / container id | 30 k | 9.9 k | `video1` is on nine projects |
| URL with a cache-buster | 14 k | 562 k | `#?version=<ms>`: 583 real videos |

Only **15 %** of content plays carry an id that names a video. On fararu.com
81 % and on rokna.net 77 % of "content" plays have none. The rokna ones are
muted, autoplayed, 7–17 s long, untitled and report 1080p: in-page video ad
units that pass as `placement=content`, because the ad patterns only ever see
the empty candidates of the attach moment.

**Success:** four weeks after the rollout,
- identified share of content plays ≥ 95 % on fararu, rokna and bartarinha (§9);
- no `blob:` and no `<provider>-media-<n>` in new `video_id`s;
- the short, muted, untitled autoplay units on those sites are `placement=ad`;
- distinct ids ÷ plays per host stays below 0.5 (an id explosion shows as ≈ 1).

## 2. Owner rulings this follows

- An element (or container / player DOM) id is **never** a video id
  (2026-09-30). It stays evidence for ad classification only:
  `tavoos_video_native-…_player` has no host to match on.
- Banner ads are excluded from the dashboard; the ad-blocking option is the
  last phase (2026-09-26).
- Mock→real changes only the data; front-cp components are not changed.
- Every production deploy needs owner approval; collector before
  script-provider when the registry changes; zero downtime.
- The realtime cluster holds only Records and ClientErrors; the dashboard reads
  archive rollups only.

## 3. Why it happens (verified in code)

Every detector resolves `video_id` **once, at attach**, through
`buildMediaProps(provider, candidates)`, and pins it for the handle's life.
The first non-empty candidate wins, and when all are empty the id falls back
to a per-runtime counter. Ad scripts and lazy players insert the `<video>`
first and set its source later, so at attach the only non-empty candidate is
often the element id, or nothing. The ad test (`isAdMedia`) runs at the same
moment, so it never sees the host either. MSE players then make
`currentSrc` a `blob:` URL, which passes as an id.

Candidates today:

| Detector | Candidates in order |
|---|---|
| html5 | `data-shahin-media-id`, `el.id`, `currentSrc`, `src` |
| plyr | `data-shahin-media-id` (el, container), `container.id`, `el.id`, `currentSrc`, `src` |
| videojs | `data-shahin-media-id`, `player.id()` (DOM id), `player.currentSrc()` |
| vidstack | `data-shahin-media-id`, `el.id`, src candidate |
| shaka | `data-shahin-media-id`, `el.id`, `currentSrc`, `src` |
| jwplayer | `data-shahin-media-id`, `item.mediaid`, container id, `item.file` |
| youtube | `data-shahin-media-id`, id parsed from the embed URL, `src` |
| vimeo, playerjs, chakavak | platform id or embed URL |

## 4. The resolver

One function in `01-media-props.js`, `resolveMediaIdentity(provider,
evidence)`, used by every detector. A detector passes **typed evidence**
instead of a flat candidate list, so the resolver knows what each value is:

```js
{
  explicit: el.getAttribute('data-shahin-media-id'),  // site-declared id
  platform: item.mediaid,                             // player's own video id (YouTube, Vimeo, JW mediaid)
  sources:  [player.currentSrc(), el.currentSrc, el.src, firstSourceChild],
  domIds:   [el.id, container.id],                    // ad evidence only
  poster:   el.poster,                                // ad evidence only
  page:     { path, slot }                            // fallback
}
```

It returns `{ id, source }`, where `source` is one of `explicit`,
`platform`, `source`, `page`.

**Order:**
1. `explicit`: the site's `data-shahin-media-id`. It is a declaration, not a
   DOM id.
2. `platform`: an id the player API assigns to the video (YouTube id, Vimeo
   id, JW `mediaid`).
3. `source`: the first usable source URL, normalised (§4.1). Player-API sources
   come before DOM ones because they are the manifest or file URL, not the
   `blob:` behind it: `player.currentSrc()` (videojs), `item.file` (JW),
   `player.getAssetUri()` (Shaka), `player.source` (plyr), then `el.currentSrc`,
   `el.src`, and the first `<source src>` child.
4. `page`: `<page path>#v<slot>` (§4.2). This is the last resort. It never
   collides across pages or sites.

Nothing else is ever an id: not an element id, not a poster, not a counter.
**Poster is dropped as an id** (a change from P6 §4): a site-wide placeholder
poster would merge every video on the site into one. It stays ad evidence.

### 4.1 Source URL normalisation

- Must be `http:` or `https:` after resolving against the page. `blob:`,
  `data:`, `mediastream:`, `about:` and `javascript:` are never ids.
- The id is `scheme://host/path`: lowercase scheme and host, path as is.
  Query string and fragment are dropped. That removes signed tokens and
  expiry parameters (privacy and stability) and cache-busters (measured:
  562 k variants → 583 videos).
- Capped at 500 characters, as today.
- **Known limit:** a site whose video URL carries the identity only in the
  query (`/play?id=42`) would merge its videos. None was found in the data;
  the §9 id-ratio check catches it by host. A per-host override
  (`keepQueryHosts` in pack settings) is the remedy if one appears. It is not
  built until then.
- **Known limit:** hosts that sign the path itself (a token segment per view)
  still explode. Detected by the same §9 ratio, handled per host when found.

### 4.2 Page slot

- Path = the canonical link's path when the page declares one on its own
  origin, else `location.pathname`. Query and fragment are dropped.
- Slot = the element's position among the page's `<video>` elements in
  document order, counted when the id is first resolved, starting at 1.
- The slot is stable within a page view. It can shift between views when an ad
  `<video>` is inserted above the content video. Such an ad classifies as
  `ad`, but it still occupies a position, so that content video's rows split
  across two slots. Accepted, and measured by §9.
- SPA navigation: the path is read at resolve time, so a video on a new route
  gets the new path.

## 5. When identity is resolved

- **Lazily**, at the first event the handle emits (impression or play intent),
  not at attach.
- **Upgraded at most once**: if the id is still `page` at the play intent, at
  `loadedmetadata` or at the first `playing`, and a `source` or better
  candidate exists by then, the id switches to it. Events before the switch
  keep the old id.
- `playback_session_id` does not change on the upgrade. The rollups join a
  playback's events on it, so one playback is still one playback.
- The rollups key per-video rows on `video_id`, so an impression emitted
  before the upgrade lands on the page-slot row. For a lazily loaded video
  that shifts some impressions off the video's row. Accepted; it only affects
  impression-to-play per video, not the totals.

## 6. Ad classification

- It runs at every identity decision: first emit, the upgrade, and a source
  swap (§7). It tests every piece of evidence: the chosen id, all sources,
  DOM ids and the poster, with the existing case-insensitive substring
  patterns from pack settings.
- Classification is sticky for the playback: once `ad`, always `ad`. A
  playback classified late emits `placement=ad` from then on, and its earlier
  events (usually just the impression) stay `content`.
- The server-side list stays authoritative at read time. `VideoKey` in the
  rollups is the reclassification hook.
- **Pattern rollout:** `yn-video` goes into pack settings with the SDK
  release (config only). About 48 hours after release, the source hosts of
  short, muted, untitled autoplay plays are listed per site. The owner
  approves which ones become patterns. No heuristic classification in the SDK
  (option C was rejected).

## 7. A source swap on the same element is a new video

- Playlists, autoplay-next, and a pre-roll followed by content in one
  `<video>` currently merge into one video.
- On `loadstart` where the newly **normalised** source differs from the
  playback's source: the current playback ends (a `video_interrupted` if it
  was playing), a new `playback_session_id` starts, identity and ad
  classification re-run, and a new impression fires if the element is in
  view.
- `blob:` → `blob:` changes are **not** swaps. MSE players mint a new blob on
  error recovery and on reloads of the same video, so the source is
  unknowable from the element. Player-API detectors see the real manifest
  URL and swap correctly; bare `<video>` with hls.js does not.
- Adaptive rendition switches keep the same source and never trigger a swap.

## 8. Not a video, new context properties

- **`MediaStream` elements** (`srcObject` set: camera previews, KYC, video
  calls) are not tracked. A handle whose element gains a `srcObject` stops
  emitting.
- **`video_id_source`** (enum `explicit` | `platform` | `source` | `page`) on
  every `video_*` event. It makes the read side exact: it can tell a site id
  from a platform id or a page slot without guessing from the shape of the
  string.
- **`error_source_type`** on `video_error`: `progressive` (mp4/webm/mov/ogg by
  extension or MIME), `hls` (`.m3u8`, `application/vnd.apple.mpegurl`),
  `dash` (`.mpd`), `blob` (MSE; the kind behind it is unknown), `other`.
  Taken from the element's source at error time. Not PII. It explains the
  parsnews-style "HLS given to a plain `<video>`" failures.
- **`has_video_schema`** (boolean) on `video_impression`: the page has
  `VideoObject` JSON-LD. The SDK reads every `script[type="application/ld+json"]`
  once per page view (and again after an SPA route change) and handles
  arrays, `@graph`, and `@type` as a string or an array. Scripts over 256 KB
  are skipped, and a parse error means `false`, never an exception.
  It feeds search visibility (P6 §5).

## 9. Registry, collector, archive, read side

**Registry** (all three seeds plus `tools/seed-parity/check.py`): the three
optional props above; `schemaVersion` bump on every `video_*` event for
`video_id_source`. The collector deploys first, as usual.

**Archive DDL**: one change window, **no backfill**, because history has no
such props and rows keep their defaults:
- `TVideoDaily`: `VideoIdSource SimpleAggregateFunction(max, LowCardinality(String))`
  and `HasVideoSchema SimpleAggregateFunction(max, UInt8)`;
- `TVideoPlaybacksDaily`: `ErrorSourceType SimpleAggregateFunction(max, LowCardinality(String))`;
- the matching view changes via `MODIFY QUERY`, applied right after a forward
  (the runner pattern from step 1, with every scalar query `FORMAT TSV`).

**Read side**, identified =
- `VideoIdSource IN ('explicit', 'platform', 'source', 'page')`, or
- for rows without it (history): today's rule, an http(s) URL or a YouTube or
  Vimeo platform id.

**Decision for the owner: is a page slot a video?** Recommended: **yes**,
counted as one video and shown as its own row, titled by `video_title`, else
the page title. A slot is one player on one page, which in practice is the
article's video. Without it, MSE players on bare `<video>` (9sobh: 1.7 M plays)
stay unidentified forever. The alternative is counting slots in the
"unidentified" row. The §9 share of `page` ids is reported either way.

**Rows from before the release** keep their old ids. They stay in the
"unidentified" row (or as URL rows where they were URLs). There is no mapping
from an old synthesized id to its video, so history is not rewritten.

**Verification after release** (a saved query, run at +48 h and +7 d):
identified share per site; `video_id_source` mix; `blob:` and synthesized
counts in new rows (must be 0); distinct ids ÷ plays per host (flags path
tokens and query identities); the ad share before and after, per site.

## 10. Edge cases

| # | Case | Handling |
|---|---|---|
| 1 | `src` set after attach (ads, lazy players) | lazy resolve at first emit, one upgrade at intent / `loadedmetadata` / `playing` (§5) |
| 2 | `<source>` children, `el.src` empty | the first `<source src>` is a source candidate |
| 3 | MSE `blob:` | never an id; player-API manifest URL first; else page slot (§4) |
| 4 | signed query / cache-buster | query and fragment dropped (§4.1) |
| 5 | identity only in the query | known limit, per-host override if it ever appears (§4.1) |
| 6 | per-view path tokens | detected by the §9 id ratio, handled per host |
| 7 | element / container / player DOM id | never an id, ad evidence only (§2) |
| 8 | site-wide placeholder poster | never an id (§4) |
| 9 | same video on many pages | the source URL unifies it; page slots do not (accepted) |
| 10 | pre-roll then content in one element | source swap = new playback (§7) |
| 11 | playlist / autoplay-next | source swap = new playback (§7) |
| 12 | MSE error recovery (`blob:` → `blob:`) | not a swap (§7) |
| 13 | adaptive rendition change | same source, not a swap |
| 14 | ad classified only at the upgrade | sticky `ad` from then on; earlier impression stays `content` (§6) |
| 15 | camera / call `MediaStream` | not tracked (§8) |
| 16 | SPA route change | path read at resolve time; schema re-read per route (§4.2, §8) |
| 17 | video inside a same-origin iframe | that frame's own path and slot |
| 18 | cross-origin iframe players | unchanged: their detectors send platform ids / embed URLs |
| 19 | internationalised host | lowercased; path left as is |
| 20 | very long URL | capped at 500 characters |
| 21 | malformed or huge JSON-LD | parse error → `false`; > 256 KB skipped (§8) |
| 22 | `data-shahin-media-id` present | always wins; it is a site declaration, not a DOM id |
| 23 | old rows in reports | never rewritten; unidentified row or URL rows (§9) |
| 24 | the tag manager injects the script twice | the existing double-execution guard; the resolver has no global counter any more |

## 11. Testing

TDD in the `packs` vm-sandbox harness (`node --test`), one case per edge case
§10 #1–#22 where the sandbox can express it, plus:
- `playback_session_id` continuity across the upgrade;
- the resolver's order per detector (typed evidence → `{ id, source }`);
- `isAdMedia` sees DOM ids and the poster but never picks them as the id;
- `error_source_type` per extension / MIME / `blob:`;
- `has_video_schema` on arrays, `@graph`, `@type` arrays, malformed and
  oversized scripts.

The minifier regression guard (`return void(` = 0, `onEnvelope(` = 3) and the
embedded-pack byte check stay part of the release. Collector: registry tests
for the new props and versions; `make seed-parity`. Archive: the dev
`TVideo*` block regenerated from ddl-v2, plus fixtures with every
`video_id_source` value.

## 12. Rollout (each production step needs owner approval)

1. Registry + collector (the zero-downtime roll script from 2026-09-30).
2. Archive DDL window (§9), right after a forward.
3. script-provider with the new pack (blue/green), `yn-video` in pack settings.
4. +48 h: new-host review (§6) and the §9 verification query. Approved hosts
   become patterns (config only).
5. +3 days of new ids: the per-video table (the Videos box), reading §9's
   identified rule.

## 13. Out of scope

Per-video detail panel; page engagement share (last phase); IMA ad breaks
(P6 §6); a heuristic ad classifier.
