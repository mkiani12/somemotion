# Video Player Detectors — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add video detectors for Plyr, Video.js, Vidstack, Shaka Player, and JW Player to the analytics video pack — one file per player, one shared schema, all value normalization/validation centralized in the pack runtime.

**Architecture:** Each player gets `packs/src/NN-detector-video-<player>.js` registering `{pack:'video', name, probe, attach}` with `window.shahinPacks`. The generic html5 detector moves to the END of concat order (claim priority: specific players first, generic fallback last) and gains container-exclusion selectors. A new runtime normalizer `buildVideoProps` becomes the single place video_id/title/duration/position/provider are validated; existing html5 + youtube detectors are refactored onto it.

**Tech Stack:** ES5-safe JS (npm island, uglify concat — no bundler), node:test + vm harness (`packages/analytics/test-support/tracker-harness.js`, `extraSources`), Docker node-dev, GitLab CI.

**Spec:** `Tech-Specs/Platform/2026-07-12-packages-sdk-restructure-design.md` § "Committed follow-up". Repo: `/data/projects/asam/shahin/shahin-script-provider`, branch `feature/video-player-detectors` off fresh `main`.

## Global Constraints

- Registry seed video events (collector `event_schemas_seed.json`, pack `video`) are the ONLY events detectors may emit: `video_started`, `video_played`, `video_paused`, `video_progress`, `video_completed`, `video_error`. `video_id` (string) REQUIRED on all; `progress_percent` REQUIRED on `video_progress`, STRING enum `"25"|"50"|"75"|"95"` (only the shared `quartileTracker` sets it); optional `provider`, `video_title`, `video_duration`, `position`. NO schema changes, NO new event names.
- All events flow through `emit` → tracker `track()` — detectors never touch the network.
- Every commit GPG-signed; NO Claude/AI attribution trailers; hanging commit = pinentry prompt, WAIT (rules CI1/CI5/S8).
- All npm/node in Docker (`docker compose --profile tools run --rm node-dev …` / make targets).
- ES5-safe source in the existing pack style: `const` + named function expressions, JSDoc types, `// @ts-check`. No arrows, classes, template literals, optional chaining, spread, or async/await.
- Detector isolation invariants (runtime enforces, detectors must not break): probe/attach may throw without harming others; attach returns a detach function; one attach per target element ever (WeakSet on `handle.target`).
- Concat-order claim rule: `cat src/*.js` order = registration order = claim priority. Final order: `00-runtime`, `10-…youtube`, `20-…plyr`, `30-…videojs`, `40-…vidstack`, `50-…shaka`, `60-…jwplayer`, `90-…html5`.
- Size: report `dist/packs/video.js` minified size in the MR; soft budget ≤ 20 KB min (was 13.4 KB src / 5.3 KB min before this feature). The pack is inline-behind-flag — only pack-enabled tokens carry it.
- Player API facts should be verified against official docs (WebFetch allowed) before implementing; where a fact can't be verified, listen for BOTH plausible event names (quartile helper + `started` flag make duplicate signals harmless).

---

### Task 1: Runtime normalizer + reorder + exclusions (refactor, no new players)

**Files:**
- Modify: `packages/analytics/packs/src/00-runtime.js` (add `buildVideoProps` to the `window.shahinPacks` API)
- Rename: `git mv packages/analytics/packs/src/20-detector-video-youtube.js packages/analytics/packs/src/10-detector-video-youtube.js`; `git mv packages/analytics/packs/src/10-detector-video-html5.js packages/analytics/packs/src/90-detector-video-html5.js`
- Modify: `90-detector-video-html5.js` (exclusion selectors + use `buildVideoProps`), `10-detector-video-youtube.js` (embed exclusions + use `buildVideoProps`)
- Test: `packages/analytics/packs/test/video-pack.test.js` (extend; update `PACK_SRC_FILES` order)

**Interfaces (Produces) — every later task consumes this exactly:**

```js
// window.shahinPacks.buildVideoProps(provider, idCandidates, extras) → props
//   provider:     String — fixed provider tag ('plyr' | 'videojs' | …)
//   idCandidates: any[]  — first non-empty-after-trim wins as video_id;
//                          all exhausted → '<provider>-video-<seq>' (one
//                          shared runtime counter across all detectors)
//   extras:       { title?: any, duration?: any, position?: any }
// Normalization rules (THE single validation point, per CTO directive):
//   video_id    String(candidate).trim().slice(0, 500)
//   provider    the provider argument verbatim
//   video_title String(extras.title).trim().slice(0, 300) — only if non-empty
//   video_duration / position — only if typeof number, isFinite, >= 0
// progress_percent stays owned by quartileTracker (untouched).
```

- [ ] **Step 1.1: Write failing tests first** in `video-pack.test.js`: (a) `buildVideoProps` normalization table — candidate precedence, trim, 500/300 caps, non-finite/negative duration dropped, anonymous fallback `myplayer-video-1` counter increments across providers; (b) claim priority: a `<video>` inside `<div class="plyr">` must NOT be attached by the html5 detector (harness: run runtime + html5 only, assert zero events when playing that element); (c) existing html5/youtube suites still pass with the renumbered `PACK_SRC_FILES`.
- [ ] **Step 1.2: Run tests, verify the new ones FAIL** (`make analytics-unit` or targeted `node --test packs/test/video-pack.test.js` in Docker).
- [ ] **Step 1.3: Implement**: add `buildVideoProps` (+ shared `anonymousSeq`) to 00-runtime.js and expose on `window.shahinPacks`; do the two `git mv` renames; html5 probe gains one exclusion check per found element — skip when `el.closest && el.closest('.plyr,.video-js,media-player,.jwplayer,.shaka-video-container,[data-shaka-player]')` is truthy (wrap in try/catch; no closest → no exclusion); youtube probe skips iframes with `.closest('.plyr,media-player')` truthy (Plyr/Vidstack youtube embeds are the wrapping player's responsibility); refactor html5's `makeProps` and youtube's props construction to call `packs.buildVideoProps(...)` (html5 candidates: `data-shahin-media-id` attr, `el.id`, `el.currentSrc`, `el.src`; drop its private `mediaIdFor`/seq).
- [ ] **Step 1.4: Run full pack suite — green** (all pre-existing + new).
- [ ] **Step 1.5: Commit** — `feat(analytics): video pack — shared props normalizer, claim-priority reorder, container exclusions`

---

### Tasks 2–6: one detector per player (identical shape; each task = tests-first, implement, green, commit)

Each detector file registers `{pack:'video', name:'<player>', probe, attach}`, uses `packs.buildVideoProps` + `packs.quartileTracker` only (no private normalization), honors `settings.selectors` extra-hint like the youtube detector does, ES5-safe, ~120–220 lines. Each task extends `packs/test/` with a dedicated `video-<player>.test.js` (vm harness + hand-rolled player stub; assert: started/played/paused/progress-quartiles/completed/error mapping, provider tag, video_id precedence incl. `data-shahin-media-id` override, detach removes listeners, html5 does NOT double-fire on the same underlying element).

**Task 2 — `20-detector-video-plyr.js` (provider `'plyr'`)**
Probe: elements matching `.plyr video, .plyr audio? (video only)` OR any element `el` where `el.plyr` is an object (Plyr v3 sets `media.plyr = instance`); target = the media element. Attach: prefer the Plyr instance API when `target.plyr` exists — `instance.on('play'|'pause'|'ended'|'timeupdate'|'error')`, position/duration from `instance.currentTime`/`instance.duration` (covers youtube/vimeo providers where native media events don't exist); else fall back to native media events (same mapping as html5). First play → `video_started`, later plays → `video_played`; pause suppressed when ended. id candidates: `data-shahin-media-id` (media el, then `.plyr` container), container id, media el id, `currentSrc`/`src`. Detach: `instance.off(...)` for each bound handler (verify Plyr's off signature via docs; if `off` unavailable, keep handler refs and no-op detach with a comment).

**Task 3 — `30-detector-video-videojs.js` (provider `'videojs'`)**
Probe: if `typeof window.videojs === 'function'`, enumerate players — `window.videojs.getAllPlayers ? videojs.getAllPlayers() : values of videojs.getPlayers()` (verify per docs; support both, older v7 lacks getAllPlayers). target = `player.el()` (container div; the inner `.vjs-tech` video is excluded from html5 by Task 1's `.video-js` selector). Attach: `player.on('play'|'pause'|'ended'|'error')`, `player.on('timeupdate', …)` reading `player.currentTime()`/`player.duration()` (method calls, not properties). Disposal: also `player.on('dispose', detachSelf)`. id candidates: `data-shahin-media-id` on `player.el()`, `player.id()`, `player.currentSrc && player.currentSrc()`. title: `player.el()` title attr only (getMedia is version-gated — skip).

**Task 4 — `40-detector-video-vidstack.js` (provider `'vidstack'`)**
Probe: `root.querySelectorAll('media-player')`; target = the `media-player` element itself (its inner video may sit behind `media-provider`; Task 1's `media-player` exclusion keeps html5 away). Attach: listen on the element — `'play'`, `'pause'`, `'ended'`, `'error'`, and BOTH `'time-update'` (Vidstack custom, `event.detail.currentTime`) and `'timeupdate'` (re-dispatched native) — feed whichever fires into the quartile helper with `el.currentTime`/`el.duration` (falling back to `event.detail`); duplicates are harmless (quartile fires once; started flag gates started/played). id candidates: `data-shahin-media-id`, el `id`, `el.currentSrc || el.src`, `el.title` for title (Vidstack exposes `title` prop). Verify event names against vidstack docs; keep both spellings regardless.

**Task 5 — `50-detector-video-shaka.js` (provider `'shaka'`)**
Probe: `root.querySelectorAll('[data-shaka-player], .shaka-video-container video')` — video elements only (dedupe). Non-UI Shaka on a bare unmarked `<video>` is intentionally left to the html5 fallback (provider `'html5'`) — document this in the file header. Attach: native media events (Shaka drives the media element, so play/pause/timeupdate/ended fire natively — same mapping as html5) + richer error: if `target['ui']` exists try `target.ui.getControls().getPlayer().addEventListener('error', …)` in try/catch (Shaka UI attaches `.ui`); otherwise native `'error'` only. id candidates: `data-shahin-media-id`, el id, `el.currentSrc`, `el.src`.

**Task 6 — `60-detector-video-jwplayer.js` (provider `'jwplayer'`)**
Probe: if `typeof window.jwplayer === 'function'`, `root.querySelectorAll('.jwplayer[id], [id^="jwplayer"], div[id][data-jwplayer]')` → for each container with an id, `window.jwplayer(id)` and keep it when the returned object has `.on` (a real instance); target = container element. Attach: `instance.on('play'|'pause'|'complete'|'error'|'setupError')` mapping play→started/played (first-play flag), complete→`video_completed`; `instance.on('time', e)` → quartile helper with `e.position`/`e.duration`. id candidates: `data-shahin-media-id` on container, `item && item.mediaid` from `instance.getPlaylistItem && instance.getPlaylistItem()` (try/catch), container id, `item && item.file`; title candidate `item && item.title`. Detach via `instance.off && instance.off(...)` per handler.

Per-task steps (repeat for each of Tasks 2–6):
- [ ] **Step N.1:** Write `packs/test/video-<player>.test.js` with a player stub (global/API shape per the task text) — FAILING first. Stub must simulate enough for all 6 events + quartiles (drive position past 25/50/75/95).
- [ ] **Step N.2:** Verify fail → implement `NN-detector-video-<player>.js` → suite green (new file auto-included by the sorted concat; add it to the test's `PACK_SRC_FILES` and to `video-pack.test.js`'s full-bundle list).
- [ ] **Step N.3:** Commit — `feat(analytics): video pack — <player> detector`

---

### Task 7: Full verification, size report, docs, MR

- [ ] **Step 7.1:** `make analytics-test` (lint/tsc/all suites), `make analytics-build` → record `dist/packs/video.js` src+min sizes; `make prepare-embed && make go-test`; `glab ci lint`.
- [ ] **Step 7.2:** Docs: pack README/file-header inventory if any lists detectors; append `.claude/memory/decisions.md` entry `video-player-detectors` (one paragraph: 5 players, claim-priority ordering, buildVideoProps as the single normalization point, shaka non-UI degradation to html5 fallback); product-document plan checkbox updates ride the docs branch.
- [ ] **Step 7.3:** Push `feature/video-player-detectors`, draft MR to main (no AI attribution anywhere; description: event mapping table per player, size delta, exclusion/claim-priority explanation, shaka limitation, test counts). Never merge without Xerxes.
