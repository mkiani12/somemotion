# Event Catalog

**Product:** Shahin
**Service:** Events
**Document type:** Data catalog
**Decision reference:** [Decision-Log.md](../Process-Docs/Decision-Log.md)
**Folder guide:** [README.md](./README.md)

> This document was split out of the former unified document on 1405/05/09 and synced with all 14 Decision-Log decisions on 1405/05/20. Two obsolete vocabularies have been purged from this catalog: marking an event as a conversion, and the Tier model as an event level.

---

## 7. Event Pack Catalog

### 7.1. Design principle

A pack becomes predefined only when it makes a clear contribution to the overview of its business type. If the events of a category do not need a report of their own, they are better left as Custom Events.

---

### 7.2. Pack list

> This section is only a **catalog listing**, not a product commitment. The scope breakdown is in section 7.4, and its reference is [`00-Business-Model.md`](./00-Business-Model.md).
> The previous table, which listed all 23 packs with a "Document status" and a "Dedicated dashboard", was removed: the "one dashboard per pack" model was dropped by Decision 2, and the unit of delivery is now the business type.

Twenty-three packs have a full event catalog in section 7.3. They are candidates for the schema track and the "readiness catalog", not a definition of product scope. Product scope is two business types (E-commerce and Media) plus one horizontal Video pack. To see which packs are in scope and which are candidates, go to section 7.4.

**Owner/Reference model:** every shared concept has one owning pack, and the others reference it. For example, the authentication events have a defined owner and every other pack is a consumer (details in 5.2.1).

### 7.3. Pack descriptions (full catalog)

> In this catalog every concept has one **owner (Owned)**, and the others **reference (Reference)** it; referenced events are defined in the core (§5.2.1) or in the owning pack. The "Custom" badge = a customer-specific event. Identifiers are snake_case and follow the naming rules in §5.3, plus the carve-out for GA4 names.

#### Pack 1 — Video

The Video pack is the canonical owner of Shahin's media playback (MEDIA playback) family: every video, audio and VOD playback event is derived from these definitions and is told apart by two discriminating parameters, `media_type` (video|audio|vod) and `placement` (content|ad). The pack covers engagement signals (start, progress, completion), playback quality (QoE: buffering, errors, quality) and in-stream ads. That is why the quality of this pack directly determines the correctness of several other dashboards (Content, Ads Revenue, User Journey).

**Shared base param of the family (§11):** `playback_session_id` (String, optional) is now a base param on every event in this family rather than a separate event. It is the three-layer nesting contract (playback session ⊃ content pod ⊃ ad) that the VOD pack consumes; automatic detectors leave it empty, and only the site/VOD sets it.

##### Owned events

**1. Event `video_started`**
- **Definition:** The start of a playback session (manual play, autoplay, or resume from continue-watching).
- **Trigger:** The moment the first frame of content actually starts playing, not merely a play click or the player loading.
- **Parameters:** `video_id` (String) media identifier; `placement` (String) placement (`content` for content); `playback_source` (String, optional) where playback was started from (`manual`/`autoplay`/`suggested`/`continue_watching`); `startup_time_ms` (Number, optional) time from intent to first frame, the source of the TTFF card (this is what the old reference to `startup_time_measured` resolves to; see §11 / the VOD pack).
- **Product logic and funnel role:** A start is an intermediate funnel step, not the final success. Conversion rate is computed in the Report Builder funnel (Funnel Builder) with whatever final step the user chooses, not by marking the event itself. Implementation: requires site code (player SDK).

---

<br>


**2. Event `video_progress`**
- **Definition:** Playback crossing the 25%/50%/75% milestones.
- **Trigger:** When each milestone is crossed (derived from the heartbeat or from the player's milestone event); each milestone fires only once.
- **Parameters:** `video_id` (String); `milestone_percent` (Number) milestone percentage (25/50/75).
- **Product logic and funnel role:** non-conversion (an intermediate funnel step). Implementation: requires site code (player SDK).

---

<br>


**3. Event `video_completed`**
- **Definition:** Full viewing of the content (90% or more).
- **Trigger:** When the watched share crosses the 90% threshold or playback reaches the end.
- **Parameters:** `video_id` (String).
- **Product logic and funnel role:** The natural final step of the playback funnel and the only final success of playback; in the Report Builder funnel it is chosen as the goal step. Because it is a transactional/view-type event, the smart default calculation basis is **session-based** (§5.4). Implementation: requires site code (player SDK).

---

<br>


**4. Event `video_heartbeat`**
- **Definition:** A periodic ping (~every 10 seconds) during active content playback.
- **Trigger:** Every ~10 seconds, only while playback is active (not while paused or buffering).
- **Parameters:** `video_id` (String); `position_sec` (Number) current position in seconds.
- **Product logic and funnel role:** non-conversion. The source of truth for Watch Time and the retention curve. Implementation: requires site code (player SDK).

---

<br>


**5. Event `video_paused`**
- **Definition:** Playback stopped by the user or the system.
- **Trigger:** The moment playback is paused.
- **Parameters:** `video_id` (String); `position_sec` (Number); `pause_method` (String) type of pause (`interaction`/`automatic`).
- **Product logic and funnel role:** non-conversion. Implementation: requires site code (player SDK).

---

<br>


**6. Event `video_resumed`**
- **Definition:** Playback continuing after a pause in the same session.
- **Trigger:** The moment playback resumes after a pause.
- **Parameters:** `video_id` (String); `position_sec` (Number).
- **Product logic and funnel role:** non-conversion. Implementation: requires site code (player SDK).

---

<br>


**7. Event `video_seeked`**
- **Definition:** Moving the playhead (scrub) along the timeline.
- **Trigger:** At the end of the seek operation (not while the handle is being dragged).
- **Parameters:** `video_id` (String); `from_position_sec` (Number) origin; `to_position_sec` (Number) destination.
- **Product logic and funnel role:** non-conversion. The basis for building the Seek Heatmap. Implementation: requires site code (player SDK).

---

<br>


**8. Event `video_buffered`**
- **Definition:** One rebuffer interval (a short stall caused by the network/CDN). Separate from `video_stalled`, whose cause is the player/browser; merging the two destroys the ability to route a problem to its root cause.
- **Trigger:** At the end of each rebuffer interval (a waiting→resume pair); one record per interval. Buffering before the first frame plays does not count as a rebuffer.
- **Parameters:** `video_id` (String); `position_sec` (Number); `buffer_duration_ms` (Number, optional) length of the rebuffer interval in milliseconds, the source of the CIRR card.
- **Product logic and funnel role:** non-conversion (a playback quality/QoE signal, on the network/CDN path). The buffer rate is computed with COUNT DISTINCT `session_id`. Implementation: requires site code (player SDK).

---

<br>


**9. Event `video_error`**
- **Definition:** A playback error that disrupts the session (decode/network/DRM/invalid source).
- **Trigger:** When a playback error occurs; distinct from `shahin_client_error` and `error_shown`.
- **Parameters:** `video_id` (String); `error_code` (String).
- **Product logic and funnel role:** non-conversion (a QoE/stability signal). Implementation: requires site code (player SDK).

---

<br>


**10. Event `video_quality_changed`**
- **Definition:** A change in playback quality (by the user manually or by adaptive bitrate).
- **Trigger:** The moment the quality changes.
- **Parameters:** `video_id` (String); `from_quality` (String, optional) original quality; `to_quality` (String) new quality; `change_trigger` (String) what caused it (`user`/`adaptive`; omitted when the player cannot detect the cause, e.g. YouTube).
- **Product logic and funnel role:** non-conversion. Implementation: requires site code (player SDK).

---

<br>


**11. Event `video_rate_changed`**
- **Definition:** A change in playback speed (0.5× to 2×).
- **Trigger:** The moment the playback speed changes.
- **Parameters:** `video_id` (String); `playback_rate` (Number) the new speed.
- **Product logic and funnel role:** non-conversion. An engagement signal for educational/lecture content. Implementation: requires site code (player SDK).
---

<br>


**12. Event `video_fullscreen_toggled`**
- **Definition:** Entering or leaving fullscreen mode.
- **Trigger:** The moment fullscreen is entered or exited.
- **Parameters:** `video_id` (String); `fullscreen_state` (String) state (`enter`/`exit`).
- **Product logic and funnel role:** non-conversion. An attention signal. Implementation: requires site code (player SDK).

---

<br>


**13. Event `video_next_autoplayed`**
- **Definition:** Automatic playback of the next media item.
- **Trigger:** When the next media item starts automatically (not by the user's choice).
- **Parameters:** `video_id` (String) the next media item.
- **Product logic and funnel role:** non-conversion. A binge/up-next signal. Implementation: requires site code (player SDK).

---

<br>


**14. Event `video_interrupted`**
- **Definition:** Playback cut off for an external reason (navigation, closing the tab, network drop).
- **Trigger:** When playback is cut off unintentionally; separate from a deliberate pause by the user.
- **Parameters:** `video_id` (String); `position_sec` (Number).
- **Product logic and funnel role:** non-conversion. Implementation: requires site code (player SDK).

---

<br>


**15. Event `ads_video_started`**
- **Definition:** The start of an in-stream ad (pre/mid/post-roll).
- **Trigger:** The moment the ad starts, under the same `session_id` and with `placement=ad`.
- **Parameters:** `video_id` (String); `ad_position` (String) ad position (`pre_roll`/`mid_roll`/`post_roll`).
- **Product logic and funnel role:** non-conversion. Implementation: requires site code (player SDK).

---

<br>


**16. Event `ads_video_completed`**
- **Definition:** Full viewing of an in-stream ad.
- **Trigger:** When the ad is watched to the end (an AVOD-billable completed view); `placement=ad`.
- **Parameters:** `video_id` (String); `ad_position` (String).
- **Product logic and funnel role:** The natural final step of the funnel (a billable full impression); in the Report Builder funnel it is chosen as the goal step. A transactional/view-type event → the smart default is session-based. Implementation: requires site code (player SDK).

---

<br>


**17. Event `ads_video_skipped`**
- **Definition:** Skipping a skippable in-stream ad.
- **Trigger:** When the skip button is pressed; `placement=ad`.
- **Parameters:** `video_id` (String); `ad_position` (String).
- **Product logic and funnel role:** non-conversion. The skip rate is a quality/relevance signal. Implementation: requires site code (player SDK).

---

<br>


**18. Event `ads_video_clicked`**
- **Definition:** A click on the in-stream ad creative (clickthrough).
- **Trigger:** When the ad is clicked; `placement=ad`. Aligned with, but separate from, `ad_click` in the Advertising pack.
- **Parameters:** `video_id` (String); `ad_position` (String).
- **Product logic and funnel role:** The natural final step of the funnel (clickthrough); in the Report Builder funnel it is chosen as the goal step. A transactional/view-type event → the smart default is session-based. Implementation: requires site code (player SDK).

---

<br>


**19. Event `video_stalled`**
- **Definition:** Playback freezing while the player is still in the "playing" state: `currentTime` stays frozen without any buffer recovery. Separate from `video_buffered` (§11: buffer = the network/CDN path, stall = the player/browser path).
- **Trigger:** Watchdog: when playback is nominally active but `currentTime` stays unchanged for at least the threshold (default 5000 milliseconds, configurable) without an accompanying buffer interval; once per freeze occurrence.
- **Parameters:** `video_id` (String).
- **Product logic and funnel role:** non-conversion (a playback quality/QoE signal, on the player/browser path). Implementation: requires site code (player SDK).

---

<br>


**20. Event `video_play_intent`**
- **Definition:** An attempt to start playback (a user click or the start of autoplay), before the first frame renders.
- **Trigger:** The moment play is clicked or an autoplay attempt begins; once per session unless there is a new load.
- **Parameters:** `video_id` (String); `placement` (String).
- **Product logic and funnel role:** non-conversion. The basis of EBVS (Exits Before Video Start) = the count of `video_play_intent` without a subsequent `video_started`. Implementation: requires site code (player SDK).

---

<br>


**21. Event `video_volume_changed`**
- **Definition:** A change in the volume level, or mute/unmute of playback.
- **Trigger:** At the end of the settled behavior (1-second debounce); only the final value is sent; suppressed if it equals the last value sent.
- **Parameters:** `video_id` (String); `volume` (Number, an integer from 0 to 100); `muted` (Boolean).
- **Product logic and funnel role:** non-conversion. Mute/unmute is folded into this same event; the dashboard's mute count is read from it. Implementation: requires site code (player SDK).

---

<br>


**22. Event `video_subtitle_changed`**
- **Definition:** A change in subtitle state (on/off or a change of language).
- **Trigger:** At the end of the settled behavior (1-second debounce); only the final value is sent.
- **Parameters:** `video_id` (String); `subtitle_enabled` (Boolean); `subtitle_language` (String, optional).
- **Product logic and funnel role:** non-conversion. A localization signal. Implementation: requires site code (player SDK).

---

<br>


**23. Event `video_impression`** — PARTIAL
- **Definition:** The player or the video thumbnail/cover becoming visible in the viewport.
- **Trigger:** AUTO for claimed player elements via IntersectionObserver (≥50% visible, once per session/page load); the thumbnail/cover form requires a site annotation (`data-shahin-video-cover="<video_id>"`) or `track()`.
- **Parameters:** `video_id` (String).
- **Product logic and funnel role:** non-conversion. The basis of EBVS and of the click-through rate on the cover. Implementation: AUTO for a claimed player; the fallback for the thumbnail form requires a site annotation/`track()`.

---

<br>


**24. Event `video_download`** — PARTIAL
- **Definition:** The viewer downloading the media.
- **Trigger:** AUTO for the Plyr download button and for an `<a download>` near a claimed player; otherwise the site's `track()`.
- **Parameters:** `video_id` (String); `download_quality` (String, optional) quality of the downloaded copy, separate from the `quality` state param, which is the current playback quality.
- **Product logic and funnel role:** non-conversion. Resolves the "Download rate · next phase" state in wireframe v34 (R4: download is live from this phase). Implementation: AUTO for supported players; fallback is the site's `track()`.

---

<br>


**25. Event `video_cta_clicked`** — MANUAL
- **Definition:** A click on a call-to-action overlay inside the player (owned by the site).
- **Trigger:** A user click on the site's CTA overlay.
- **Parameters:** `video_id` (String).
- **Product logic and funnel role:** An intermediate step; conversion rate is computed in the Report Builder funnel with whatever final step the user chooses, not by marking the event. Implementation: the site's `track()` only (fully MANUAL, because the overlay belongs to the site and has no standard structure).

---

<br>


**26. Event `video_intro_skipped`** — RESERVED
- **Definition:** A reserved name for skipping an intro/recap.
- **Trigger:** RESERVED; implemented in a later phase. In this phase only the name is registered.
- **Parameters:** TBD (later phase).
- **Product logic and funnel role:** TBD. RESERVED, only registering the name to prevent future collisions.

---

<br>


> Note: although `video_started` and `video_progress` are important funnel points, they are not the final success; the start and the milestones are intermediate funnel steps. If an analyst wants to target one of these thresholds (e.g. 75%), they make it the final step of the funnel in Report Builder; there is no separate event-marking mechanism. The only final success of playback is `video_completed` (90%+).

##### Referenced events (from the core or another pack — not defined here)
- Event `share` ← core: sharing a video with an optional timestamp for deep-linking (a carve-out of the GA4-reserved name). Video only carries `entity_type=video` as a value and does not redefine the schema; it is consumed in the dashboard's "share intent" panel.
- Event `recommendation_clicked` ← Search & Discovery pack: a click on a suggested/related video (the basis of video recirculation), under the Search owner with `item_type=title/video`, `rec_rank` and `rec_algorithm` as domain fields; canonically the funnel's goal step (CTR@k); consumed in the dashboard's recirculation/autoplay panel.
- Event `captions_toggled (media family)` ← core: enabling/changing subtitles (`subtitle_language`/`is_auto` optional); a light member of the media family, non-conv; in the dashboard's localization panel.
- Event `video_audio_track_changed (media family)` ← core: a change of audio track (dubbing/language, `track_language` optional); a member of the media family, non-conv; in the dashboard's localization panel.
- Event `search_submitted` ← core (owner: Search & Discovery): used in the video-driven conversion path `search_submitted → video_started → subscription_started`; Video only references it.
- Event `subscription_started` ← Subscription / Paywall pack: the end point of the video-driven conversion path (`video_started → subscription_started`) in cross_service / User Journey; Video references it.
- Event `item_viewed` ← Search & Discovery pack: the video/title page as an item view (item_type=title); used in the content cross_service and the discovery funnel.

##### Custom Event candidates
- Event `video_clip_created`: cutting a clip/tear is a capability specific to some platforms; the schema and the logical unit differ per site, so it cannot be predefined (suggested schema: video_id (required) · media_type · clip_start_sec · clip_end_sec · clip_share_channel)
- Event `video_chapter_jumped`: whether chapters exist, and the chapter model (intro/recap/sponsor), depends on each site's product and markup (suggested schema: video_id (required) · media_type · chapter_id · chapter_title · jump_method (click|skip_intro))
- Event `video_cast_started`: Chromecast/AirPlay exists on only some sites, and detecting the receiving device type needs a custom implementation (suggested schema: video_id (required) · media_type · cast_device_type (chromecast|airplay|dlna))
- Event `video_picture_in_picture_toggled`: PiP is custom player behavior and is not meaningful in every player (suggested schema: video_id (required) · media_type · pip_state (enter|exit) · position_sec)
- Event `video_poll_answered`: an interactive poll/quiz on a video (educational/live) is a bespoke widget and its schema differs per site (suggested schema: video_id (required) · media_type · poll_id · answer_value · position_sec)
- ~~Event `video_concurrent_viewers_sampled`~~ — **Obsolete (§11, media family v2):** counting concurrent live viewers is no longer a custom event candidate; the server derives the count from `video_heartbeat` (distinct sessions in each 10-second window), with no need for a separate client-side event.

##### Shown in the Video dashboard
- **KPI card — Total plays (Plays)** — count of `video_started` with placement=content in the range, with bot filtering and pages without JS excluded — Source: video_started — Type: big number + trend sparkline
- **KPI card — Completion Rate** — ratio of `video_completed` to `video_started` (placement=content) — Source: video_completed, video_started — Type: percentage + delta vs. the previous period
- **KPI card — Total Watch Time** — total active watch time from the count and spacing of `video_heartbeat` (each heartbeat ≈ 10 seconds of real watching) — Source: video_heartbeat — Type: big number (hours/minutes) + sparkline
- **KPI card — Average Watch Time per play** — total Watch Time divided by the count of `video_started` (placement=content) — Source: video_heartbeat, video_started — Type: number + distribution
- **Audience Retention (Drop-off) curve** — percentage of viewers still watching at each point in time relative to the video length, from the heartbeats' position_sec — Source: video_heartbeat, video_started, video_completed — Type: descending line chart (retention curve) per video
- **Milestone funnel** — step-by-step drop-off start → 25% → 50% → 75% → complete — Source: video_started, video_progress, video_completed — Type: funnel chart
- **Seek Heatmap** — density of seek destinations on the video timeline, from to_position_sec — Source: video_seeked — Type: linear heatmap on the video's time axis
- **Top Videos table** — videos ranked by Plays, Completion Rate and Watch Time — Source: video_started, video_completed, video_heartbeat — Type: sortable table with a sparkline in each row
- **Playback quality (QoE) panel** — Rebuffer Ratio (duration of `video_buffered` relative to Watch Time), median startup time, and the `video_error` rate relative to Plays — Source: video_buffered, video_error, video_heartbeat, video_started — Type: multi-metric cards + line trend
- **Quality and speed distribution** — share of each quality/bitrate and the distribution of playback_rate — Source: video_quality_changed, video_rate_changed — Type: bar/pie chart
- **In-stream video ad panel** — Ad Completion Rate (ad_completed/ad_started), Skip Rate, Ad CTR (ad_clicked/ad_started) — Source: ads_video_started, ads_video_completed, ads_video_skipped, ads_video_clicked — Type: cards + ad funnel
- **Autoplay vs. manual breakdown** — share of manual/autoplay/recommendation plays and the Completion Rate of each — Source: video_started, video_completed, video_next_autoplayed, recommendation_clicked — Type: grouped bar
- **Watch Time trend** — daily trend of total watch time in the range — Source: video_heartbeat — Type: trend line chart
- **Buffer Rate trend** — daily trend of the buffer rate, with a threshold line and CDN event annotations — Source: video_buffered, video_started — Type: line chart + threshold line
- **Adaptive Quality Drops distribution** — distribution/trend of automatic quality downgrades — Source: video_quality_changed (change_trigger=adaptive) — Type: bar/line chart
- **Buffer Rate by ISP** — buffer rate broken down by operator (Irancell/Hamrah-e Aval/TCI/Shatel) — Source: video_buffered, video_started + ISP from auto-properties — Type: horizontal bar
- **Device breakdown** — distribution of Plays and Completion by Mobile/Desktop/Tablet — Source: video_started, video_completed + device from auto-properties — Type: bar/pie
- **Next-phase QoE metrics (TTFF / EBVS / CIRR)** — Startup Time (TTFF), Exits Before Video Start (EBVS), time-based Rebuffering ratio (CIRR); shown in the next-phase Empty State until the required event/field is collected — Source: requires a new event/field — Type: card in an awaiting-data state
- **Playback conversion rate (from the Report Builder funnel)** — a funnel with `video_completed` (or a chosen threshold such as 75%) as the final step is built in Report Builder; that funnel's rate = the conversion rate; there is no event-marking mechanism and no limit on the number of conversions — Source: video_completed, video_started, video_progress — Type: rate card from the funnel

##### Presence in other Shahin services
- **Content (Content dashboard — Engagement)**: `video_started/completed/heartbeat` (media_type=video), alongside `item_viewed`/`article_read_depth`, build the quality of a page's video engagement; the editor sees which page has a video that was actually watched, not just loaded. `entity_id`/`entity_module` from auto-properties tie the video to the article.
- **Behavior / User Journey**: the sequence `video_started → video_completed → recommendation_clicked → video_started` (the next one) shows the binge and recirculation path; the chain `search_submitted → video_started → subscription_started` reveals the video-driven conversion path.
- **Session Replay**: every media event is recorded as a jump-point on the timeline; the analyst sees the moment of `video_buffered`, `video_error` or an abandon at a particular seek directly in the replay, giving visual context for QoE and drop-off.
- **AI Insights**: crossing `video_heartbeat/completed` with auto-properties (device_type, session_referrer, city, isp_name) produces automatic insights, e.g. "mobile viewers from Telegram have a higher rebuffer rate and lower completion", without any segment being defined in advance.
- **Analytics (general events dashboard, US-2.1/2.2)**: every media-family event (media_type=video) appears in Top Events, the time trend and each event's detail report, with the Device/OS/City distribution from auto-properties; Debug/Live Events verifies the implementation.
- **Ads Revenue Dashboard (+ Advertising pack)**: `ads_video_started/completed/skipped/clicked` (placement=ad) directly feed in-stream video Ad Completion Rate, Skip Rate and vCTR, and are reported alongside the Advertising pack's display/inventory lifecycle (`ad_slot_requested..ad_revenue_recorded`, a separate concept that is not merged).


---


#### Pack 2 — Article & Content

This pack is the heart of text-content consumption tracking in Shahin. It is defined for any news site, blog, magazine or text-driven media outlet, and it answers one central editorial question: "Is the content actually *read*, or only opened?" The pack focuses on "content digestion" (started → depth → completed), real reading time, internal audience recirculation, and the growth of a loyal audience (newsletter and following).

Unlike the previous version of the catalog, this pack now owns a small, precise core of text-driven events and borrows all other behaviors from the canonical families (LIST/ITEM, ENGAGEMENT, MEDIA, SUBSCRIPTION) and from the canonical core, to avoid duplication and double counting. The governing principle: capture once, consume many times.

##### Owned events
- Event `article_read_started` — the reader goes past the headline with a scroll or a dwell above the threshold (e.g. 3 seconds active), meaning they really started reading; distinct from the page being opened (`item_viewed`)<br>Required fields: article_id · Implementation: automatic from auto-properties (the SDK builds the scroll/dwell threshold from `scroll_depth_reached` and the engagement timer, with no site code if the article entity is recognized).
- Event `article_read_depth` — the reader crossing reading-depth milestones (25/50/75/100%), one event per milestone; depth is based on scrolling the *article body*, not the whole page (the enriched, body-scoped version of `scroll_depth_reached`)<br>Required fields: article_id, depth_percent · Implementation: automatic from auto-properties.
- Event `article_read_completed` — the behavioral definition of a full read: crossing 90% of the body, or active_time_sec ≥ the estimated reading time; distinct from `article_read_depth=100` (which only means the scroll reached the end)<br>Required fields: article_id · ✓ funnel goal step (the only qualifying read event in the pack — terminal behavioral read) · Implementation: automatic from auto-properties (a combination of body scroll + the SDK-side active-time timer).
- Event `article_engagement_time` — at the end of the reading session, or on exit/blur of the article page, the *active* reading time (not idle) is recorded as one roll-up; the basis of "average real reading time"<br>Required fields: article_id, active_time_sec · Implementation: automatic from auto-properties (an SDK-side active-time timer with idle detection).
- Event `article_print_clicked` — a click on the article's print button; a signal of reference/save-worthy content (no canonical equivalent, owned by this pack)<br>Required fields: article_id · Implementation: requires site code (the print button must send the event).
- Event `newsletter_subscribed` — a successful newsletter sign-up from within the content site (server-confirmed); the classic conversion for ad-driven publishers<br>Required fields: newsletter_type · ✓ funnel goal step (terminal success) · Implementation: requires site code (the form must report the subscribe success and the newsletter_type).
- Event `newsletter_unsubscribed` — a newsletter unsubscribe; the basis of newsletter churn and the symmetric pair of `newsletter_subscribed`<br>Required fields: newsletter_type · Implementation: requires site code.

##### Referenced events (from the core or another pack — not defined here)
- Event `item_viewed` ← Search & Discovery pack: an article page view = `item_viewed` with `item_type=article` (replaces the former `article_viewed`); Publisher consumes it as the denominator of Completion Rate / Recirculation / Avg Read Time. (conv only when `referrer_surface` is in {search, list, recommendation, autocomplete}, i.e. discovery-attributed.)
- Event `item_list_viewed` ← Search & Discovery pack: a view of a category/archive/feed/author page with `list_type=category|feed|collection|related` (replaces `content_list_viewed` and `author_page_viewed`); consumed in feed-entry analysis.
- Event `list_item_clicked` ← Search & Discovery pack: a feed card click (replaces `content_card_clicked`) with `item_type=article` + `list_type`; the basis of feed CTR.
- Event `recommendation_clicked` ← Search & Discovery pack: a click on a related article within the page (replaces `related_article_clicked`); the basis of Recirculation Rate and the numerator of the recommendation block's CTR (micro-conversion proxy, funnel goal step).
- Event `recommendation_viewed` ← Search & Discovery pack: a viewport-confirmed impression of the recommendation block (replaces `recommendation_impression`); the denominator of the true recirculation CTR.
- Event `share` ← core: sharing an article (replaces `article_shared`) with `share_channel` + `entity_type=article`; consumed in Share Mix and as an organic growth signal.
- Event `reaction_added` ← Community pack: a reaction on an article (and on a comment, with `target_type=article|comment`); a content-quality signal.
- Event `reaction_removed` ← Community pack: removing a reaction; the pair for net reactions.
- Event `item_saved` ← Community pack: saving an article for later (replaces `article_bookmarked`) with `item_type=article`.
- Event `item_unsaved` ← Community pack: unsaving; the pair for net saves.
- Event `entity_followed` ← Community pack: following an author or topic (replaces `author_followed`/`topic_followed`) with `entity_type=author|topic`; consumed in the loyal-audience growth card (non-conv).
- Event `entity_unfollowed` ← Community pack: unfollowing; the pair for net follows.
- Event `comment_added` ← Community pack: posting a comment under an article (with `article_id` as optional); a deep-engagement signal.
- Event `comment_replied` ← Community pack: a reply under a comment; the depth of the conversation under the article.
- Event `content_reported` ← Community pack: reporting inappropriate content with `target_type=article|comment`; a trust & safety signal for the newsroom.
- Event `video_started` ← Video pack (Media baseline): activating "Listen"/TTS on the text (replaces `article_listen_started`) with `media_type=audio` and `placement=content`.
- Event `video_completed` ← Video pack (Media baseline): finishing TTS listening to 90%+ (replaces `article_listen_completed`).
- Event `paywall_viewed` ← Subscription / Paywall pack: reaching locked content (replaces `paywall_reached`); Article only adds `article_id`/`paywall_type`/`articles_remaining` as optional.
- Event `paywall_dismissed` ← Subscription / Paywall pack: dismissing the paywall; the basis of the dismiss rate in the paywall funnel.
- Event `subscription_started` ← Subscription / Paywall pack: the destination of the paywall funnel (`paywall_viewed` → `subscription_started`); the terminal subscription conversion.
- Event `search_submitted` ← core: internal search with `search_context=content` (replaces `search_performed`); the starting point of the behavioral path to `newsletter_subscribed`.
- Event `form_submitted` ← core: the floor under `newsletter_subscribed`; when the site does not send newsletter metadata, the newsletter form submission is recorded here with `form_id`.
- Event `scroll_depth_reached` ← core: the floor for whole-page scroll depth; `article_read_depth` is its enriched, body-scoped version and references it.

##### Custom Event candidates
- Event `interactive_explainer_step`: custom data-storytelling widgets (scrollytelling, interactive maps, clickable charts) have a step/state structure unique to that article; a general schema cannot be defined in advance (suggested schema: `interactive_explainer_step { article_id (required), widget_id (required), step_index, step_name, interaction_type }`).
- Event `liveblog_update_viewed`: live news coverage has incremental updates; the identifier of "one live update" is specific to each site's implementation and does not fit in `item_viewed` (suggested schema: `liveblog_update_viewed { article_id (required), update_id (required), update_timestamp, position_in_feed }`).
- Event `embedded_poll_voted`: an in-article poll/quiz with options chosen per article; `option_id` and the question are site-specific (suggested schema: `embedded_poll_voted { article_id (required), poll_id (required), option_id (required), poll_question }`).
- Event `fact_check_expanded`: fact-check blocks are proprietary widgets of some outlets; their structure and interaction type are not standard (suggested schema: `fact_check_expanded { article_id (required), claim_id, verdict, expand_type }`).
- Event `text_highlight_shared`: highlight-to-share exists only on some sites, and the selection range/selected text is implementation-specific (a richer version of the canonical `share`, because it has a selection range) (suggested schema: `text_highlight_shared { article_id (required), highlight_text, char_start, char_end, share_channel }`).
- Event `gift_article_sent`: "gifting a paid article to a non-subscriber" (the NYT model) has quota logic and gift links specific to each publisher; it cannot be generalized (suggested schema: `gift_article_sent { article_id (required), gift_id, recipient_channel, gifts_remaining }`).

##### Shown in the Publisher dashboard
- **KPI card — Full read rate (Completion Rate)** — `article_read_completed` ÷ `item_viewed(item_type=article)` × 100 — Source: `article_read_completed`, `item_viewed` — Type: KPI tile with period delta and a color threshold.
- **KPI card — Average real reading time (Avg Read Time)** — average `active_time_sec` from `article_engagement_time` — Source: `article_engagement_time` — Type: KPI tile (mm:ss format, exempt from the percentage rule).
- **KPI card — Internal recirculation rate (Recirculation Rate)** — `recommendation_clicked(item_type=article)` ÷ `item_viewed` × 100 — Source: `recommendation_clicked`, `item_viewed` — Type: KPI tile.
- **Content digestion funnel (Reading Funnel)** — `item_viewed` → `article_read_started` → `article_read_depth` (25/50/75%) → `article_read_completed`; pass-through rate of each step — Source: `item_viewed`, `article_read_started`, `article_read_depth`, `article_read_completed` — Type: Funnel (stepped horizontal bars).
- **Author Leaderboard** — for each `author_name`: views, Completion Rate, Avg Read Time, share rate — Source: `item_viewed`, `article_read_completed`, `article_engagement_time`, `share` — Type: sortable table with sparkline.
- **Category Performance** — for each `article_category`: view volume against Completion Rate and Recirculation — Source: `item_viewed`, `article_read_completed`, `recommendation_clicked` — Type: bubble chart (x=views, y=completion, size=share).
- **Scroll-Depth Distribution** — percentage of readers reaching each milestone (25/50/75/100) — Source: `article_read_depth` — Type: horizontal bars (depth histogram).
- **Share Mix (sharing channels)** — breakdown of `share` by `share_channel` and each channel's share — Source: `share` — Type: donut / horizontal bars.
- **Recommendation block effectiveness (Recommendation CTR)** — `recommendation_clicked` ÷ `recommendation_viewed` × 100 (broken down by position/module_type) — Source: `recommendation_viewed`, `recommendation_clicked` — Type: horizontal bars by position + time trend.
- **Loyal audience growth (Audience Building)** — net newsletter = `newsletter_subscribed` − `newsletter_unsubscribed`; net follows = `entity_followed` − `entity_unfollowed` (entity_type=author|topic) — Source: `newsletter_subscribed`, `newsletter_unsubscribed`, `entity_followed`, `entity_unfollowed` — Type: trend line chart + net KPI.
- **Paywall Funnel** — `paywall_viewed` → `subscription_started`; dismiss rate = `paywall_dismissed` ÷ `paywall_viewed` — Source: `paywall_viewed`, `paywall_dismissed`, `subscription_started` — Type: Funnel + dismiss-rate KPI (combined with the Subscription pack).
- **Content conversion rate (from the Report Builder funnel)** — for each goal step (`article_read_completed`, `newsletter_subscribed`, `recommendation_clicked`) a funnel with that same final step is built in Report Builder; the funnel's rate = the conversion rate; there is no event-marking mechanism and no limit on the number of conversions — Source: `article_read_completed`, `newsletter_subscribed`, `recommendation_clicked` — Type: rate card from the funnel.

##### Presence in other Shahin services
- **Content (Content dashboard — Engagement module)**: `item_viewed(article)`/`article_read_depth`/`article_read_completed`/`share`/`reaction_added` feed the "full read rate" and the content-quality signals; Publisher is a deeper version of the same data focused on digestion/recirculation.
- **Behavior / User Journey**: the time sequence `search_submitted` → `list_item_clicked` → `item_viewed` → `recommendation_clicked` → `newsletter_subscribed` builds the loyal-audience conversion path and its drop-off points.
- **Session Replay**: every event is a jump-point on the timeline; the analyst sees the moment of `paywall_viewed`, or the scroll stopping before `article_read_completed`, on the replay bar.
- **AI Insights**: events + auto-properties are the model's raw data; combined insights are built automatically from crossing `session_referrer`/`device_type` with a content event (e.g. the `article_read_completed` rate of Telegram traffic); when a Publisher card crosses its threshold, the context is sent to the AI Insight Engine.
- **Analytics (Conversion / Funnel)**: the goal-step events (`article_read_completed`, `newsletter_subscribed`, `recommendation_clicked`) become the end point of a funnel in Funnel Builder, and the conversion rate is read from that funnel; sliced by `utm_campaign`/`session_referrer`.


---


#### Pack 3 — Audio & Podcast

This pack supplies the data for audio consumption analysis on podcast sites, online radio, and TTS over content. Almost the entire playback body of this pack belongs to the single "MEDIA playback" family (owner: Video), and audio events are told apart from the rest of the family only by `media_type=audio` (and `placement=content|ad`). The Video owner defines the schema once, and this pack carries its domain properties (such as `episode_id`, `position_sec`, `playback_speed`, `direction`) as optional on the same events. The only genuinely owned event of this pack is `episode_download`: because an offline podcast download is the unit of podcast monetization, is IAB-counted and carries the meaning of an offline entitlement, it is kept as a domain event under the carve-out of the core `file_download`.

##### Owned events
- Event `episode_download` — downloading a podcast episode for offline consumption (an IAB-counted download); the unit of podcast monetization and the basis of Download Rate<br>Required fields: episode_id · Optional fields: series_id, podcast_title, total_duration_sec, episode_number, season_number · ✓ funnel goal step · Implementation: requires site code (episode_id/series_id come from the player payload; the other properties from auto-properties)

##### Referenced events (from the core or another pack — not defined here)
- Event `video_started` ← Video pack: the main spine of every audio metric (unique listeners, total plays, the denominator of Completion/Consumption); with `media_type=audio` and `placement=content`; replaces the raw `audio_start`
- Event `video_progress` ← Video pack: the 25/50/75% milestones for the drop-off curve and the audio digestion funnel
- Event `video_heartbeat` ← Video pack: a periodic ping (~10s) for real watch time, a precise retention curve, and keeping the session of long episodes alive
- Event `video_paused` ← Video pack: the abandonment point on the retention curve (position of the last pause)
- Event `video_resumed` ← Video pack: separates the stop-and-continue pattern from real abandonment; complements `video_paused`
- Event `video_completed` ← Video pack: the headline KPI of listener commitment (90%+); the numerator of Completion Rate and the end of the digestion funnel; replaces `audio_complete`
- Event `video_seeked` ← Video pack: the basis of the Skip Heatmap and the back-and-forth radar; the `direction(forward|backward)` parameter instead of two separate skip events
- Event `video_rate_changed` ← Video pack: the basis of average playback speed and the speed distribution; replaces `audio_speed_change` (normalizing `*_change`→`*_changed`)
- Event `video_buffered` ← Video pack: audio experience quality (buffering/stall rate); the audio equivalent of `video_buffer`
- Event `video_error` ← Video pack: root-causing audio playback or loading failures
- Event `video_next_autoplayed` ← Video pack: a binge and continuous listening-session signal; replaces the raw `next_episode_autoplayed`
- Event `ads_video_started` ← Video pack: the start of an in-stream audio ad with `placement=ad`; separates ad time from content (this is part of media with placement=ad, not the Advertising pack's inventory lifecycle)
- Event `ads_video_completed` ← Video pack: the audio ad completion rate (a sellable completed view)
- Event `ads_video_skipped` ← Video pack: the ad tolerance rate; complements `ads_video_completed`
- Event `share` ← core: sharing an episode/podcast (the GA4-reserved name is kept) with `entity_type=podcast/episode` and `share_channel`; replaces the raw `audio_shared`
- Event `entity_followed` ← Community pack: following a podcast/series for Follow Rate and follower growth; with `entity_type=podcast` and `content_id=series_id`; replaces the raw `podcast_follow`
- Event `recommendation_clicked` ← Search & Discovery pack: a click on a suggested episode/podcast for audio recirculation (CTR@k)
- Event `item_viewed` ← Search & Discovery pack: an episode page view as the denominator of Follow Rate and Download Rate and the first step of the digestion funnel; in Shahin = `item_viewed`/`article_viewed` with `category=podcast` (a standalone `episode_viewed` event was deliberately not defined)
- Event `search_submitted` ← core: the first step of the audio User Journey path; replaces the raw `search_performed` in the cross-service narrative

##### Custom Event candidates
- Event `transcript_segment_clicked`: jumping to a point in the audio from an interactive transcript is a site-specific widget; the segment structure and the existence of a transcript are not standard, and it cannot be extracted from auto-properties or a single schema (suggested schema: episode_id, segment_id, target_position_sec, transcript_lang)
- Event `chapter_skipped`: chapters are meaningful only on podcasts that have markers and cannot be defined without the site's chapter structure; in V2 it can be upgraded to `chapter_started`/`chapter_completed` (suggested schema: episode_id, chapter_id, chapter_title, chapter_type [intro|content|ad|recap|outro], position_sec)
- Event `sleep_timer_set`: a sleep timer is a UI capability specific to advanced players; not every site has one and its behavior is not standard; on naming, a revision to `sleep_timer_started` is proposed (the verb `set` has no distinct past-tense form) (suggested schema: episode_id, timer_minutes, trigger [manual|auto])
- Event `audio_bookmarked`: bookmarking a specific moment in the audio is tied to the user's personal list, and its storage differs from site to site; it has no single predefined schema (suggested schema: episode_id, bookmark_position_sec, note_text)
- Event `drm_license_acquired`: audio DRM is rare on the Persian web and fully dependent on the player/EME implementation; predefining it would create an orphan event (suggested schema: episode_id, drm_system, license_latency_ms, result [success|error], error_code)
- Event `live_concurrent_sampled`: sampling concurrent listeners of live radio needs server-side sampling infrastructure, not a user-behavior event; it cannot be derived from the browser SDK (suggested schema: stream_id, concurrent_listeners, sampled_at)

##### Shown in the Audio dashboard
- **KPI card — Unique listeners and total plays** — unique session/user count and total count on `video_started` with `media_type=audio` in the range — Source: video_started — Type: KPI card + sparkline
- **KPI card — Average consumption rate** — average ratio of seconds listened to total duration per (session_id, episode_id), from the position of the last heartbeat/pause relative to total_duration_sec (always ≤100%) — Source: video_heartbeat, video_paused, video_progress, video_started — Type: KPI card
- **KPI card — Playback completion rate (Completion Rate)** — `video_completed` divided by `video_started`, on the unique count of (session_id, episode_id) — Source: video_completed, video_started — Type: KPI card + threshold badge
- **KPI card — Follower acquisition rate (Follow Rate)** — `entity_followed(entity_type=podcast)` divided by episode page views (`item_viewed` with category=podcast); a cross-pack denominator from Search/Article — Source: entity_followed, item_viewed — Type: KPI card + threshold badge
- **KPI card — Download commitment rate (Download Rate)** — `episode_download` divided by episode page views (`item_viewed`, category=podcast) — Source: episode_download, item_viewed — Type: KPI card + threshold badge
- **KPI card — Average playback speed** — average `playback_speed` on `video_rate_changed` with media_type=audio (speed changers only); informational, without a threshold — Source: video_rate_changed — Type: KPI card
- **Episode Completion trend** — daily Completion Rate per podcast over 30 days — Source: video_completed, video_started — Type: line chart (one line per podcast)
- **Speed Distribution** — percentage of users in each speed bucket (0.75x/1x/1.25x/1.5x/2x) + an AI label "Informational/Deep" — Source: video_rate_changed — Type: horizontal bar chart
- **Skip Heatmap (specialized)** — count of `video_seeked` in each 5% bucket of the episode duration (20 buckets), normalized to a percentage — Source: video_seeked — Type: Heatmap (green→yellow→red)
- **Listener retention curve (Drop-off Curve, specialized)** — percentage of sessions still listening up to each percentage of the duration, from heartbeat/progress and the position of the last pause — Source: video_heartbeat, video_progress, video_paused — Type: retention curve (area/line)
- **Follower Growth (specialized)** — new `entity_followed(podcast)` per day (no cumulative view; `entity_unfollowed` is not monitored in this pack) — Source: entity_followed — Type: bar chart
- **QoE — Buffering and playback error rate** — ratio of sessions with `video_buffered`/`video_error` to all playback sessions (unique session_id), media_type=audio; a quality rate only — Source: video_buffered, video_error, video_started — Type: KPI card + trend line
- **Episode Insights Table** — for each episode: plays, unique listeners, Completion, average Consumption, downloads, follows; the entry point to the Side Panel — Source: video_started, video_completed, video_heartbeat, episode_download, entity_followed — Type: data table (sortable + CSV export)
- **Side Panel — Audio digestion funnel** — `item_viewed(podcast)` → `video_started` → `video_progress(50%)` → `video_completed`; each step shows the count + percentage relative to the previous step — Source: item_viewed, video_started, video_progress, video_completed — Type: Funnel
- **Side Panel — Seek Trajectory radar** — count of backward (re-listen) vs. forward (local drop-off) from the `direction` inside `video_seeked` — Source: video_seeked — Type: two-stat (two colored numbers)
- **Podcast conversion rate (from the Report Builder funnel)** — a funnel with `episode_download` or `video_completed` as the final step is built in Report Builder, and its rate is the conversion rate; note: `entity_followed` and `share` are not goal steps and are shown only as engagement goals — Source: episode_download, video_completed — Type: rate card from the funnel + rate badge

##### Presence in other Shahin services
- **Content (Engagement module)**: feeds `video_started`/`video_completed`/`video_heartbeat` (media_type=audio) plus `share(entity_type=podcast)`; the editor sees which episode was listened to the end, the audio equivalent of the full read rate (the episode page denominator comes from `item_viewed` with category=podcast)
- **Behavior / User Journey**: the time sequence of the path to conversion, `search_submitted` → `item_viewed(podcast)` → `video_started` → `video_completed` → `entity_followed(podcast)`, shows through which path users become followers/downloaders and where they drop off (e.g. an early pause)
- **Session Replay**: every audio event of the family (started/seeked/buffered/paused/completed) becomes a jump-point on the session recording timeline; the analyst sees the moment of a seek, buffering or episode abandonment on the replay bar
- **AI Insights**: events + auto-properties are the model's raw input; cross-cutting insights such as "mobile listeners from Telegram have a higher Completion rate" are built from crossing `device_type`/`session_referrer` (auto) with `video_completed`, plus a real-time Persian recommendation when cards cross their threshold
- **Analytics**: conversion events (`episode_download` and `video_completed` with media_type=audio) appear as key events in the traffic and UTM reports; `ads_video_started`/`ads_video_completed` (placement=ad) are handed over to the Ads/Revenue dashboards (no rial calculation in this pack); per the core, `entity_followed` is non-conv and is reported as a retention/engagement goal, not an acquisition conversion


---


#### Pack 4 — Gallery

The Gallery pack plays the same role as Article & Content for *visual* content: photo albums, news galleries, image slideshows. Instead of "reading the text", it measures the depth of visual consumption: how many images were seen, where in the album the user dropped off, and which image got the most engagement. This pack is the visual module of the same Publisher Dashboard (a dashboard shared with Article & Content); it does not build a standalone report but feeds the gallery section of that dashboard. None of the visual events map to the MEDIA family, because `media_type` only accepts video/audio/vod and image is not a valid value; so lightbox/slideshow/zoom all stay owned by Gallery.

##### Owned events
- Event `gallery_viewed` — the user opens a gallery/album (landing on it, or the image container opening); the content-open equivalent for images, and it must be deduplicated against `shahin_page_view`<br>Required fields: gallery_id, gallery_title, image_count · Implementation: requires site code
- Event `gallery_image_viewed` — a single image is seen/activated on screen (each time the current slide changes); the basis of visual watch time and the depth funnel<br>Required fields: gallery_id, image_id, image_position · Implementation: requires site code
- Event `gallery_image_navigated` — moving between images (next/prev, swipe, thumbnail click, keyboard), broken down by method/direction and separating manual navigation from autoplay<br>Required fields: gallery_id, from_position, to_position · Implementation: requires site code
- Event `gallery_completed` — the user reached the last image or saw ≥90% of the unique images; the gallery equivalent of `article_read_completed` and a terminal deep-engagement signal<br>Required fields: gallery_id, image_count, images_seen · ✓ funnel goal step · Implementation: requires site code
- Event `gallery_image_zoomed` — activating zoom/pinch on an image; a signal of deep visual interest (micro-event)<br>Required fields: gallery_id, image_id · Implementation: requires site code
- Event `gallery_lightbox_opened` — opening an image in fullscreen/lightbox mode; the image analog of full_screen (not folded into MEDIA, because image is not a valid media type)<br>Required fields: gallery_id, image_id · Implementation: requires site code
- Event `gallery_lightbox_closed` — closing/leaving the lightbox; the `_opened`/`_closed` pair is used to compute fullscreen display duration<br>Required fields: gallery_id, image_id · Implementation: requires site code
- Event `gallery_slideshow_started` — the automatic slideshow starting (manually or by autoplay), broken down by method; it is visual, not media playback<br>Required fields: gallery_id · Implementation: requires site code
- Event `gallery_slideshow_stopped` — the automatic slideshow stopping/pausing (manually or at the end of the album)<br>Required fields: gallery_id · Implementation: requires site code
- Event `gallery_image_load_failed` — an image failed to load (broken image / timeout); the basis of the broken-image rate and the gallery's own QoE, distinct from the core `error_shown` and from `video_error`<br>Required fields: gallery_id, image_id · Implementation: requires site code

##### Referenced events (from the core or another pack — not defined here)
- Event `share` ← core: sharing an image/gallery is the canonical share (GA4-reserved, with `share_channel` + `content_id` + `entity_type`); the gallery version maps with `entity_type=image_gallery|image` and `content_id=gallery_id/image_id`, and the channel breakdown widget and the image ranking draw from it.
- Event `file_download` ← core: downloading an image is the canonical file_download (GA4-aligned, with `file_type`/`file_name`); the gallery version maps with `file_type=image` and is deduplicated against the generic version for gallery assets.
- Event `subscription_started` ← core (SUBSCRIPTION family, owner: Subscription/Paywall pack): for sites that see the gallery as an audience-acquisition funnel, the end of the gallery funnel reaches a subscription; this is a cross-pack conversion used in the "presence in other services" section, not a Gallery-specific conv.

##### Custom Event candidates
- Event `gallery_image_tagged`: hotspot tagging on points of an image is highly site-specific; neither the tag structure nor the existence of the capability in every gallery can be assumed by default (suggested schema: gallery_id, image_id, tag_value, tag_x, tag_y as relative hotspot coordinates).
- Event `gallery_filter_applied`: a filter inside a large gallery (color/event/face) depends on each site's custom design and has no fixed `filter_type`; distinct from `item_list_filtered` because it is inside a gallery, not a product/content list (suggested schema: gallery_id, filter_type, filter_value, results_count).
- Event `gallery_image_compared`: a before/after comparison widget is bespoke and exists only in specialized galleries (architecture/medical) (suggested schema: gallery_id, image_id_a, image_id_b, slider_position).
- Event `gallery_360_interacted`: interacting with a 360/panorama image needs a specialized player that is not part of a standard gallery, and its behavior cannot be predefined (suggested schema: gallery_id, image_id, rotation_degrees, interaction_type with values drag|gyro|zoom).
- Event `gallery_purchase_clicked`: buying a stock/print image is a site-specific commercial flow and must be linked to the COMMERCE family (owner: E-commerce pack), not the Gallery pack. Naming warning: this is a CTA/intent and in implementation must map to the core `cta_clicked` (with placement=gallery) or `add_to_cart`, not to the `purchase` event, which GA4 reserves for the terminal step (suggested schema: gallery_id, image_id, price, currency, license_type).

##### Shown in the Publisher dashboard
- **KPI card — Gallery Completion Rate** — `gallery_completed` ÷ `gallery_viewed` as a percentage — Source: gallery_completed, gallery_viewed — Type: single-stat KPI with trend sparkline and delta
- **KPI card — Average images seen per gallery (Images per Gallery)** — average `images_seen` over gallery sessions, as the depth of visual consumption — Source: gallery_image_viewed, gallery_viewed — Type: single-stat KPI
- **Gallery Depth Funnel** — drop-off between the steps open → second image → middle of the album → last image; each step shows the survival percentage relative to `gallery_viewed` — Source: gallery_viewed, gallery_image_viewed, gallery_image_navigated, gallery_completed — Type: funnel chart
- **Image Drop-off Curve (attention drop by image position)** — percentage of users who reached each `image_position`, as a descending curve of the drop-off point — Source: gallery_image_viewed, gallery_image_navigated — Type: descending line chart (retention-by-position)
- **Top Engaged Images** — images ranked by total zoom + lightbox + share + download (filtered by `entity_type=image` / `file_type=image` and gallery_id) — Source: gallery_image_zoomed, gallery_lightbox_opened, share, file_download — Type: ranked table with thumbnails
- **Image Share by Channel** — distribution of the core `share` (filtered by `entity_type=image_gallery|image`) by `share_channel` — Source: share — Type: donut / horizontal bar chart
- **Gallery conversion rate (from the Report Builder funnel)** — a funnel from `gallery_viewed` to the final step `gallery_completed` is built in Report Builder, and its rate is the conversion rate; share and file_download are not goal steps and are kept out of this calculation to avoid double counting — Source: gallery_viewed, gallery_completed — Type: rate card from the funnel (§5.4)
- **Broken Image Rate — QoE card** — `gallery_image_load_failed` ÷ total `gallery_image_viewed` — Source: gallery_image_load_failed, gallery_image_viewed — Type: single-stat KPI with a threshold/color alert
- **Manual vs Autoplay Mix (slideshow)** — share of manual navigation vs. the automatic slideshow, to prevent automatic views from inflating the stats — Source: gallery_slideshow_started, gallery_image_navigated — Type: stacked bar / two-part ratio

##### Presence in other Shahin services
- **Content (Content dashboard — Engagement module)**: `gallery_viewed` and `gallery_completed` play the role of article view/read_completed for visual content and give the editor the full gallery view rate plus content-quality signals (core share/file_download filtered to galleries).
- **Behavior / User Journey**: builds the time sequence of the path to conversion; the chain `gallery_viewed` → `share` (entity_type=image) → `subscription_started` shows how visual content turns into a loyal audience.
- **Session Replay**: every gallery event is a jump-point on the recording timeline; the analyst sees the moment of `gallery_image_zoomed`, or the drop-off point, on the replay bar.
- **AI Insights**: events plus auto-properties are the model's raw input; an automatic insight such as "mobile users from Telegram view galleries 2x more completely" is built from crossing `device_type`/`session_referrer` with `gallery_completed`.
- **Analytics (general traffic dashboard)**: every gallery event is recorded with full auto-properties (page/utm/geo/device/performance), and the same record goes to the traffic reports, campaign attribution and the device/city breakdown.

> **Implementation and conversion-rate note:** all owned Gallery events are needs-site-code (they need gallery_id/image_id/position, which cannot be extracted from auto-properties), but the auto-properties (page/referrer/utm/device/screen/geo/performance/session+user plus the 5 custom segments) are attached to every record for free. Gallery's natural goal step is `gallery_completed`; `gallery_viewed` is not a goal step, because an open/view is an engagement micro-event (the same logic as article_read_depth). The conversion rate is read from the Report Builder funnel (`gallery_viewed` → `gallery_completed`); there is no event-marking mechanism and no limit on the number of conversions.

---


#### Pack 5 — Search & Discovery

This pack covers the entire "content discovery" funnel: both the typed-search path and the browse path through lists/feeds/categories and the recommender. The backbone of all of this is a single `search_id` identifier, minted once at the moment of submit and carried through to the final conversion so the whole funnel can be joined. The distinctive value of the pack is that its data directly shows the site's "content gap": queries users are looking for but the site has no answer to. That is why it justifies a dashboard of its own, and its output is injected into the content production priority queue as well as into User Journey and AI Insights.

##### Owned events
- Event `search_submitted` — **-toggle / 3-enriched** · the user submits a query (Enter or the search button); in instant search, only the final query after debounce, not every keystroke · Required fields: search_query, search_id, search_context · Implementation: requires site code (the enriched version replaces the generic `search` Toggle, which is switched off to avoid double counting; normalization of ی/ك (Persian yeh vs. Arabic yeh/kaf variants), the zero-width non-joiner and trimming is done on Shahin's side to build `search_query_normalized`; all auto-properties are attached for free)
- Event `search_no_results` — **-toggle / 3-enriched** · the user reaches "No results found" (a separate first-class event, not relying on `results_count=0`) · Required fields: search_query, search_context, search_id · Implementation: requires site code (the raw `search_query` feeds the content-gap Word Cloud; its rate must raise an alert; per the core rule it is never a Conversion)
- Event `search_results_viewed` — the results page renders, only the first page of each query (later pages via `results_paginated`)<br>Required fields: search_id, search_query, results_count · Implementation: requires site code (only the site knows `results_count` and `latency_ms`)
- Event `search_result_clicked` — the user clicks an organic result on the results page<br>Required fields: search_id, position, item_id · ✓ funnel goal step · Implementation: requires site code (`position` must be 1-based; numerator/denominator of CTR@k and MRR)
- Event `search_suggestion_shown` — the list of autocomplete suggestions is shown under the search box (impression)<br>Required fields: search_id, partial_query, suggestion_count · Implementation: requires site code (high volume, needs sampling)
- Event `search_suggestion_clicked` — the user clicks an autocomplete suggestion instead of typing the full query<br>Required fields: search_id, suggestion_text, position · ✓ funnel goal step · Implementation: requires site code
- Event `search_filter_applied` — the user applies, adds, removes or clears a filter/facet on the search results<br>Required fields: search_id, filter_type, filter_value · Implementation: requires site code
- Event `search_sort_changed` — the user changes the result sort order (relevance/newest/popular)<br>Required fields: search_id, sort_by · Implementation: requires site code
- Event `search_refined` — the user rewrites the query right after seeing the results (the same `search_id` continues)<br>Required fields: search_id, previous_search_query, new_search_query · Implementation: requires site code (the search_id chain)
- Event `results_paginated` — the user fetches the next page / load-more / infinite-scroll of results<br>Required fields: search_id, from_page, to_page · Implementation: requires site code
- Event `item_list_viewed` — a list/feed/category/collection is shown on the browse path (not typed search)<br>Required fields: item_list_id, list_type · Implementation: requires site code (on category pages, `item_list_id` can be derived from `entity_taxonomy_id`, which is an auto-property)
- Event `item_list_filtered` — the user applies a filter/sort on a browse list (not search results)<br>Required fields: item_list_id, filter_type, filter_value · Implementation: requires site code
- Event `list_item_clicked` — the user clicks a card in a list/feed/category (the browse-path parallel of `search_result_clicked`)<br>Required fields: item_id, position, item_list_id · ✓ funnel goal step · Implementation: requires site code (`position` 1-based)
- Event `list_item_impressed` — a single card enters the viewport (an impression with viewability); the honest denominator of CTR@k and MRR<br>Required fields: item_id, position, item_list_id · Implementation: requires site code (IntersectionObserver; high volume, needs sampling)
- Event `item_viewed` — a detail/landing page reached from a Discovery surface, carrying `referrer_surface` and `search_id`<br>Required fields: item_id, referrer_surface · ✓ funnel goal step (only when `referrer_surface` is one of search/list/recommendation/autocomplete; a plain detail view is non-conv) · Implementation: requires site code (on a news site this is usually the Article pack's `article_viewed` with these properties)
- Event `recommendation_viewed` — a recommended widget/set renders (related, home, post-action)<br>Required fields: recommendation_id, placement · Implementation: requires site code
- Event `recommendation_clicked` — the user clicks a recommended item<br>Required fields: recommendation_id, item_id, position · ✓ funnel goal step (the legitimate CTR@k proxy) · Implementation: requires site code
- Event `recommendation_dismissed` — the user hides/rejects a recommendation ("Not interested"); a negative feedback signal for model evaluation<br>Required fields: recommendation_id, item_id · Implementation: requires site code
- Event `saved_search_created` — the user saves a search or subscribes to an alert/notification for it (an intent-to-return signal)<br>Required fields: search_query · ✓ funnel goal step · Implementation: requires site code

##### Referenced events (from the core or another pack — not defined here)
- Event `empty_state_viewed` ← core (owner: Nav & Forms): used for the cold-start metric of Discovery surfaces (an empty category or a new user's feed), distinct from `search_no_results`, which concerns typed search. Search only references it and does not redeclare it (canonical parameters: surface_type, screen_name, reason).
- Event `article_read_depth` ← Article & Content pack: needed for the reciprocal KPI "real engagement rate after search / Search-to-Engaged-Read", to establish that the result clicked after a search was actually read to the end, not just clicked.
- Event `scroll_depth_reached` ← core: the basic viewing-depth signal of the results/list page for post-discovery engagement analysis; owner = core, Search is only a consumer.

##### Custom Event candidates
- Event `voice_search_session`: voice search interaction has a state machine specific to each site (mic_opened → listening → transcript_partial → finalized → error), and the error codes of the intermediate events differ from site to site; in predefined only `is_voice` on `search_submitted` is covered (suggested schema: stage = mic_opened|listening|transcript_finalized|error · transcript_text · asr_confidence 0..1 · language · error_code · search_id)
- Event `scoped_search_widget_toggled`: a site-specific scope/tab switcher with a unique enumeration (news|archive|multimedia|users) cannot be predefined; `search_scope` on `search_submitted` captures the result as a free string, but the toggle interaction itself is a bespoke widget (suggested schema: from_scope · to_scope · search_id · has_active_query boolean)
- Event `answer_box_interacted`: an answer box / featured snippet / AI summary above the results is a custom component; the interaction types and the answer content structure differ for each site and its schema cannot be predefined (suggested schema: search_id · interaction = expand|collapse|copy|feedback_positive|feedback_negative|source_clicked · source_item_id)
- Event `facet_chip_reordered`: advanced drag-and-drop or facet-prioritization UIs; this widget-specific micro-interaction is tied to a custom DOM/component, not to the general filter-apply pattern (suggested schema: search_id · facet_type · from_index · to_index)

##### Shown in the Search dashboard
- **KPI card — Search Satisfaction Rate** — count of unique `search_id`s with a click divided by the count of result views — Source: search_results_viewed, search_result_clicked — Type: KPI with trend sparkline and period delta
- **KPI card + Word Cloud — Zero-result rate and content gap** — count of `search_no_results` divided by total `search_submitted`; a Word Cloud of the raw `search_query` of `search_no_results`, weighted by frequency — Source: search_no_results, search_submitted — Type: KPI with an alert threshold + clickable Word Cloud
- **KPI card — Search Abandonment rate** — share of result views without a matching click divided by all result views (a derived session-level metric, not a standalone event) — Source: search_results_viewed, search_result_clicked — Type: KPI
- **CTR@k by position chart** — clicks at each `position` divided by impressions at that same position; a sharp CTR drop at low ranks = weak ranking — Source: search_result_clicked, list_item_impressed, search_results_viewed — Type: bar chart by position
- **MRR — Mean Reciprocal Rank of clicks** — the mean of the reciprocal `position` of the first clicked result in each `search_id` — Source: search_result_clicked — Type: KPI + line trend
- **Top queries table** — the frequency of each `search_query_normalized`, with each query's click rate and zero-result rate — Source: search_submitted, search_results_viewed, search_result_clicked, search_no_results — Type: sortable table
- **Search Funnel** — step-by-step drop-off submit → results view → click → item view, joined on `search_id` — Source: search_submitted, search_results_viewed, search_result_clicked, item_viewed — Type: funnel chart
- **Autocomplete deflection rate** — `search_suggestion_clicked` divided by the sum of it and typed submits — Source: search_suggestion_clicked, search_submitted — Type: KPI + donut chart
- **Refinement & Recovery rate** — refinement rate = `search_refined` divided by `search_submitted`; zero-to-one recovery rate = share of `search_id`s that reached a click via refinement/suggestion after `search_no_results` — Source: search_refined, search_no_results, search_result_clicked, search_suggestion_clicked — Type: dual KPI + trend line chart
- **Results pagination depth histogram** — distribution of `to_page`/`cumulative_results_seen` before the first click; a long tail = weak ranking — Source: results_paginated, search_result_clicked — Type: histogram
- **Search response time (Latency)** — p50/p95 percentiles of `latency_ms` on result views, correlated with the abandonment rate — Source: search_results_viewed — Type: percentile line chart
- **Filter and sort effectiveness** — the most used `filter_type`/`filter_value` and `sort_by`, and the click rate after each refinement — Source: search_filter_applied, search_sort_changed, search_result_clicked — Type: table + bars
- **Recommender performance** — CTR of each `model_id`/`placement` = `recommendation_clicked` divided by `recommendation_viewed`; the dismiss rate as a negative signal — Source: recommendation_viewed, recommendation_clicked, recommendation_dismissed — Type: grouped bars by placement
- **Discovery-attributed conversions** — count and rate of `item_viewed` and attributed clicks, broken down by `referrer_surface` (search/list/recommendation) — Source: item_viewed, search_result_clicked, list_item_clicked, recommendation_clicked — Type: stacked bars by referrer_surface + conversion card
- **Discovery surface cold-start rate** — ratio of empty Discovery surfaces = `empty_state_viewed` (within the Discovery scope) divided by views of those same surfaces; distinct from the typed zero-result rate — Source: empty_state_viewed, item_list_viewed — Type: KPI + trend

##### Presence in other Shahin services
- **Content**: `item_viewed` with `referrer_surface=search` and `search_id`, alongside the Article pack's `article_read_depth`, builds the KPI "real engagement rate after search / Search-to-Engaged-Read"; the editor sees which clicked result was actually read to the end, not just clicked. `search_no_results` directly feeds the content production priority queue (content gap).
- **Behavior / User Journey**: the time sequence submit → results view → click → item view → domain conversion, joined on `search_id`, shows the behavioral path to conversion and the exact drop-off point; `search_refined` and `results_paginated` reveal the friction points along the path.
- **Session Replay**: every search event is recorded as a jump-point on the timeline; the analyst sees exactly the moment of `search_no_results` or `search_refined` on the replay bar and follows where the user went after a zero result, how long they stayed and where they exited.
- **AI Insights**: search events + auto-properties as the model's raw data; automatic combined insights from crossing `search_query_normalized`, country/city and device_type with the click rate. A time-bound spike in zero results during breaking news is labeled a "content opportunity" (not a technical failure).
- **Analytics (general reports)**: `search_submitted` and `search_results_viewed`, with auto-properties (session_referrer, utm_*, entity_taxonomy_id), go to the general traffic and segmentation reports; once this pack is implemented, the generic `search` Toggle is switched off to prevent double counting, and the enriched `search_submitted` replaces it.


---


#### Pack 6 — E-commerce

This pack is the canonical owner of Shahin's "commerce funnel" (COMMERCE funnel) family: it defines the cart → checkout → purchase → refund cycle once and for all, and the Marketplace, Travel and Gaming packs reference that same definition by changing only the value of the `vertical` parameter. Its goal is to answer the store owner's main question: what percentage of product views reached a purchase, where did the funnel drop off, and what was net revenue after refunds?
The role of this pack is to feed the E-commerce tab of the Revenue dashboard; every metric is defined only on data Shahin can actually collect, and there is no made-up LTV/RPM/rial-loss formula in it.

##### Owned events
- Event `add_to_cart` — adding a product to the shopping cart<br>Required fields: product_id, vertical · ✓ funnel goal step · Implementation: requires site code
- Event `remove_from_cart` — removing a product from the cart<br>Required fields: product_id, vertical · Implementation: requires site code
- Event `cart_viewed` — the cart page or drawer opening<br>Required fields: cart_id, vertical · Implementation: requires site code
- Event `add_to_wishlist` — adding a product to the wishlist<br>Required fields: product_id, vertical · Implementation: requires site code
- Event `remove_from_wishlist` — removing a product from the wishlist<br>Required fields: product_id, vertical · Implementation: requires site code
- Event `begin_checkout` — starting the checkout process (a GA4-reserved name, per the carve-out)<br>Required fields: cart_id, vertical · Implementation: requires site code
- Event `shipping_info_submitted` — submitting shipping information in the checkout step<br>Required fields: cart_id, vertical · Implementation: requires site code
- Event `payment_info_submitted` — submitting or selecting payment information in checkout; the deepest step before purchase<br>Required fields: cart_id, vertical · ✓ funnel goal step · Implementation: requires site code
- Event `coupon_applied` — a discount code successfully applied to the cart or checkout<br>Required fields: coupon_code, vertical · Implementation: requires site code
- Event `coupon_denied` — a discount code rejected (invalid, expired, or conditions not met)<br>Required fields: coupon_code, reason, vertical · Implementation: requires site code
- Event `purchase` — a successful purchase; the final receipt after returning from the payment gateway (a GA4-reserved name, per the carve-out; dedup by order_id is mandatory so that refreshing the gateway callback page does not create a second purchase)<br>Required fields: order_id, order_value, currency, vertical · ✓ funnel goal step · Implementation: requires site code
- Event `purchase_failed` — a failed purchase; the gateway returned a failure response (the failure twin, with a negative revenue effect)<br>Required fields: failure_reason, vertical · Implementation: requires site code
- Event `refund_issued` — a full or partial refund of an order (server-side; a negative revenue effect that nets Revenue)<br>Required fields: order_id, refund_value, currency, vertical · Implementation: requires site code
- Event `order_cancelled` — an order cancelled before delivery, by the user or the store (server-side; a negative revenue effect)<br>Required fields: order_id, vertical · Implementation: requires site code
- Event `promotion_viewed` — showing an internal banner, discount or promotional campaign (merchandising) to the user; a store-specific concept outside the shared families<br>Required fields: promotion_id · Implementation: requires site code
- Event `promotion_clicked` — a click on an internal banner or discount (merchandising); a store-specific concept<br>Required fields: promotion_id · Implementation: requires site code

##### Referenced events (from the core or another pack — not defined here)
- Event `item_list_viewed` ← Search & Discovery pack: showing a product list (with item_type=product and list_type of category/search/collection); replaces product_list_viewed and is the denominator of the "list → product page" conversion rate.
- Event `item_list_filtered` ← Search & Discovery pack: applying a filter or sort to a product list (item_type=product); replaces product_list_filtered for measuring the quality of catalog filtering.
- Event `list_item_clicked` ← Search & Discovery pack: a click on a product card in a list (item_type=product); replaces product_clicked and is the input to the discovery path in User Journey and to list CTR.
- Event `item_viewed` ← Search & Discovery pack: a product detail page view (item_type=product); replaces product_viewed and is the denominator of Purchase CVR and the deepening rate. It counts as a Conversion only when referrer_surface is one of search/list/recommendation/autocomplete (a core decision).
- Event `scroll_depth_reached` ← core: scroll depth on the product page (with depth_percent and screen=pdp); replaces product_detail_view and is the input to the "product deepening rate" card. Because it is core, it needs no separate domain event.
- Event `search_submitted` ← core: internal product search with search_context=ecommerce and search_id; replaces product_searched and is the denominator of the "product search quality" card.
- Event `search_no_results` ← core: a no-result search with search_context=ecommerce (the core's canonical version, not a pack-specific version); the numerator of the "product search quality" card and the list of high-zero-result queries.

##### Custom Event candidates
- Event `size_guide_viewed`: whether a size guide exists, and its form, depends entirely on the vertical (apparel has one, a Digikala-like store does not); Shahin cannot assume a standard trigger (suggested schema: product_id required, category, size_system)
- Event `product_configurator_changed`: customizable products (jewelry, PC builds, flowers) have custom widgets, and each site's option/value structure is unique and cannot be predefined (suggested schema: product_id required, option_type, option_value, resulting_price)
- Event `store_locator_searched`: only omnichannel stores with physical branches have this flow, and the parameters (city, branch, distance) are site-specific (suggested schema: query required, results_count, selected_branch_id)
- Event `back_in_stock_requested`: the "Notify me" widget is optional and implementation-driven, and the notification channel (sms/email/push) differs between sites (suggested schema: product_id required, notify_via)
- Event `installment_plan_selected`: BNPL and Iranian installment plans (Snapp Pay, Digipay, etc.) have a provider structure and number of installments specific to each provider, and have no single predefinable schema (suggested schema: provider required, installments_count, order_value, currency)
- Event `live_chat_opened_on_pdp`: the third-party chat tool and the condition for showing it on the product page differ completely from site to site (suggested schema: product_id, chat_provider, trigger_type)

##### Shown in the Revenue dashboard
- **KPI card — Purchase conversion rate (Purchase CVR)** — `purchase` after dedup by order_id divided by `item_viewed`, times 100 — Source: purchase, item_viewed — Type: KPI card with a threshold badge (green/yellow/red) and trend sparkline
- **KPI card — Revenue** — total order_value over unique purchases (dedup by order_id), netted against refund_value from `refund_issued` — Source: purchase, refund_issued — Type: KPI card (Toman, no decimals) + daily trend chart
- **KPI card — Average order value (AOV)** — total order_value divided by the number of unique purchases (after dedup) — Source: purchase — Type: KPI card (Toman)
- **KPI card — Cart Abandonment rate** — ratio of sessions with `add_to_cart` and no `purchase` to all sessions with add_to_cart, times 100 (a computed session-based metric, not an event) — Source: add_to_cart, purchase — Type: KPI card
- **KPI card — Payment Failure Rate** — `purchase_failed` divided by the sum of purchase and purchase_failed, times 100; a failure that is recovered by a successful retry in the same session is reported separately — Source: purchase_failed, purchase — Type: KPI card + descending bar chart by failure_reason
- **Purchase drop-off funnel (Abandonment by Step)** — pass-through and drop-off rate of each step relative to the previous step (user-scoped) — Source: begin_checkout, shipping_info_submitted, payment_info_submitted, purchase — Type: horizontal funnel with a red arrow for drop-off above 50%
- **Card — Cart removal ratio** — `remove_from_cart` divided by `add_to_cart`, times 100 (a signal of price hesitation or shipping cost) — Source: remove_from_cart, add_to_cart — Type: compact card
- **Card — Wishlist → purchase** — ratio of unique users who `purchase` the same item after `add_to_wishlist` to all users with add_to_wishlist, times 100 — Source: add_to_wishlist, purchase — Type: compact card
- **Card — Product deepening rate** — `scroll_depth_reached` (with screen=pdp and a high depth_percent) divided by `item_viewed`, times 100 (product page quality) — Source: scroll_depth_reached, item_viewed — Type: compact card
- **Coupon effectiveness** — coupon acceptance rate: `coupon_applied` divided by the sum of coupon_applied and coupon_denied; plus the share of orders with a coupon_code out of all purchases — Source: coupon_applied, coupon_denied, purchase — Type: donut + multi-reason bar chart for coupon_denied.reason
- **Product search quality** — no-result search rate: `search_no_results` divided by `search_submitted` (both with search_context=ecommerce), times 100; plus the list of high-zero-result queries — Source: search_submitted, search_no_results — Type: small KPI + top queries table
- **Internal promotion effectiveness (Merchandising)** — promotion CTR: `promotion_clicked` divided by `promotion_viewed`, times 100 — Source: promotion_viewed, promotion_clicked — Type: compact card + bar breakdown by creative_slot
- **Purchase conversion rate (from the Report Builder funnel)** — a funnel with `purchase` (or any other goal step) as the final step is built in Report Builder, and its rate is the conversion rate; it can be sliced on the same auto-properties; there is no event-marking mechanism and no limit on the number of conversions — Source: purchase, payment_info_submitted, add_to_cart — Type: rate card from the funnel

##### Presence in other Shahin services
- **Analytics**: the same event records, with auto-properties (utm/device/geo), build the conversion-rate column and the revenue breakdown in the traffic reports; for example, which Telegram campaign had the highest Purchase CVR, not just the most clicks.
- **Behavior**: the time sequence of events builds the behavioral path to purchase (item_viewed → add_to_cart → begin_checkout → purchase) and reveals the exact drop-off point (e.g. between payment_info_submitted and purchase) and the alternative paths.
- **User Journey**: feeds the user-scoped multi-session path (list_item_clicked/item_viewed in the first session → add_to_wishlist → a later return and purchase); the input to the Wishlist→purchase card and to understanding the long decision cycle.
- **Content / Behavior (Engagement)**: item_viewed and scroll_depth_reached on the product page as engagement signals; promotion_viewed and promotion_clicked give the Engagement module the quality of internal merchandising.
- **Session Replay**: every event is recorded as a jump-point on the timeline; the analyst sees the moment of purchase_failed or remove_from_cart directly on the replay bar and follows where the user got stuck (a shipping field, an unexpected shipping cost, a gateway error).
- **AI Insights**: events plus auto-properties are the model's raw input; an automatic combined insight such as "mobile users coming from Instagram have 2x the cart abandonment rate" is built from crossing device_type/session_referrer with add_to_cart and purchase; plus a real-time Persian recommendation when E-commerce tab metrics (CVR/Revenue/AOV/Payment Failure) cross their threshold.

---


#### Pack 7 — Advertising

This pack is the official owner of the display advertising lifecycle and inventory management in Shahin: from the moment the SDK sends a request to fill a slot to the ad server/SSP, through recording the impression, viewability, click and reported revenue. Its goal is to give publishers a complete picture of monetization health: Fill Rate, Viewability, vCTR, eCPM/RPM and wasted inventory. One key reconciliation decision lives here: in-stream video ad playback is not owned by this pack and goes to the MEDIA family with `placement=ad`; this pack owns only the display/inventory lifecycle and reward granting.

##### Owned events
- Event `ad_slot_requested` — the ad SDK sends a request to the ad server/SSP to fill a slot; the start of the inventory lifecycle and the basis of Fill Rate and the Auction Funnel<br>Required fields: slot_id · Implementation: requires site code
- Event `ad_filled` — the ad server returned a creative for the slot request (the slot was filled), linked to the request_id<br>Required fields: slot_id · Implementation: automatic from auto-properties
- Event `ad_not_filled` — the slot request got no creative (no-fill / unsold); the denominator of Fill Rate and the basis of Wasted Inventory<br>Required fields: slot_id · Implementation: automatic from auto-properties
- Event `ad_impression` — the creative successfully rendered and loaded on the page (regardless of being seen); the base counter of Viewability and eCPM<br>Required fields: slot_id · Implementation: automatic from auto-properties
- Event `ad_viewed` — the creative was seen in the viewport per the IAB standard (50% of pixels for ≥1s display, ≥2s video); the numerator of Viewability and vCTR<br>Required fields: slot_id · ✓ funnel goal step · Implementation: requires site code
- Event `ad_clicked` — the user clicked a display creative; the numerator of vCTR, separate from the in-stream video click<br>Required fields: slot_id · ✓ funnel goal step · Implementation: automatic from auto-properties
- Event `ad_revenue_recorded` — revenue reported by the ad server/SSP per impression or click was recorded; the basis of RPM/eCPM (Shahin does not generate revenue; the number comes from the SSP)<br>Required fields: slot_id, revenue_amount, currency · ✓ funnel goal step · Implementation: requires a new field
- Event `ad_error` — an error loading or rendering the creative; the basis of Ad Error Rate (error_type ∈ pre_load, post_render, timeout, render_fail)<br>Required fields: slot_id · Implementation: automatic from auto-properties
- Event `ad_blocker_detected` — the Shahin SDK detected an AdBlocker in the session; the basis of AdBlocker Rate and this pack's auto-collected exception (unlike the others, it needs no site code)<br>No required fields · Implementation: automatic from auto-properties
- Event `ad_slot_refreshed` — an existing slot was refreshed for a new impression (auto-refresh or user-driven); used to separate refresh impressions from initial ones (refresh_trigger ∈ timer, user_action, viewport_reentry)<br>Required fields: slot_id · Implementation: requires site code
- Event `ad_lazy_loaded` — the slot was requested/rendered because it was approaching the viewport (lazy-load); used to separate above-fold from below-fold inventory<br>Required fields: slot_id · Implementation: requires site code
- Event `ad_closed` — the user closed a closable creative (interstitial / sticky / anchor); a signal of annoyance and placement quality<br>Required fields: slot_id · Implementation: requires site code
- Event `ad_reward_granted` — the user watched a rewarded ad to the end and received the reward; the incentive monetization model of freemium publishers (the video playback of that ad is recorded in the MEDIA family with placement=ad; this event is only the inventory reward grant)<br>Required fields: slot_id, reward_type · ✓ funnel goal step · Implementation: requires site code
- Event `house_ad_shown` — instead of a paid ad, a house/internal ad (house/backfill) rendered in the slot; used for the share of wasted inventory in Wasted Inventory<br>Required fields: slot_id · Implementation: requires site code

##### Referenced events (from the core or another pack — not defined here)
- Event `ads_video_started` ← Video pack (MEDIA family): video ad playback (pre/mid/post-roll, outstream) with placement=ad; the denominator of VTR in the Video Ad Completion widget.
- Event `ads_video_completed` ← Video pack (MEDIA family): 100% completion of a video ad; the numerator of VTR (CPCV) in the Video Ad Completion widget and a funnel goal step.
- Event `ads_video_skipped` ← Video pack (MEDIA family): skipping a skippable video ad; the skip rate in the Video Ad Completion widget.
- Event `video_progress` ← Video pack (MEDIA family): the 25/50/75 milestones of a video ad (placement=ad, VAST quartiles); quartile drop-off in the VTR chart.
- Event `ads_video_clicked` ← Video pack (MEDIA family): a click on an in-stream video ad (separate from this pack's display `ad_clicked`); used in video-ad engagement analysis.
- Event `consent_updated` ← core (owner: Authentication): the consent state for personalized ads; Advertising references it with the domain param consent_scope (ad-specific) to separate personalized from non-personalized inventory and its effect on RPM.
- Event `shahin_page_view` ← core: automatic; the denominator of Page RPM in the eCPM/RPM card.
- Event `shahin_session_start` ← core: automatic; the denominator of Session RPM and of AdBlocker Rate (unique count of session_id).

##### Custom Event candidates
- Event `ad_sponsorship_takeover_viewed`: a brand takeover (skin/wallpaper) is a direct site-to-brand contract; it has no standard slot structure and does not come from the ad server, so Shahin cannot know the schema in advance (suggested schema: sponsor_id, campaign_id, placement_zone {header|sidebar|skin}, start_date, end_date).
- Event `native_widget_recommendation_clicked`: a native content widget (Taboola-style) has an item/slot structure specific to each site and network, and no fixed field can be defined (suggested schema: widget_id, item_position, item_type {sponsored|organic}, provider, revenue_share).
- Event `affiliate_link_clicked`: affiliate revenue is a side monetization model that depends on each site's link structure and program, and has no impression/slot (suggested schema: merchant_id, program_id, link_id, commission_model {cpa|cps}, placement).
- Event `paywall_ad_swap_shown`: the business decision "show a rewarded ad instead of the paywall" is product logic specific to each publisher and depends on the subscription state/article count, which Shahin does not know about (suggested schema: trigger_rule, article_count_in_session, swap_offer_type).

##### Shown in the Ads dashboard
- **KPI card — Fill Rate (slot fill rate)** — percentage of requests filled with a creative: ad_filled relative to the sum of ad_filled and ad_not_filled — Source: ad_filled, ad_not_filled, ad_slot_requested — Type: KPI card with sparkline
- **KPI card — Viewability Rate** — share of rendered impressions that were seen in the viewport: ad_viewed relative to ad_impression — Source: ad_viewed, ad_impression — Type: KPI card with gauge
- **KPI card — vCTR** — click rate relative to viewed impressions: ad_clicked relative to ad_viewed — Source: ad_clicked, ad_viewed — Type: KPI card
- **KPI card — eCPM / Page RPM / Session RPM** — total reported revenue times one thousand, divided by the number of impressions, page views and session starts (respectively) — Source: ad_revenue_recorded, ad_impression, shahin_page_view, shahin_session_start — Type: three sibling KPI cards with a toggle
- **KPI card — Ad Error Rate** — ratio of ad_error to ad_impression (or ad_slot_requested), broken down by error_type — Source: ad_error, ad_impression, ad_slot_requested — Type: KPI card with breakdown badge
- **Chart — Auction Funnel Waterfall** — stepped drop-off requested → filled → impression → viewed → clicked, with the drop percentage at each step — Source: ad_slot_requested, ad_filled, ad_impression, ad_viewed, ad_clicked — Type: Waterfall / funnel chart
- **Chart — Wasted Inventory** — the gap between requested and revenue-generating inventory, broken down by cause (no-fill, house ad, error, adblock) — Source: ad_slot_requested, ad_not_filled, house_ad_shown, ad_error, ad_blocker_detected — Type: Gap area chart
- **Chart — AdBlocker Rate** — share of sessions with ad_blocker_detected out of all sessions (unique count of session_id) — Source: ad_blocker_detected, shahin_session_start — Type: Gauge
- **Treemap/table — Revenue and quality by slot** — for each slot_id / placement_type: total revenue, Fill Rate, Viewability and vCTR — Source: ad_revenue_recorded, ad_filled, ad_not_filled, ad_impression, ad_viewed, ad_clicked — Type: Treemap or sortable table
- **Chart — Video Ad Completion (VTR)** — ratio of ads_video_completed to ads_video_started, with quartile drop-off from video_progress (placement=ad) and the skip rate from ads_video_skipped — Source: ads_video_started, video_progress, ads_video_completed, ads_video_skipped — Type: Funnel / stacked bar
- **Advertising conversion rate (from the Report Builder funnel)** — a funnel with a chosen final step (e.g. `ad_clicked` or `ads_video_completed`) is built in Report Builder, and its rate is the conversion rate — Source: ad_revenue_recorded, ad_clicked, ad_viewed, ads_video_completed, ad_reward_granted — Type: rate card from the funnel

##### Presence in other Shahin services
- **Content / Behavior (Publisher Dashboard — Engagement)**: ad_impression and ad_viewed are recorded with the entity_id / entity_module / article_category auto-properties, so revenue and viewability map to the level of each article/category (Content Monetization).
- **User Journey**: the sequence ad_viewed → ad_clicked → exit, or ad_blocker_detected appearing at the start of the session, sits on the user's path; it shows where advertising pressure (back-to-back impressions, ad_closed on an interstitial) causes drop-off.
- **Session Replay**: every ad_viewed / ad_clicked / ad_closed / ad_error is recorded as a jump-point on the timeline; the analyst sees the user's behavior while a sticky/interstitial renders.
- **AI Insights**: automatic insights are produced from crossing auto-properties (device_type, session_referrer, country, city) with ad_revenue_recorded and ad_viewed (e.g. "mobile inventory from smaller cities has lower viewability but higher RPM") without manual slicing.
- **Analytics (Conversion / Funnel)**: ad_revenue_recorded and ad_clicked become the end point of a funnel in Funnel Builder, and the conversion rate is read from that funnel.
- **Real User Experience / Performance**: the Performance API auto-properties (page_load_time, content_load_time) sit next to ad_slot_requested and ad_error so that the correlation "ad load delay ↔ viewability drop or error increase" can be measured without a new event.

---


#### Pack 8 — Authentication

This pack is the canonical owner of every identity success event in Shahin: sign-up, login, logout, password reset and change, MFA, email/phone verification, and the account lifecycle. Any site with a user account system uses this pack, and the other packs (Security, SaaS, Gaming, Mobile App, VOD, Marketplace, Travel, FinTech) only reference these definitions instead of redefining them.

Its other central role is identity resolution: at the very moment `sign_up` or `login` happens, the user's anonymous identifier (anonymous_id) is stitched to `user_id`, and pre-auth and post-auth behavior become one; this is the stitching that makes the whole User Journey meaningful. This pack does not build a standalone report; it supplies the data for activation funnels, login security health, and account churn analysis.

##### Owned events
- Event `sign_up` — a successful, server-confirmed sign-up (not a button click); the GA4-reserved name is kept, old alias register_completed/account_created<br>Required fields: method, user_id · ✓ funnel goal step · Implementation: requires site code
- Event `login` — a successful, server-confirmed authentication; the GA4-reserved name is kept; the session_id is shared with mfa_challenge_completed and SSO so they can be deduplicated<br>Required fields: method · Implementation: requires site code
- Event `logout` — the user explicitly signing out of the account; logout_type = manual|all_devices|forced<br>Required fields: logout_type · Implementation: requires site code
- Event `consent_updated` — a change in the user's privacy/cookie consent (GDPR); this event gates tracking; Security and Advertising reference it<br>Required fields: consent_state · Implementation: automatic from auto-properties (standard cookie banner) / requires site code (custom CMP)
- Event `account_activated` — the account becomes usable after the required gate (email/phone verification or admin approval); distinct from sign_up; for products where activation is the real goal<br>Required fields: user_id, activation_method · ✓ funnel goal step · Implementation: requires site code
- Event `session_expired` — the token/session expired by the system; distinct from a deliberate logout; expiry_reason = idle_timeout|absolute_timeout|token_revoked<br>Required fields: expiry_reason · Implementation: requires site code
- Event `session_refreshed` — a silent, successful token refresh (advanced); used to separate truly active sessions from DAU inflation<br>Required fields: refresh_method · Implementation: requires site code
- Event `password_reset_requested` — the user requests a password reset link/code; the requested→completed pair is the key drop-off funnel; method = email|sms<br>Required fields: method · Implementation: requires site code
- Event `password_reset_completed` — the password reset finished successfully; a "rescued user", a soft churn-prevention conversion<br>Required fields: method · ✓ funnel goal step · Implementation: requires site code
- Event `password_changed` — a password change by an authenticated user (not a reset); forced=true for a password-expiry policy<br>Required fields: user_id · Implementation: requires site code
- Event `credential_added` — adding a passkey/recovery email/recovery phone/security key; credential_type = passkey|recovery_email|recovery_phone|security_key (the api_key value was removed; its owner is API Analytics)<br>Required fields: credential_type · Implementation: requires site code
- Event `credential_removed` — removing a credential from the account<br>Required fields: credential_type · Implementation: requires site code
- Event `mfa_enrolled` — the user enables a second factor; in security-led products, the security-posture conversion; mfa_method = totp|sms|email|push|hardware_key|biometric<br>Required fields: mfa_method · ✓ funnel goal step · Implementation: requires site code
- Event `mfa_disabled` — removing the second factor (security-sensitive, alert-worthy); actor = self|admin<br>Required fields: mfa_method, actor · Implementation: requires site code
- Event `mfa_challenge_shown` — an MFA challenge is shown at login or for a sensitive action; context = login|sensitive_action; the shown→completed funnel is the MFA friction<br>Required fields: mfa_method · Implementation: requires site code
- Event `mfa_challenge_completed` — successfully passing the MFA challenge; session_id shared with login<br>Required fields: mfa_method · Implementation: requires site code
- Event `recovery_code_used` — a backup recovery code was used<br>Required fields: none (all fields optional: remaining_codes, user_id) · Implementation: requires site code
- Event `verification_started` — the start of an email/phone/identity verification flow; verification_type = email|phone|document|kyc|age (this event is generic, not the KYC terminal)<br>Required fields: verification_type · Implementation: requires site code
- Event `verification_message_sent` — sending the verification email/SMS (including resend); attempt_number/cooldown_sec expose silent deliverability problems that kill activation<br>Required fields: verification_type · Implementation: requires site code
- Event `verification_completed` — email/phone/identity verified successfully; the gate for real accounts; the default conversion for email/phone<br>Required fields: verification_type · ✓ funnel goal step · Implementation: requires site code
- Event `verification_failed` — a wrong/expired code or a rejection; failure_reason = expired_code|wrong_code|document_rejected|max_attempts (KYC rejection is separate → FinTech kyc_rejected)<br>Required fields: verification_type, failure_reason · Implementation: requires site code
- Event `sso_initiated` — the start of the redirect to the IdP; connection_type = saml|oidc; the initiated→completed gap catches a misconfigured IdP in B2B<br>Required fields: provider, connection_type · Implementation: requires site code
- Event `sso_login_completed` — a successful B2B federated login; fires together with login with a shared session_id for deduplication; is_jit_provisioned means the account was created on the spot; the B2B activation signal<br>Required fields: provider, org_id · ✓ funnel goal step · Implementation: requires site code
- Event `social_account_linked` — linking a Google/Apple/… account to an existing account; provider uses the shared method vocabulary<br>Required fields: provider · Implementation: requires site code
- Event `social_account_unlinked` — unlinking a social account<br>Required fields: provider · Implementation: requires site code
- Event `profile_updated` — a change in the profile's identity attributes; fields_changed array = name|avatar|email|phone|locale<br>Required fields: fields_changed · Implementation: requires site code
- Event `email_changed` — a change of the account email (sensitive; usually requires re-verification); only hashes, never the raw email<br>Required fields: old_email_hash, new_email_hash · Implementation: requires site code
- Event `account_deleted` — permanent deletion of the account at the user's request; deletion_reason is a churn and win-back signal; a key negative event, non-conv<br>Required fields: user_id · Implementation: requires site code
- Event `account_deactivated` — a reversible suspension of the account; actor = self|admin|system<br>Required fields: actor · Implementation: requires site code
- Event `account_reactivated` — restoring a suspended account (win-back within the grace period), a soft conversion; the canonical home of the Mobile App pack's reactivated event, which only references it<br>Required fields: actor · ✓ funnel goal step · Implementation: requires site code
- Event `account_locked` — a security lock on the account; lock_reason = too_many_attempts|suspicious_activity|admin_action<br>Required fields: lock_reason · Implementation: requires site code
- Event `account_unlocked` — unlocking the account<br>Required fields: none (all fields optional: actor, user_id) · Implementation: requires site code

##### Referenced events (from the core or another pack — not defined here)
- Event `onboarding_step_completed` ← core: the baseline for multi-step sign-up stages (flow_id=signup with step_name/step_index), replacing registration_step_completed; used in the dashboard's sign-up funnel
- Event `form_started` ← core: the top-of-funnel sign-up intent (focus on the first field, form_id=signup_form), replacing registration_started; the input to the Signup Funnel
- Event `login_failed` ← Security pack: the failure twin; the "Login security health" widget builds the login failure rate and the breakdown by failure_reason (one of the 14 duplicates collapsed into the single Security owner)
- Event `mfa_challenge_failed` ← Security pack: the failure twin; the "MFA adoption and friction" widget shows challenge failures next to shown/completed
- Event `kyc_approved` ← FinTech & Wallet pack: the KYC terminal; the "Identity verification / KYC funnel" widget shows the KYC approval rate and the conversion of regulated products
- Event `kyc_rejected` ← FinTech & Wallet pack: the KYC rejection twin; used in the denominator of the KYC widget's approval rate
- Event `api_key_created` ← API Analytics pack: credential_type=api_key was split off from credential_added; if an auth dashboard wants API key creation, it references this event (no direct use in the current visualization)

##### Custom Event candidates
- Event `impersonation_started` / `impersonation_ended`: an admin/support user signing in "as" a user depends entirely on each site's role model and admin panel; Shahin does not know the trigger or the actor/target fields in advance, and it must be excluded from product analytics so it is not mixed up with the real user (note: in hub ownership, impersonation_* is owned by Security; this must be coordinated with Security) (suggested schema: impersonation_started { admin_user_id (identifier), target_user_id (identifier), reason (dimension), ticket_id (optional) } / impersonation_ended { duration_sec (metric) })
- Event `magic_link_requested` / `magic_link_consumed`: the passwordless flow is based on an email link whose UX and return path differ greatly from site to site (deep-link, same-device vs. cross-device), with each site's own token logic (suggested schema: magic_link_requested { method=email (dimension), email_hash (identifier) } / magic_link_consumed { time_to_consume_sec (metric), is_cross_device (dimension) })
- Event `passkey_registration_prompted`: showing a passkey-creation prompt is widget-driven and depends on each product's nudge strategy; the trigger cannot be standardized (the successful outcome is covered by credential_added with passkey) (suggested schema: passkey_registration_prompted { prompt_location (dimension), prompt_variant (dimension), outcome=shown|accepted|dismissed (dimension) })
- Event `device_trust_decided`: the trusted-device decision is entirely specific to each authentication system; there is no general trust-policy vocabulary (suggested schema: device_trust_decided { decision=trust|dont_trust (dimension), trust_duration_days (metric), is_new_device (dimension) })
- Event `step_up_auth_required`: step-up for a sensitive action is tied to each product's map of sensitive actions; which action requires step-up cannot be predefined (part of the value is recovered through mfa_challenge_shown with context=sensitive_action; acceptable as a system-state event, with naming to be reviewed in phase 2) (suggested schema: step_up_auth_required { protected_action (dimension), method (dimension), outcome=passed|failed|abandoned (dimension) })

##### Shown in the User Analytics dashboard
- **Signup Funnel** — pass-through rate of each step = users at the next step ÷ users at the previous step; total drop = sign_up ÷ form_started — Source: form_started, onboarding_step_completed, verification_completed, account_activated — Type: funnel
- **Login and sign-up trend** — daily count of successful logins and new sign-ups over time — Source: login, sign_up — Type: time-series line
- **Auth Method Mix** — share of each method among all successful logins/sign-ups — Source: login, sign_up, sso_login_completed — Type: stacked bar / donut
- **Login Security health** — login failure rate = login_failed ÷ (login + login_failed); breakdown by failure_reason; new-device login rate = is_new_device=true ÷ login — Source: login_failed, login, account_locked — Type: stacked bar by failure_reason + KPI tiles
- **Password reset funnel** — reset completion rate = password_reset_completed ÷ password_reset_requested; average time_to_complete_sec — Source: password_reset_requested, password_reset_completed — Type: funnel + KPI
- **MFA adoption and friction** — MFA adoption rate = users with mfa_enrolled ÷ active users; friction = mfa_challenge_completed ÷ mfa_challenge_shown; the mfa_disabled trend as a warning — Source: mfa_enrolled, mfa_challenge_shown, mfa_challenge_completed, mfa_challenge_failed, mfa_disabled — Type: gauge + funnel
- **Identity verification / KYC funnel** — verification rate = verification_completed ÷ verification_started; KYC approval rate = kyc_approved ÷ (kyc_approved + kyc_rejected); average time_to_verify_sec; resend rate from verification_message_sent with attempt_number>1 — Source: verification_started, verification_message_sent, verification_completed, verification_failed, kyc_approved, kyc_rejected — Type: funnel + bar
- **Session lifecycle** — ratio of deliberate logouts to system expiries = logout ÷ session_expired; average session_duration_sec; breakdown by expiry_reason — Source: logout, session_expired, session_refreshed — Type: donut + histogram
- **Account lifecycle and churn** — net deletions = account_deleted − account_reactivated in the period; distribution of deletion_reason; win-back rate = account_reactivated ÷ account_deactivated — Source: account_deleted, account_deactivated, account_reactivated — Type: bar + reason breakdown
- **Auth conversion rate (from the Report Builder funnel)** — for each goal step (sign_up, account_activated, verification_completed, kyc_approved, mfa_enrolled) a funnel with that same final step is built in Report Builder, and its rate is the conversion rate — Source: sign_up, account_activated, verification_completed, kyc_approved, mfa_enrolled — Type: KPI tiles with the rate from the funnel
- **Anonymous→known user Identity Resolution** — percentage of pre-auth sessions that were linked to a user_id after login/sign_up (the stitching rate from anonymous_id to user_id) — Source: login, sign_up — Type: KPI + Sankey

##### Presence in other Shahin services
- **User Journey / Behavior**: attaches the auth time sequence to product behavior, e.g. the chain form_started → verification_completed → the first key action, or sign_up → repeated login for retention; the identity-resolution rule that stitches anonymous_id to user_id at the first sign_up/login unifies pre-auth and post-auth behavior
- **Session Replay**: every auth event is recorded as a jump-point on the timeline; the analyst sees exactly the moment of login_failed or mfa_challenge_shown and follows where the user got stuck or why they abandoned the form
- **AI Insights**: automatically crossing auto-properties with auth events builds insights, e.g. "mobile users coming from Telegram have twice the sign_up rate" from session_referrer×device_type×sign_up, or detecting an abnormal login_failed pattern from a particular isp_asn/country as a credential-stuffing signal
- **Analytics (Traffic/Acquisition)**: by building a funnel whose final step is sign_up or verification_completed, the conversion rate per slice (utm_source, referrer_type, campaign) is read from the Report Builder funnel, and the marketer sees which channel produces activated accounts
- **Content**: indirectly; once user_id is attached to content events after login, the Content reports can separate content consumption by authenticated vs. anonymous users (e.g. viewing paywalled content by an account holder vs. a guest)


---


#### Pack 9 — Subscription / Paywall

This pack is the canonical owner of the entire subscription lifecycle (SUBSCRIPTION lifecycle) and the trial lifecycle in Shahin: from the moment the user hits the paywall through purchase, renewal, upgrade, downgrade, cancellation and expiry. Other services such as SaaS, VOD and Article only reference these events and do not define them again.

The role of this pack is to build the two main pillars of the Revenue dashboard: the paywall→pay conversion funnel and the MRR movement decomposition (growth, contraction and churn). Every metric is built only from data that actually exists (unique user counts, `plan_price`/`currency`, and the price difference between plans), and there is no rial-loss formula or hypothetical revenue estimate involved.

##### Owned events
- Event `paywall_viewed` — the user reached locked content/a locked capability and the paywall rendered (an impression, not a click)<br>Required fields: paywall_id, paywall_type, product_context · Implementation: requires site code
- Event `paywall_dismissed` — the user closed the paywall without acting (close/X, clicking outside, back); a friction signal<br>Required fields: paywall_id, product_context · Implementation: requires site code
- Event `plan_viewed` — the plan selection (pricing) page or modal was shown<br>Required fields: plan_id, product_context · Implementation: requires site code
- Event `plan_selected` — the user chose a specific plan from the options (before starting payment)<br>Required fields: plan_id, product_context · Implementation: requires site code
- Event `subscription_started` — the subscription purchase completed successfully (a successful gateway callback); the terminal success and the canonical revenue event, replacing the old `subscription_completed`<br>Required fields: subscription_id, plan_id, plan_price, currency, previous_status, product_context · ✓ funnel goal step · Implementation: requires site code
- Event `subscription_failed` — an attempt to buy/renew the subscription failed (gateway decline, insufficient funds, card error); it is an attempt, not churn<br>Required fields: plan_id, failure_reason, product_context · Implementation: requires site code
- Event `subscription_renewed` — the subscription period was renewed successfully (auto-renew or manual); a retention/MRR-retained metric in the waterfall, not a conversion (the conflict with VOD was resolved in favor of non-conv; a per-workspace toggle is allowed)<br>Required fields: subscription_id, plan_id, plan_price, currency, product_context · Implementation: requires site code
- Event `subscription_upgraded` — the user upgraded to a more expensive plan (expansion MRR)<br>Required fields: subscription_id, plan_id, plan_price, previous_plan_price, currency, product_context · ✓ funnel goal step · Implementation: requires site code
- Event `subscription_downgraded` — the user downgraded to a cheaper plan (contraction MRR); a negative revenue effect, never a positive conversion<br>Required fields: subscription_id, plan_id, plan_price, previous_plan_price, currency, product_context · Implementation: requires site code
- Event `subscription_cancelled` — the user voluntarily cancelled an active subscription (voluntary churn), usually cancelling auto-renew until the end of the period; a negative revenue effect, never a positive conversion<br>Required fields: subscription_id, plan_id, product_context · Implementation: requires site code
- Event `subscription_reactivated` — a user who had previously cancelled/expired reactivated the subscription (win-back, reactivation MRR)<br>Required fields: subscription_id, plan_id, plan_price, currency, product_context · ✓ funnel goal step · Implementation: requires site code
- Event `subscription_expired` — the subscription expired without renewal (involuntary/passive churn: a gateway failure or no auto-renewal), usually server-derived<br>Required fields: subscription_id, plan_id, product_context · Implementation: requires site code
- Event `subscription_paused` — the user temporarily paused the subscription (pause/hold) instead of cancelling it entirely<br>Required fields: subscription_id, plan_id, product_context · Implementation: requires site code
- Event `subscription_resumed` — a paused subscription became active again<br>Required fields: subscription_id, plan_id, product_context · Implementation: requires site code
- Event `trial_started` — the user started a trial period (a top-of-funnel micro-conversion)<br>Required fields: trial_id, plan_id, trial_duration_days, product_context · ✓ funnel goal step · Implementation: requires site code
- Event `trial_converted` — the trial turned into a paid subscription (the first successful payment after the trial), the terminal conversion for the trial-led path<br>Required fields: trial_id, subscription_id, plan_id, plan_price, currency, product_context · ✓ funnel goal step · Implementation: requires site code
- Event `trial_expired` — the trial ended without converting to paid, usually server-derived<br>Required fields: trial_id, plan_id, product_context · Implementation: requires site code
- Event `subscription_checkout_started` — the user started the subscription purchase process (checkout start before the callback), a funnel step; it replaces `subscription_initiated` and was explicitly made non-conv so it is not double-counted with subscription_started<br>Required fields: plan_id, plan_price, currency, product_context · Implementation: requires site code
- Event `offer_viewed` — a subscription offer/discount (intro offer, win-back, seasonal) was shown to the user; the offer layer is owned by this pack<br>Required fields: offer_id, product_context · Implementation: requires site code
- Event `offer_applied` — the user applied a subscription discount code/offer; distinct from the commercial `coupon_applied` and specific to the subscription lifecycle<br>Required fields: offer_id, product_context · Implementation: requires site code
- Event `billing_info_updated` — the user updated the subscription's payment method/card (a dunning recovery signal)<br>Required fields: subscription_id, product_context · Implementation: requires site code
- Event `manage_subscription_viewed` — the user opened their subscription management/settings page (an early churn warning signal)<br>Required fields: subscription_id, product_context · Implementation: requires site code (a light URL-based version can be derived from `page_url`/`entity_module`; the rich version with subscription_id needs code)

##### Referenced events (from the core or another pack — not defined here)
- Event `payment_info_submitted` ← core: the deepest pre-purchase step in the subscription funnel; owner = E-commerce (COMMERCE family) and a funnel goal step (canonical). This pack's raw version was turned into this reference so it is not redeclared.
- Event `cta_clicked` ← core: a click on a subscription/upgrade CTA anywhere on the site; the core version with the `placement` parameter replaced `subscription_cta_clicked` and is used as the top-of-funnel input to the paywall.
- Event `search_submitted` ← core: the first step of the user's path to subscription in the cross-service widgets (User Journey); owner = Search & Discovery.
- Event `item_viewed` ← Search & Discovery pack: viewing content/an article before hitting the paywall, in the narrative of the path to subscription (LIST/ITEM family with `item_type=article`); replaces the generic `article_viewed` in the cross_service layer.

##### Custom Event candidates
- Event `gift_subscription_sent`: a gift subscription is an optional commercial flow that only some publishers have; the recipient/sender schema and the redemption state differ completely from site to site and cannot be predefined generically (suggested schema: gift_id (id, required) · plan_id · plan_price · currency · recipient_ref a non-PII identifier · redemption_status: sent|redeemed|expired)
- Event `metered_limit_reached`: the metered paywall model (e.g. "3 free articles a month") and its thresholds depend entirely on each publisher's logic; the threshold, reset window and counting unit cannot be predefined (suggested schema: meter_id · articles_consumed metric · meter_limit metric · reset_window dimension · content_category)
- Event `cancellation_survey_submitted`: the questions and options of the cancellation survey (off-boarding survey) are entirely specific to each site, and the question/answer structure is not fixed; although the basic `cancel_reason` is on `subscription_cancelled`, the full survey is bespoke (suggested schema: survey_id · subscription_id · reason_code dimension · free_text_present bool · save_offer_shown bool)
- Event `save_offer_accepted`: the "retention offer" flow (deflection / retention offer) shown at cancellation is a custom capability; the offer type and display logic differ between sites (suggested schema: save_offer_id · subscription_id · offer_type: discount|pause|downgrade · outcome: accepted|declined · discount_percent)
- Event `paywall_variant_assigned`: paywall A/B tests and variant names belong to each site's internal testing system; the experiment name and bucket cannot be predefined and should be custom dimensions (suggested schema: experiment_id · variant_id · paywall_id, or a mapping to `segment_n_name`/`segment_n_value` instead of a separate event)

##### Shown in the Revenue dashboard
- **Subscription Funnel** — transition rate of each step = unique users reaching step n ÷ users at step n-1, with user-based attribution and a 7-day window — Source: paywall_viewed, subscription_checkout_started, payment_info_submitted, subscription_started — Type: Horizontal Funnel with the drop-off at each step
- **MRR Movement Decomposition** — Net New MRR = (New + Expansion + Reactivation) − (Contraction + Churned); New from `subscription_started` with previous_status in none/trial, Expansion from upgrade, Reactivation from reactivated, Contraction from downgrade, Churned from cancelled + expired — Source: subscription_started, subscription_upgraded, subscription_reactivated, subscription_downgraded, subscription_cancelled, subscription_expired, subscription_renewed — Type: monthly Waterfall / Bridge Chart
- **Subscription conversion rate KPI card** — unique users with subscription_started ÷ unique users with paywall_viewed × 100 (7-day window), next to the conversion-rate column number per §5.4 — Source: paywall_viewed, subscription_started — Type: KPI Card with trend sparkline and a color threshold
- **Trial→Paid funnel** — Trial→Paid Rate = trial_converted ÷ trial_started (only ended trials in the denominator), complement = trial_expired — Source: trial_started, trial_converted, trial_expired — Type: two-step Funnel + KPI Card
- **Churn rate and churn-type breakdown** — Churn Rate = subscribers churned in the period ÷ active subscribers at the start of the period, separating voluntary (cancelled) from passive/gateway (expired) — Source: subscription_cancelled, subscription_expired, subscription_renewed — Type: Stacked Bar (voluntary vs. involuntary) + trend Line
- **Offer effectiveness and intro cohort** — Offer Conversion = subscription_started with an offer_id ÷ offer_viewed; Intro→Full Retention = those converted to full price ÷ intro subscribers — Source: offer_viewed, offer_applied, subscription_started, subscription_renewed — Type: Cohort Grid + Bar comparing offers
- **Early churn warning signal (Pre-cancel intent)** — rate of subscription management views leading to cancellation = subscription_cancelled with a prior manage_subscription_viewed ÷ all manage_subscription_viewed — Source: manage_subscription_viewed, subscription_cancelled, billing_info_updated — Type: small Funnel + save-rate KPI
- **Failed payment recovery (Dunning / involuntary recovery)** — recovery rate = (subscription_renewed or billing_info_updated after subscription_failed) ÷ subscription_failed — Source: subscription_failed, billing_info_updated, subscription_renewed, subscription_expired — Type: three-step Funnel failed → recovered → expired
- **Subscription conversion rate (from the Report Builder funnel)** — a funnel is built in Report Builder for each goal step, and the conversion rate per campaign/source is read from that funnel — Source: subscription_started, trial_converted, trial_started, subscription_upgraded, subscription_reactivated — Type: rate card from the funnel + Trend Line

##### Presence in other Shahin services
- **Behavior / User Journey**: the time sequence of events builds the path to subscription (search_submitted → item_viewed → paywall_viewed → subscription_checkout_started → subscription_started) and shows where in the paywall→pay funnel drop-off happens; also the path leading to cancellation (manage_subscription_viewed → cancel).
- **Session Replay**: every event is recorded as a jump-point on the timeline; the analyst sees the moment of paywall_viewed or subscription_failed on the replay bar and follows how long the user looked at the paywall and why they dismissed/abandoned it, the qualitative context behind the funnel numbers.
- **AI Insights**: automatically crossing the pack's events with auto-properties builds insights without predefinition, e.g. "mobile users coming from Telegram have 3x the subscription conversion rate" from session_referrer × device_type × subscription_started, or discovering which plan_id has the most early churn (low tenure_days).
- **Content / Behavior (Engagement)**: paywall_viewed with the entity_id/entity_taxonomy_id auto-property shows which category/article produces the most paywall hits and the highest conversion rate, i.e. which content actually "creates subscriptions"; a bridge between content quality and revenue.
- **Analytics (Traffic / Acquisition)**: by building a funnel whose final step is subscription_started or trial_started, the conversion rate per source/campaign/UTM is read from the Report Builder funnel (from the utm_* and session_referrer auto-properties); the marketer sees which campaign brings the most subscriptions, not the most clicks.

---


#### Pack 10 — Navigation & Forms

This pack is Shahin's "platform interaction floor": the basic behaviors that happen on any page regardless of content type, namely scrolling, link clicks, exits to an external domain, file download/upload, and the form fill-and-submit cycle. On top of that, the pack is the canonical owner of two key experience-quality signals that won the ownership-conflict resolution: user-facing error display (`error_shown`) and empty-state display (`empty_state_viewed`). The role of the UX dashboard is to turn these signals into a friction map of navigation and forms; the initial 36 raw events were condensed into 10 genuine owned events to prevent duplication and double counting.

##### Owned events
- Event `scroll_depth_reached` — the user reaches the 25%/50%/75%/90%/100% scroll threshold of the page (one event per milestone)<br>Required fields: depth_percent · Implementation: automatic from auto-properties (toggle; the SDK knows the viewport/document height, page_path comes from page_url)
- Event `outbound_click` — a click on a link whose destination domain differs from the site's domain<br>Required fields: outbound_domain, url · Implementation: automatic from auto-properties (toggle; being outbound is detected automatically; affiliate/metasearch sites can toggle it to a Conversion per workspace)
- Event `link_clicked` — a click on any internal `<a>` link (distinct from outbound_click)<br>Required fields: link_url, link_text · Implementation: automatic from auto-properties (base-level DOM autocapture, toggle; outbound links go to outbound_click)
- Event `file_download` — a click on a link with a downloadable file extension (pdf/zip/xlsx/docx/…)<br>Required fields: file_type, file_name · ✓ funnel goal step · Implementation: automatic from auto-properties (toggle; automatic extension detection; the GA4-aligned name is kept, not file_downloaded; file_size_kb only if the server provides Content-Length)
- Event `file_uploaded` — selecting/uploading a file via `<input type=file>`<br>Required fields: file_type, file_size · Implementation: automatic from auto-properties (partial: change on the file input and the File API; the file name is not recorded; final server-side confirmation of success sometimes requires site code. Ownership conflict resolved: Nav&Forms is the owner, the SaaS pack only references it)
- Event `form_started` — the user focuses/edits the first field of a form<br>Required fields: form_id · Implementation: automatic from auto-properties (toggle; form_id is derived from id/name/action; house style: form_start→form_started)
- Event `form_submitted` — a form being submitted (the browser submit event)<br>Required fields: form_id · The common goal step of the lead/demo funnel (chosen as the final step in the Report Builder funnel) · Implementation: automatic from auto-properties (toggle; time_to_complete from the difference with form_started; the exact server-side outcome sometimes requires site code; house style: form_submit→form_submitted)
- Event `error_shown` — displaying a logical/validation application error visible to the user (page/banner/inline), distinct from a JavaScript error (`shahin_client_error`)<br>Required fields: error_type, error_code, screen · Implementation: requires site code (the site announces the moment a user-facing error is shown; this pack is the owner of this event)
- Event `empty_state_viewed` — displaying an empty state (cold-start/no data) to the user; distinct from search_no_results (the empty result of a typed search)<br>Required fields: surface_type, screen_name, reason · Implementation: requires site code (detecting an "empty state" needs the site to mark it; an important signal of new-user drop-off. The ownership conflict with three packs was resolved in favor of the canonical)

##### Referenced events (from the core or another pack — not defined here)
- Event `cta_clicked` ← core: for the conversion rate widget (from the funnel) and the CTA click KPI; the core has the canonical version with the cta_id/cta_label/placement parameters, and this pack does not redeclare it (the raw cta_label/cta_placement fields map to the canonical fields)
- Event `search_submitted` ← core (owner: Search & Discovery): for the cross-pack funnel (search_submitted → article_viewed → form_submitted) and the search engagement signal; the generic "search" version is only referenced here
- Event `search_no_results` ← core (owner: Search & Discovery): to separate the empty result of a typed search from empty_state_viewed in the empty-states dashboard
- Event `share` ← core: in case the UX dashboard shows content sharing as an interaction; the core has the canonical version (the GA4-reserved name "share") with share_channel/content_id/entity_type, and this pack does not redeclare it
- Event `item_list_filtered` ← core (owner: Search & Discovery): in case the UX dashboard shows filter behavior; this pack references the canonical of the LIST/ITEM browse family and does not define it again
- Event `shahin_page_view` ← core (system event): used as the denominator of the slow-load rate and the session-level conversion rate

##### Custom Event candidates
- Event `wizard_step_navigated`: a multi-step wizard flow has a structure and step names entirely specific to the site; Shahin does not know the step names/order in advance (suggested schema: `wizard_step_navigated { wizard_name:string req, step_number:int req, step_name:string, direction:enum(forward|backward), time_on_step_sec:number }`)
- Event `map_interaction`: interacting with an interactive map widget is specific to each site's implementation; to comply with the naming_rule, normalizing the name to `map_interacted` (object_action + past tense) has been proposed (suggested schema: `map_interaction { interaction_type:enum(zoom|pan|marker_click|layer_toggle) req, marker_id:string, zoom_level:int }`)
- Event `drag_drop_reordered`: drag-and-drop reordering is tied to the site's own data model (suggested schema: `drag_drop_reordered { list_name:string req, item_id:string, from_index:int, to_index:int }`)
- Event `inline_edit_saved`: in-place field editing happens on site-specific entities (suggested schema: `inline_edit_saved { entity_type:string req, field_name:string req, edit_duration_sec:number }`)
- Event `multi_step_form_step_completed`: long multi-page forms have their own step structure; the generic `form_submitted` only sees the whole form (suggested schema: `multi_step_form_step_completed { form_id:string req, step_number:int req, step_name:string, fields_in_step:int }`)
- Event `custom_widget_interacted`: the site's native widgets (installment calculator, configurator) have no generic equivalent; this is also the home of internal component UI-state events (menu/tab/modal/accordion/tooltip) (suggested schema: `custom_widget_interacted { widget_name:string req, action:string req, value:string }`)

> Note: the frustration/heuristic signals (`rage_click_detected`, `dead_click_detected`, `back_navigation`) and the user preference toggles (`language_changed`, `theme_changed`, `view_mode_changed`) are not canonical in the core and come in as custom events; `slow_load_detected` is derived from the Performance API and belongs to the RUM/Performance pack, not Nav&Forms.

##### Shown in the UX dashboard
- **Form Funnel** — pass-through rate of each step = count at the next step ÷ the previous step; the chain form_started → form_submitted (intermediate field steps from the custom multi_step_form_step_completed or blur autocapture) — Source: form_started, form_submitted — Type: stepped horizontal Funnel
- **Form abandonment rate** — abandonment rate = form_started without form_submitted ÷ form_started; form_abandoned is computed as a derived metric (not a separate event) — Source: form_started, form_submitted — Type: horizontal Bar
- **Form field error map** — form error rate = error_shown with error_type=validation ÷ form_started, for each form_id/field; broken down by error_type — Source: error_shown, form_started — Type: Heatmap / Stacked bar
- **Form completion time** — median time_to_complete_sec of successful forms; the distribution for detecting friction — Source: form_submitted — Type: Histogram / Box plot
- **Page scroll depth** — percentage of sessions that reached each threshold (25/50/75/90/100); drop-off rate between thresholds by depth_percent — Source: scroll_depth_reached — Type: vertical Funnel / stepped Bar
- **Friction points (Frustration Signals)** — count of rage_click and dead_click per page_path (both custom); the pages with the most frustration at the top — Source: rage_click_detected, dead_click_detected — Type: horizontal Bar + heat cell
- **Navigation effectiveness** — distribution of clicks by link_text/nav (navigation from link_clicked autocapture); the pogo-stick rate from back_navigation (custom) — Source: link_clicked, back_navigation — Type: Treemap + pogo-stick rate KPI card
- **Perceived performance health** — slow-load rate = slow_load_detected ÷ shahin_page_view, by page_path and device_type (slow_load is custom) — Source: slow_load_detected — Type: time-trend Line + Bar by device
- **Empty states and user errors** — count of empty_state_viewed and error_shown per page; separated from search_no_results; correlation with subsequent drop-off — Source: empty_state_viewed, error_shown, search_no_results — Type: horizontal Bar
- **Outbound exits and downloads** — top outbound destinations by outbound_domain; top downloaded files by file_type — Source: outbound_click, file_download — Type: dual horizontal Bar
- **User preferences** — share of language_changed/theme_changed/view_mode (all custom); the dark/light and FA/EN ratio — Source: language_changed, theme_changed, view_mode_changed — Type: Donut / Stacked bar
- **Conversion display (overlay)** — conversion rate = sessions with a Conversion event ÷ all sessions; a rate column next to each traffic dimension; a non-retroactive warning is shown — Source: form_submitted, cta_clicked, file_download — Type: KPI card + rate column

##### Presence in other Shahin services
- **Behavior / User Journey**: the chain link_clicked → form_started → (abandonment) reveals the drop-off path; back_navigation (custom) shows the pogo-stick points. Cross-pack funnels such as search_submitted (Search) → item_viewed (Search) → form_submitted are built from here
- **Session Replay**: every event is a jump-point on the recording timeline; rage_click_detected/dead_click_detected (custom) and error_shown are the most important jump points; the analyst sees the moment of frustration or a field error on the replay bar
- **AI Insights**: crossing events with auto-properties builds automatic insights, e.g. the form abandonment rate (form_started/form_submitted × device_type × browser) or the correlation of slow_load (custom) with back_navigation, without manually defining a segment
- **Content / Engagement**: scroll_depth_reached and outbound_click feed the quality of content consumption; scroll depth complements article_read_depth (Article pack) and shows how far down the page the user went
- **Analytics (base traffic dashboards)**: when form_submitted/cta_clicked/file_download become Conversions, they fill the conversion-rate column next to each traffic dimension (UTM, device, page); outbound_click goes to the site-level exit/referral metrics


---


#### Pack 11 — Community

The Community pack is the heart of user-to-user social interaction in Shahin, and in the core it is the official owner of the engagement verb family (ENGAGEMENT verbs). That means the standard definition of verbs such as comment, reaction, follow, save and message is fixed here, and the other packs (Article, Podcast, VOD, Education, Marketplace) only reference it. Beyond the family verbs, this pack also owns the community-specific lifecycle: user-generated content (UGC) from posts and comments, group/forum membership, profile completion and the feed. Its ultimate goal is to measure community health, from the activation north star (`post_created`) to the Lurker/Contributor/Creator breakdown and conversation quality.

##### Owned events
- Event `comment_added` — a top-level comment/reply successfully posted on a post (target_type=post)<br>Required fields: comment_id, post_id, target_type · ✓ funnel goal step · Implementation: requires site code (the moment of a successful submit; target_author_id for the P2P ratio = requires a new field)
- Event `comment_replied` — a nested reply posted on another comment (a conversation thread)<br>Required fields: comment_id, post_id, parent_comment_id · ✓ funnel goal step · Implementation: requires site code (response_lag_sec for Time-to-First-Response; target_author_id = requires a new field)
- Event `comment_deleted` — a comment deleted by its author<br>Required fields: comment_id, post_id · Implementation: requires site code
- Event `reaction_added` — any reaction (like/emoji) recorded on a post or comment; one event with a property instead of a per-emoji event<br>Required fields: target_id, target_type, reaction_type · Implementation: requires site code (target_author_id = requires a new field)
- Event `reaction_removed` — removing a previous reaction (the symmetric pair of reaction_added, for the undo funnel)<br>Required fields: target_id, target_type · Implementation: requires site code
- Event `item_saved` — saving/bookmarking a post for later (item_type=post)<br>Required fields: item_id, item_type · ✓ funnel goal step · Implementation: requires site code (a high-intent signal)
- Event `item_unsaved` — removing a bookmark (the symmetric pair of item_saved, item_type=post)<br>Required fields: item_id, item_type · Implementation: requires site code
- Event `content_reported` — reporting a post or comment as a rule violation; a health/moderation signal (target_type=post|comment)<br>Required fields: target_id, target_type, reason · Implementation: requires site code (the basis of the Moderation gap that the dashboard PRD flagged for the next phase)
- Event `entity_followed` — following a social entity: another user (entity_type=user) or a subject/topic (entity_type=topic)<br>Required fields: entity_id, entity_type · Implementation: requires site code (a retention driver of the social graph; per conv_corrections it is an engagement signal, not a conversion)
- Event `entity_unfollowed` — unfollowing an entity (user or topic); the symmetric pair for social-graph churn<br>Required fields: entity_id, entity_type · Implementation: requires site code
- Event `message_sent` — sending a human-to-human direct message (DM) between members; a deep-engagement signal<br>Required fields: conversation_id · ✓ funnel goal step · Implementation: requires site code (Community owns human messages; the AI pack sends model messages under the separate name `ai_message_sent` so the names do not collide)
- Event `post_created` — successfully publishing a new post or topic (UGC specific to Community, outside the browse/engagement family)<br>Required fields: post_id, content_type · ✓ funnel goal step · Implementation: requires site code (the moment of a successful form submit; the community's north-star activation milestone)
- Event `post_edited` — editing a published post<br>Required fields: post_id · Implementation: requires site code
- Event `post_deleted` — a post deleted by its author (the symmetric pair of post_created)<br>Required fields: post_id · Implementation: requires site code
- Event `profile_completed` — a member completing their profile (avatar + bio + key fields); a social activation milestone<br>Required fields: completion_pct · ✓ funnel goal step · Implementation: requires site code
- Event `member_joined` — a user successfully joining a community/group/forum (not creating a global account, which belongs to Authentication)<br>Required fields: community_id · ✓ funnel goal step · Implementation: requires site code
- Event `member_left` — a member leaving a community/group (the symmetric pair of member_joined)<br>Required fields: community_id · Implementation: requires site code
- Event `mention_created` — a mention (@user) recorded inside a post or comment; a re-engagement driver<br>Required fields: target_user_id · Implementation: requires site code
- Event `feed_viewed` — the community feed being shown (home/following/hot); the denominator of feed quality<br>Required fields: feed_type · Implementation: requires site code (entry_point comes from auto-properties; feed_type requires site code)
- Event `composer_opened` — the post/comment composer opening; the denominator of the content creation funnel<br>Required fields: composer_type · Implementation: requires site code

##### Referenced events (from the core or another pack — not defined here)
- Event `item_viewed` ← core (owner: Search & Discovery): both post views and user profile views are collected on this core event, with item_type=post / item_type=user; Community uses it as the denominator of the Comment/Reaction/Follow rates and in the Lurker donut and the Viral Loop (without a discovery-driven referrer_surface = non-conv).
- Event `search_submitted` ← core (owner: Search & Discovery): community search (people/posts/topics) is the core search_submitted with search_context=community; Community only references it and, when implemented, uses the enriched version with search_id.
- Event `share` ← core (GA4-reserved, owner: the Nav&Forms floor): sharing a post = the core share event with entity_type=post and share_channel; the Viral Loop and Engagement Breakdown widgets feed from it. Share itself is not a goal step; the community funnel's goal steps are post_created/member_joined.

##### Custom Event candidates
- Event `badge_earned`: a badge/gamification system (identifier, type, threshold) is entirely specific to each forum/platform, and Shahin cannot predefine badge names and rules; it feeds the Community Kings card (suggested schema: badge_id [identifier, required], badge_name, badge_tier, trigger_action).
- Event `reputation_changed`: score/reputation, its unit and its gain-and-loss rules differ by forum engine, and no single schema can be predefined (suggested schema: user_id [identifier], delta [metric], new_total [metric], source: upvote|best_answer|badge|penalty).
- Event `answer_accepted`: the concept of an "accepted answer/best answer" exists only on Q&A sites and depends on that site's own question/answer data model (suggested schema: question_id [identifier, required], answer_id [identifier, required], responder_id, time_to_accept_sec [metric]).
- Event `poll_voted`: the option structure and the multi-choice behavior of an in-post poll widget are entirely custom, and poll_id/option_id are specific to each site's implementation (suggested schema: poll_id [identifier, required], post_id, option_id, is_multi_choice).
- Event `moderation_action_taken`: the moderation tool/panel, the action types (mute/ban/lock/pin/merge) and the roles are specific to each community; the PRD explicitly flags the Moderation dashboard as a "next-phase gap" (suggested schema: action_type [dimension, required], target_id [identifier, required], target_type, moderator_id, reason).
- Event `draft_abandoned`: detecting "the composer opened, text was typed, it was never published" needs each composer's own front-end logic (timeout/blur/navigate-away), and Shahin cannot detect the moment of abandonment generically (suggested schema: composer_type, char_typed [metric], time_in_composer_sec [metric], had_media).

##### Shown in the Community dashboard
- **KPI card — DAU/MAU Ratio** — daily unique active users ÷ monthly × 100; Active = any user with at least one Active Action — Source: post_created, comment_added, comment_replied, reaction_added — Type: KPI card with sparkline and week-over-week delta
- **KPI card — Post Create Rate** — count of post_created ÷ all sessions × 100 — Source: post_created — Type: KPI card with percentage change
- **KPI card — Comment Rate** — (comment_added + comment_replied) ÷ item_viewed[post] × 100 — Source: comment_added, comment_replied, item_viewed — Type: KPI card
- **KPI card — Reaction Rate** — reaction_added ÷ item_viewed[post] × 100 (after subtracting reaction_removed for net reactions) — Source: reaction_added, reaction_removed, item_viewed — Type: KPI card
- **KPI card — Follow Rate** — entity_followed[user] ÷ item_viewed[user] × 100 — Source: entity_followed, item_viewed — Type: KPI card with an absolute threshold < 2%
- **KPI card — Time to First Response** — average time between post_created and the first comment on the same post — Source: post_created, comment_added, comment_replied — Type: KPI card (minutes/hours)
- **Community Activity Trend** — daily volume of activity events over time (posts/comments/reactions/follows) — Source: post_created, comment_added, comment_replied, reaction_added, entity_followed — Type: multi-series Line chart
- **Engagement Breakdown** — the relative mix of interaction types in the range (share of posts/comments/replies/reactions/shares) — Source: post_created, comment_added, comment_replied, reaction_added, share — Type: Stacked bar chart
- **Activity Heatmap** — density of Active Actions by day of week × hour of day; the best time to publish — Source: post_created, comment_added, comment_replied, reaction_added — Type: Heatmap (7×24)
- **Lurker / Contributor / Creator Donut (70/20/10 model)** — split of unique users: Creator = at least one post_created; Contributor = comments/reactions without a post; Lurker = only viewing posts/the feed without any Active Action — Source: post_created, comment_added, comment_replied, reaction_added, item_viewed, feed_viewed — Type: three-part Donut chart
- **Community Kings (gamification)** — users ranked by the weighted total of Active Actions (richer if badge_earned/reputation_changed are sent) — Source: post_created, comment_added, comment_replied, reaction_added, entity_followed — Type: Leaderboard / Ranked list
- **Hottest Topics** — topics sorted by recent engagement volume (posts + comments + reactions grouped by topic_id) — Source: post_created, comment_added, reaction_added, entity_followed — Type: Compact ranked widget
- **Unanswered Posts (Discourse benchmark)** — count and list of posts that had a post_created but received no comment — Source: post_created, comment_added, comment_replied — Type: Specialty card with a counter + list
- **Create Funnel (content creation funnel)** — pass-through rate composer_opened → post_created; the drop = composer drop-off (enriched with the custom draft_abandoned) — Source: composer_opened, post_created — Type: Funnel chart
- **Viral Loop / sharing** — share rate = share[post] ÷ item_viewed[post]; broken down by share_channel — Source: share, item_viewed — Type: Bar chart by channel
- **Community conversion rate (from the Report Builder funnel)** — a funnel is built in Report Builder for each goal step, and its rate is the conversion rate; per conv_corrections, entity_followed/share are not goal steps, and the goal steps are post_created/member_joined/comment_added/message_sent/item_saved/profile_completed — Source: post_created, member_joined, comment_added, message_sent, item_saved, profile_completed — Type: rate card from the funnel + time trend

##### Presence in other Shahin services
- **Content (Content dashboard — Engagement module)**: reaction_added, comment_added and share[post] on posts that are official site content enrich the content-quality signal; the editor sees which content generated the most user conversation (UGC), not just views.
- **Behavior / User Journey (Engagement module)**: the time sequence of events builds the behavioral path to conversion; for example feed_viewed → item_viewed[post] → item_viewed[user] → entity_followed[user] shows through which path users reach a follow and where they drop off.
- **Session Replay**: every Community event is recorded as a jump-point on the timeline; the analyst sees on the replay bar the moment a composer_opened did not reach post_created (or the draft was abandoned) and follows the cause of the drop-off visually.
- **AI Insights**: crossing auto-properties (device_type, session_referrer, city) with engagement events builds automatic insights, such as "mobile users from Telegram follow three times more"; KPI alert thresholds also send context to the Claude API to generate a real-time Persian recommendation.
- **Analytics (global Traffic / Conversion)**: the goal steps (post_created, member_joined, message_sent…) become the end point of a funnel in Funnel Builder, and the conversion rate is read from that funnel per UTM campaign; you can see which campaign brought the most conversions to active community members.

---


#### Pack 12 — Education / LMS

This pack turns learner behavior across the whole learning cycle (from course discovery to enrollment, lesson consumption, quizzes and earning a certificate) into events. Its design logic is the same as the Content pack's (each lesson/course is a unit of content), but with a dedicated learning funnel and progress and academic-success signals. The backbone of the pack is thirteen LMS-specific owned events that have no canonical equivalent in the core; anything that already had a canonical in the core or other packs (course browsing, search, sharing, attachment download, following an instructor, lesson video, paid subscription) is referenced instead of being defined again.

##### Owned events
- Event `course_enrolled` — the user enrolled in a course (free or paid); the initial activation and the start of the learning funnel<br>Required fields: course_id · ✓ funnel goal step · Implementation: requires site code
- Event `course_started` — the first lesson of an enrolled course was opened; separates "enrolled" from "actually started", and a key predictor of drop-off<br>Required fields: course_id · Implementation: requires site code
- Event `course_completed` — all lessons/completion conditions of the course were met; the education north star<br>Required fields: course_id · ✓ funnel goal step · Implementation: requires site code
- Event `lesson_started` — the start of a lesson/content unit within a course<br>Required fields: course_id, lesson_id · Implementation: requires site code
- Event `lesson_completed` — finishing a lesson (reaching the end / the "Done" mark); the basis of per-lesson progress and the drop-off heatmap<br>Required fields: course_id, lesson_id · Implementation: requires site code
- Event `lesson_progress` — an in-lesson progress milestone (25/50/75%) for text/mixed lessons that video_progress does not cover (modeled on article_read_depth)<br>Required fields: course_id, lesson_id · Implementation: requires site code
- Event `module_completed` — finishing a chapter/module (a set of lessons); the intermediate level between lesson and course for long courses<br>Required fields: course_id, module_id · Implementation: requires site code
- Event `quiz_started` — starting a test/quiz<br>Required fields: quiz_id · Implementation: requires site code
- Event `quiz_completed` — submitting/finishing the quiz; the score and pass/fail are recorded here<br>Required fields: quiz_id · Implementation: requires site code
- Event `assignment_submitted` — the learner submitting an assignment/practical project (distinct from an automatic quiz; needs grading)<br>Required fields: assignment_id · Implementation: requires site code
- Event `certificate_earned` — issuing the course-completion certificate; a shareable output and a success/virality signal<br>Required fields: course_id · ✓ funnel goal step · Implementation: requires site code
- Event `course_review_submitted` — submitting a rating/review for the course (rating + optional text); a content-quality signal, distinct from reaction_added because it carries a structured score<br>Required fields: course_id · Implementation: requires site code
- Event `learning_streak_reached` — reaching a learning-continuity milestone (e.g. 7 consecutive days); a deep-engagement and habit-building signal<br>Required fields: streak_days · Implementation: requires a new field (the streak must be computed on the site's side; Shahin does not build the streak itself)

##### Referenced events (from the core or another pack — not defined here)
- Event `item_viewed` ← Search & Discovery pack: the entry point of the Learning funnel; browsing a course page is `item_viewed` with `item_type=course` (formerly course_viewed), counted as conv only when `referrer_surface` is in {search, list, recommendation}.
- Event `search_submitted` ← core: course catalog search (formerly course_searched) rides on the search floor and is enriched with `search_context=course` and `results_count`.
- Event `file_download` ← core: downloading a lesson attachment (handout/PDF/code); the former lesson_resource_downloaded rides on file_download and is only enriched with course_id/lesson_id (the GA4-reserved name is kept).
- Event `share` ← core: sharing a certificate (formerly certificate_shared) is the generic share with `entity_type=certificate` and `share_channel`.
- Event `entity_followed` ← Community pack: following an instructor (formerly instructor_followed) is `entity_followed` with `entity_type=instructor`; non-conv per the conversion corrections.
- Event `add_to_wishlist` ← E-commerce pack: adding a course to the wishlist (formerly course_added_to_wishlist) is `add_to_wishlist` with `item_type=course`; an intent signal before enrollment.
- Event `video_started` ← Video pack (Media baseline): lesson videos come from the MEDIA family with `media_type=video`; the Learning pack does not redefine it and only consumes it in the funnel/cohort.
- Event `video_progress` ← Video pack (Media baseline): playback progress of lesson videos for video lessons (instead of lesson_progress, which is specific to text/mixed content).
- Event `video_completed` ← Video pack (Media baseline): finishing a lesson video; the input for computing completion of video lessons.
- Event `trial_started` ← Subscription / Paywall pack: for subscription LMSs, the trial→subscription funnel is consumed in the Learning dashboard; owner is Subscription, redefinition is forbidden.
- Event `paywall_viewed` ← Subscription / Paywall pack: the paywall impression (the former referenced paywall_reached, canonical = paywall_viewed) in the Learning subscription funnel.
- Event `subscription_started` ← Subscription / Paywall pack: the real revenue point of a subscription LMS; the former subscription_completed maps to the canonical subscription_started (terminal conv).

##### Custom Event candidates
- Event `live_session_joined`: a live class/webinar is an optional, implementation-driven capability of each LMS (time slots, attendance, webinar tool); the attendance and duration schema differs from site to site (suggested schema: `live_session_joined { session_id (req), course_id, scheduled_at, join_lag_sec, attendance_duration_min, role(student|instructor) }`).
- Event `code_exercise_run`: coding education platforms have an internal sandbox/IDE, and the meaning of a successful/failed run and the test output are entirely bespoke (suggested schema: `code_exercise_run { exercise_id (req), lesson_id, language, tests_passed, tests_total, run_status(success|error) }`).
- Event `discussion_reply_posted`: an in-course forum/Q&A is a custom widget; if the Community pack is active it is better to consume its comment_replied, but the thread→lesson threading is specific to each LMS (suggested schema: `discussion_reply_posted { thread_id (req), course_id, lesson_id, reply_depth, is_instructor_reply(bool) }`).
- Event `note_taken`: a timestamped note-taking tool on a video/text is a proprietary widget, and its data structure differs per product (suggested schema: `note_taken { course_id (req), lesson_id, note_position_sec, note_length_chars }`).
- Event `playback_rate_changed`: if the Video pack is active, this behavior is the MEDIA family's video_rate_changed and should come from there; as a custom event it only makes sense in an LMS without a shared player (the name was normalized from playback_speed_changed to align with the canonical video_rate_changed) (suggested schema: `playback_rate_changed { course_id, lesson_id, from_speed, to_speed }`).

##### Shown in the Learning dashboard
- **Learning Funnel** — pass-through rate of each step = users at the next step ÷ users at the previous step, along the chain item_viewed(course) → course_enrolled → course_started → course_completed → certificate_earned — Source: item_viewed, course_enrolled, course_started, course_completed, certificate_earned — Type: funnel chart
- **Course completion rate** — unique users with course_completed ÷ unique users with course_enrolled in the selected range — Source: course_completed, course_enrolled — Type: KPI card with spark-trend
- **Lesson Drop-off (drop-off between lessons)** — the ratio of lesson_completed to lesson_started by lesson_index; the dip in the curve shows the lessons that cause drop-off — Source: lesson_started, lesson_completed, lesson_progress — Type: step/retention curve (per lesson_index)
- **Quiz performance** — average score_percent and pass rate = quiz_completed with passed=true ÷ all quiz_completed, by quiz_id/course — Source: quiz_started, quiz_completed — Type: grouped bar + score distribution (histogram)
- **Time-to-Complete** — distribution of days_to_complete between course_enrolled and course_completed (median + percentiles) — Source: course_enrolled, course_completed — Type: box/percentile distribution
- **Top courses table** — for each course_id: enrollments, completion rate, average rating, average quiz score (sorted) — Source: course_enrolled, course_completed, course_review_submitted, quiz_completed — Type: data table with sort/sparkline
- **Conversion cards** — count and rate of conv events (course_enrolled, course_completed, certificate_earned) with Δ vs. the previous period — Source: course_enrolled, course_completed, certificate_earned — Type: conversion KPI cards + trend line
- **Learning continuity (Engagement Cohort)** — learner return rate in the weeks after course_started + the distribution of learning_streak_reached — Source: course_started, lesson_completed, learning_streak_reached — Type: cohort retention heatmap
- **Subscription/trial funnel (if the Subscription pack is active)** — trial_started → subscription_started and paywall_viewed → subscription_started — Source: trial_started, paywall_viewed, subscription_started — Type: funnel chart

##### Presence in other Shahin services
- **Content (Engagement module)**: each lesson/course is a unit of content; item_viewed(course) + lesson_progress + course_review_submitted feed the "educational full-consumption rate" and the quality ranking, the equivalent of what item_viewed(article)/article_read_depth builds for an article. The instructor sees, without a manual report, which lesson was actually consumed to the end.
- **Behavior / User Journey**: the sequence search_submitted → item_viewed(course) → course_enrolled → lesson_started → course_completed reveals the learner's real path to conversion and the exact drop-off point (enroll without start).
- **Session Replay**: every event is a jump-point on the recording bar; the analyst sees the moment a quiz_started led to leaving, or a paywall_viewed, and follows where the user got stuck.
- **AI Insights**: crossing course events with auto-properties builds automatic insights, e.g. "mobile learners coming from Telegram have half the course_completed rate of desktop" from the intersection of session_referrer + device_type with course_completed.
- **Analytics**: course_enrolled/course_completed/certificate_earned flow as conv into the standard reports (conversion rate, UTM attribution, geo/device breakdown); the same event record, without capturing it again.

---


#### Pack 13 — SaaS / B2B

This pack is the heart of product-led analytics for enterprise and B2B tools: a place where "success" is not a page view, but product activation, team expansion and feature stickiness. This pack is a "light owner": it owns only the concepts that have no other owner in the core, namely the workspace/tenant lifecycle, seats, the PLG viral loop, feature activation and adoption, CRUD of product objects, and integration (which the core explicitly names SaaS/B2B as the canonical owner of). The other lifecycles (identity, subscription, search and VoC) are referenced from the core or other packs so that one concept does not get two names.

##### Owned events
- Event `workspace_created` — creating a new workspace/organization/tenant (the B2B unit, distinct from Auth's individual sign_up)<br>Required fields: account_id · ✓ funnel goal step · Implementation: requires site code
- Event `workspace_deleted` — the organizational account/workspace being closed completely (a negative key event of organizational churn)<br>Required fields: account_id · Implementation: requires site code
- Event `invite_sent` — the user invited a teammate to the workspace (the PLG viral loop)<br>Required fields: account_id · Implementation: requires site code
- Event `invite_accepted` — the invitee joined the workspace (the terminal conversion of the viral loop)<br>Required fields: account_id · ✓ funnel goal step · Implementation: requires site code
- Event `member_added` — an active seat being added to the account (an expansion signal)<br>Required fields: account_id · Implementation: requires site code
- Event `member_removed` — a seat being removed from the account (a contraction signal)<br>Required fields: account_id · Implementation: requires site code
- Event `feature_activated` — the user reached the product's "aha"/activation milestone for the first time (e.g. the first project or the first report)<br>Required fields: feature_name · ✓ funnel goal step · Implementation: requires site code
- Event `feature_used` — general interaction with any product feature (a single-name wrapper instead of dozens of button-driven events)<br>Required fields: feature_name · Implementation: requires site code
- Event `item_created` — creating a core product object (project, document, record)<br>Required fields: object_type · Implementation: requires site code
- Event `item_updated` — editing a core product object<br>Required fields: object_type · Implementation: requires site code
- Event `item_deleted` — deleting a core product object<br>Required fields: object_type · Implementation: requires site code
- Event `data_exported` — exporting data/a report (a power-user and stickiness signal)<br>Required fields: export_type · Implementation: requires site code
- Event `integration_connected` — connecting an integration to the workspace (a strong retention signal); SaaS/B2B is the canonical owner of this concept and Auth references it<br>Required fields: integration_name · ✓ funnel goal step · Implementation: requires site code
- Event `limit_reached` — the user hit a usage/plan cap (an expansion-revenue trigger)<br>Required fields: limit_type · Implementation: requires site code
- Event `feature_flag_evaluated` — exposure of an A/B experiment or feature flag to the user<br>Required fields: flag_key, variant · Implementation: requires site code

##### Referenced events (from the core or another pack — not defined here)
- Event `sign_up` ← core: the main individual sign-up conversion; Auth owns register_completed. Used as a goal step in the activation funnel (the GA4-reserved spelling is kept).
- Event `login` ← core: the start of an authenticated session; the basis of DAU/WAU/MAU and retention. non-conv by default (a retention metric).
- Event `logout` ← core: the user signing out; Auth owns logout_completed (the raw pack had logout_completed, mapped to the canonical logout).
- Event `login_failed` ← Security pack: the login-failure counterpart for computing the login success rate; Security owns the failure twins.
- Event `onboarding_started` ← core: the start of the first-run flow; baseline. The top of the activation funnel.
- Event `onboarding_step_completed` ← core: an activation step; the basis of the activation funnel.
- Event `onboarding_completed` ← core: activation completed; the final (terminal) step of the funnel. A goal step in the activation funnel.
- Event `search_submitted` ← core: internal product search; Search & Discovery is the owner, with search_context=saas/in_product (the enriched version of the generic search Toggle).
- Event `file_uploaded` ← core: uploading a file in the product (a stickiness signal); the ownership conflict (Nav/AI vs. SaaS) was resolved in favor of the canonical version; SaaS only references it.
- Event `error_shown` ← core: a user-facing logical/experience error (distinct from shahin_client_error); resolved to the canonical version. Used in the friction/churn widget.
- Event `empty_state_viewed` ← core: a zero-data page; resolved to the canonical version. An onboarding friction signal.
- Event `scroll_depth_reached` ← core: scrolling to 25/50/75/100; Toggle. Used in cross-service engagement.
- Event `form_submitted` ← core: submitting a B2B demo-request/lead form; Toggle. The common goal step of the lead funnel (a lead micro-conversion).
- Event `cta_clicked` ← core: an upgrade CTA click in a paywall/prompt (with `placement`). non-conv (an intent micro-event).
- Event `trial_started` ← Subscription / Paywall pack: a trial start with product_context=saas; Subscription owns the lifecycle. A funnel goal step (top of funnel).
- Event `trial_converted` ← Subscription / Paywall pack: trial converted to paid; owned by Subscription. A funnel goal step (terminal).
- Event `subscription_upgraded` ← Subscription / Paywall pack: a plan upgrade (expansion); the raw plan_upgraded was mapped to this canonical (product_context=saas).
- Event `subscription_downgraded` ← Subscription / Paywall pack: a plan downgrade (contraction); revenue_impact=negative, non-conv.
- Event `subscription_cancelled` ← Subscription / Paywall pack: subscription cancellation (churn); the conv flag was resolved to non-conv (a cancellation = churn, not a positive conversion).
- Event `paywall_viewed` ← Subscription / Paywall pack: a paywall impression with product_context=saas; the top of the monetization funnel, non-conv.
- Event `nps_submitted` ← Customer Support pack: an in-product NPS score; Customer Support owns VoC. non-conv.
- Event `support_ticket_created` ← Customer Support pack: creating a support ticket (an account-health signal); owned by Customer Support. non-conv (friction signal).
- Event `shahin_session_start` ← core: a system event; the basis for computing session-based DAU/WAU/MAU and the §5.4 conversion rate.

##### Custom Event candidates
- Event `lead_generated`: the value of a lead and the definition of a "qualified lead" differ from site to site; Shahin only captures form_submitted without code (suggested schema: lead_generated { lead_source (required), form_id, value, currency })
- Event `report_generated`: the concept of a "report" and its types are specific to each SaaS product (CRM vs. BI); the object_type/template cannot be standardized (suggested schema: report_generated { report_type (required), filters_applied, row_count })
- Event `workflow_automation_triggered`: automation is bespoke to each product; the trigger schema depends on the site's domain logic (suggested schema: workflow_automation_triggered { workflow_id (required), trigger_type, steps_count })
- Event `ai_assistant_prompted`: interacting with an AI assistant is a proprietary feature and belongs to the AI/LLM pack (planned), not the generic SaaS pack (suggested schema: ai_assistant_prompted { surface (required), prompt_length, response_useful })
- Event `dashboard_widget_interacted`: interacting with a custom dashboard widget depends on each site's specific UI and has no shared schema (suggested schema: dashboard_widget_interacted { widget_id (required), widget_type, action })

##### Shown in the Product Analytics dashboard
- **Activation Funnel** — pass-through rate of each step = unique users reaching step n divided by step n-1; overall activation rate = unique feature_activated divided by unique sign_up — Source: sign_up, onboarding_started, onboarding_step_completed, onboarding_completed, feature_activated — Type: horizontal funnel chart with the drop-off at each step
- **Time-to-Value** — median time between sign_up and the same user's first feature_activated — Source: sign_up, feature_activated — Type: distribution/histogram with a median line
- **Feature Adoption Matrix** — adoption rate of each feature = unique users with feature_used for a given feature_name divided by all active users, plus usage frequency — Source: feature_used, feature_activated — Type: heatmap/bar chart sorted by feature_name
- **Growth and retention chart** — DAU/WAU/MAU from unique login and feature_used; stickiness = DAU/MAU; cohort retention curve on first_visit_time — Source: login, feature_used, shahin_session_start — Type: cohort retention grid + line chart
- **Monetization funnel** — paywall → upgrade rate = (trial_converted or subscription_upgraded) divided by paywall_viewed; trial-to-paid rate = trial_converted divided by trial_started — Source: paywall_viewed, cta_clicked, trial_started, trial_converted, subscription_upgraded — Type: vertical funnel chart
- **Viral / PLG loop** — invite coefficient = invite_accepted divided by invite_sent; share of growth from invites = sign_up with invited=true divided by all sign_up — Source: invite_sent, invite_accepted, sign_up, member_added — Type: KPI section + a small invite→accept Sankey/flow
- **Churn and account-health signals** — churn rate = unique subscription_cancelled divided by active accounts; friction index = the rate of error_shown, empty_state_viewed and support_ticket_created per account — Source: subscription_cancelled, workspace_deleted, member_removed, error_shown, empty_state_viewed, support_ticket_created, limit_reached — Type: KPI cards + churn trend line + leaderboard of high-risk accounts
- **Experiment Impact** — the conversion-rate difference between variants = each variant's conversions divided by that variant's exposure from feature_flag_evaluated — Source: feature_flag_evaluated, feature_activated, trial_converted, subscription_upgraded — Type: grouped bar chart comparing variants
- **Activation conversion rate (from the Report Builder funnel)** — a funnel is built in Report Builder for each goal step, and its rate is the conversion rate (§5.4) — Source: sign_up, feature_activated, trial_converted, subscription_upgraded, workspace_created — Type: KPI strip at the top of the dashboard with the rate from the funnel and its trend
- **VoC / NPS** — average and distribution of NPS; the promoter/detractor ratio from the score in nps_submitted — Source: nps_submitted — Type: gauge + stacked bar of the score distribution

##### Presence in other Shahin services
- **Behavior / User Journey**: the time sequence of a user's events builds the product-led path (sign_up → onboarding_step_completed → feature_used → feature_activated → trial_converted); the drop-off points of the activation funnel and the paywall are visible here without a single metric.
- **Content / Engagement**: scroll_depth_reached, feature_used and search_submitted, together with auto-properties such as entity_id/page_url, show which pages/features get the most engagement; pages with a high empty_state_viewed are content friction points.
- **Session Replay**: every event = a jump-point on the recording timeline; the analyst sees exactly the moment of error_shown, paywall_viewed or limit_reached on the replay bar and follows where the user got stuck.
- **AI Insights**: crossing events with auto-properties builds automatic insights, e.g. "invite_accepted users on desktop reach feature_activated 2x sooner" from device_type and session_referrer (both auto-properties) with the pack's events.
- **Analytics**: the goal steps (sign_up, feature_activated, trial_converted, subscription_upgraded, workspace_created) become the end point of a funnel in Funnel Builder, and the conversion rate is read from that funnel per UTM campaign and ranked.

---


#### Pack 14 — Gaming

This pack is the measurement backbone for web and browser games: from the new-player activation funnel (FTUE) and the level difficulty curve to the virtual currency economy, the offer monetization funnel, rewarded ads, and daily and social retention loops. The design logic is that Shahin is a web script, not an SDK inside the game engine; so game signals are pushed from the engine (Unity/WebGL/Canvas) to Shahin, and every owned event of this pack requires site code. The pack was rebuilt from 50 raw events into 40 owned events + 10 referenced events, to stay compatible with the canonical families (COMMERCE, SUBSCRIPTION, MEDIA, LIST/ITEM) and the carve-out for GA4-reserved names.

##### Owned events
- Event `level_started` — the player starts a level/stage (the Play button, scene load)<br>Required fields: level_id · Implementation: requires site code
- Event `level_completed` — the level is finished successfully (the victory screen); for selected gate levels<br>Required fields: level_id, success · ✓ funnel goal step · Implementation: requires site code
- Event `level_failed` — the player fails the level (death, running out of moves/time); a difficulty drop-off signal<br>Required fields: level_id, fail_reason · Implementation: requires site code
- Event `level_abandoned` — the player abandons an in-progress level (rage-quit), distinct from level_failed<br>Required fields: level_id · Implementation: requires site code
- Event `level_retried` — the player restarts the same level<br>Required fields: level_id, attempt_number · Implementation: requires site code
- Event `level_up` — the player's account/character level increases, distinct from stage progression (GA4 carve-out, the reserved name is kept)<br>Required fields: level · Implementation: requires site code
- Event `world_unlocked` — a new world/season/chapter unlocks (content gating); a progression milestone<br>Required fields: world_id, unlock_method · ✓ funnel goal step · Implementation: requires site code
- Event `post_score` — a score is posted to the leaderboard (GA4 carve-out; Gaming is the owner, there is no other owner)<br>Required fields: score · Implementation: requires site code
- Event `match_started` — a PvP/multiplayer match begins<br>Required fields: match_id, mode · Implementation: requires site code
- Event `match_ended` — a PvP/multiplayer match ends (including result=win/loss)<br>Required fields: match_id, result · Implementation: requires site code
- Event `quest_accepted` — the player accepts a daily/weekly quest/mission<br>Required fields: quest_id, quest_type · Implementation: requires site code
- Event `quest_completed` — a quest/mission is completed (an engagement signal, terminal success)<br>Required fields: quest_id, quest_type · ✓ funnel goal step · Implementation: requires site code
- Event `achievement_unlocked` — an achievement unlocks (the non-reserved GA4 alias: unlock_achievement); a progression milestone<br>Required fields: achievement_id · ✓ funnel goal step · Implementation: requires site code
- Event `item_unlocked` — a new item/character unlocks for the player (game content, not a store catalog item)<br>Required fields: item_id, unlock_method · Implementation: requires site code
- Event `item_upgraded` — the player upgrades an item<br>Required fields: item_id, to_level · Implementation: requires site code
- Event `item_equipped` — the player equips/activates an item<br>Required fields: item_id · Implementation: requires site code
- Event `daily_reward_claimed` — the player claims the daily reward (login streak); a retention loop<br>Required fields: day_index · ✓ funnel goal step · Implementation: requires site code
- Event `earn_virtual_currency` — the player earns virtual currency (level reward, ad, purchase); one side of the game economy (GA4 carve-out)<br>Required fields: virtual_currency_name, value · Implementation: requires site code
- Event `spend_virtual_currency` — the player spends virtual currency (upgrade, gacha, continue); the other side of the economy (GA4 carve-out)<br>Required fields: virtual_currency_name, value · Implementation: requires site code
- Event `resource_sink_emptied` — the balance of a virtual currency reaches zero (a monetization trigger, often forgotten)<br>Required fields: virtual_currency_name · Implementation: requires site code
- Event `store_opened` — the in-game store opens<br>Required fields: store_context · Implementation: requires site code
- Event `offer_shown` — an offer/bundle is shown to the player (an impression, the base of the offer funnel)<br>Required fields: offer_id, offer_type · Implementation: requires site code
- Event `offer_clicked` — the player clicks the offer<br>Required fields: offer_id · Implementation: requires site code
- Event `subscription_renewed` — the game subscription (battle pass/VIP) renews; recurring revenue, product_context=gaming; the owner only added the domain field renewal_count, and the lifecycle schema comes from Subscription<br>Required fields: product_id · Implementation: requires site code
- Event `ad_offer_shown` — the "watch an ad to get X" prompt is shown (an impression of the in-game rewarded prompt, distinct from the Advertising pack's inventory)<br>Required fields: placement · Implementation: requires site code
- Event `ad_reward_granted` — the rewarded ad's reward is given to the player (the game-specific economic sink of rewarded video)<br>Required fields: reward_type, reward_amount · Implementation: requires site code
- Event `invite_sent` — the player sends an invitation (referral); a step, not terminal<br>Required fields: channel · Implementation: requires site code
- Event `invite_accepted` — the invitation is accepted (sign-up via the invite link); the terminal viral conv<br>Required fields: channel · ✓ funnel goal step · Implementation: requires site code
- Event `clan_joined` — the player joins a clan/guild; social retention<br>Required fields: clan_id, join_method · ✓ funnel goal step · Implementation: requires site code
- Event `friend_added` — the player adds a friend (a game-specific entity, not Community's generic entity_followed)<br>Required fields: method · Implementation: requires site code
- Event `live_event_joined` — the player joins a live-ops event (tournament/season/sale)<br>Required fields: event_id · ✓ funnel goal step · Implementation: requires site code
- Event `live_event_reward_claimed` — the player claims the end-of-event reward of a live-ops event<br>Required fields: event_id · Implementation: requires site code
- Event `battle_pass_tier_unlocked` — a battle pass tier unlocks<br>Required fields: tier, track · Implementation: requires site code
- Event `tutorial_begin` — the player begins the initial tutorial (FTUE) (GA4 carve-out); funnel start<br>Required fields: tutorial_id · Implementation: requires site code
- Event `tutorial_step_completed` — the player passes a tutorial step (gaming-specific, not the generic onboarding_step_completed)<br>Required fields: tutorial_id, step_index · Implementation: requires site code
- Event `tutorial_complete` — the initial tutorial is completed; the most important non-revenue conversion, since FTUE drop-off is the #1 churn point (GA4 carve-out)<br>Required fields: tutorial_id · ✓ funnel goal step · Implementation: requires site code
- Event `tutorial_skipped` — the player skips the tutorial<br>Required fields: tutorial_id · Implementation: requires site code
- Event `account_linked` — a guest account is linked to a permanent account (guest→permanent, a game domain concept, not sign_up); without it, the LTV and retention of registered users break<br>Required fields: to_method · ✓ funnel goal step · Implementation: requires site code
- Event `game_crashed` — a game-engine crash in the browser with domain enrichment (level_id, app_version); the runtime-error base comes from `shahin_client_error`, but the enriched version needs code<br>Required fields: error_type · Implementation: requires site code
- Event `settings_changed` — the player changes a setting (sound, language, quality)<br>Required fields: setting_name · Implementation: requires site code

##### Referenced events (from the core or another pack — not defined here)
- Event `item_viewed` ← Search & Discovery pack (LIST/ITEM family): viewing a store item's details with item_type=offer/product; the offer and content progression widgets feed from it. conv only when referrer_surface is in {search, list, recommendation}.
- Event `purchase` ← E-commerce pack (COMMERCE family, vertical=gaming): a paid in-app purchase (IAP), the most canonical revenue conv; the basis of the revenue KPI and the monetization funnel.
- Event `begin_checkout` ← E-commerce pack (COMMERCE family): the start of a paid payment, an intermediate step of the offer monetization funnel (step, non-conv).
- Event `refund_issued` ← E-commerce pack (COMMERCE family): a purchase refund; negative revenue_impact, netted in the revenue cards (non-conv).
- Event `subscription_started` ← Subscription / Paywall pack: the start of a game subscription (battle pass/VIP) with product_context=gaming; the input to the active subscriptions card and a goal step of the conversion funnel.
- Event `subscription_cancelled` ← Subscription / Paywall pack: subscription cancellation (churn, product_context=gaming); subtracted when computing active subscriptions (non-conv).
- Event `share` ← core (GA4 carve-out): sharing a score/replay/invite with share_channel + entity_type; the virality widget. Gaming adds game metadata as optional but does not redeclare it.
- Event `sign_up` ← Authentication pack (core, GA4 carve-out): creating the player account (activation), the server-confirmed final funnel step; a goal step of the conversion funnel.
- Event `login` ← Authentication pack (core, GA4 carve-out): the player logging in (retention); non-conv by default.
- Event `shahin_client_error` ← core: the base for game runtime/JS errors on the web, derived automatically from Shahin's err/err_l modes; the enriched version with level_id has moved to the owned `game_crashed`.

##### Custom Event candidates
- Event `ad_impression_revenue`: the exact revenue of each impression (ecpm/value) comes only from the mobile ad network SDK (AdMob/MAX/IronSource), which Shahin's web script cannot access; Shahin does not propose an RPM/revenue formula (suggested schema: ad_unit_id [identifier], ad_format [dimension], ad_network [dimension], placement [dimension], ecpm [metric], value [metric], currency [dimension])
- Event `ad_fill_funnel`: the request/loaded/failed stages for fill rate and latency are locked inside each game's internal mediation callbacks, and there is no standard error_code across sites; defined per site (suggested schema: ad_unit_id [identifier], ad_format [dimension], phase [dimension: request|loaded|failed], error_code [dimension], latency_ms [metric])
- Event `gacha_pull`: the gacha/loot-box mechanic (number of pulls, drop rate, rarity, pity counter) is entirely specific to each game; neither the schema nor the set of rarities can be predefined (suggested schema: banner_id [dimension], pull_count [metric], currency_name [dimension], currency_spent [metric], rarity_received [dimension], is_pity [bool])
- Event `minigame_widget_interaction`: interacting with each game's native widgets (wheel of fortune, board game, scene editor) has unique behavior and state that a generic pack cannot anticipate (suggested schema: widget_id [identifier], interaction_type [dimension], value [metric], context [dimension])
- Event `level_load_time`: scene load time/FPS is measured inside the game engine (Unity/WebGL/Canvas), not from the page's Performance API that Shahin auto-collects; the definition of "scene fully loaded" is per engine (suggested schema: level_id [identifier], load_time_ms [metric], avg_fps [metric], engine [dimension])
- Event `replay_viewed`: watching an in-game replay/highlight is a native capability of some games, and the meaning of a "view" differs between games (suggested schema: replay_id [identifier], source_match_id [identifier], watch_pct [metric])

##### Shown in the Game Analytics dashboard
- **FTUE Funnel (activation funnel)** — pass-through percentage of each step: tutorial_begin → tutorial_step_completed → tutorial_complete → the first level_completed — Source: tutorial_begin, tutorial_step_completed, tutorial_complete, level_completed — Type: funnel
- **Level Difficulty Curve** — success rate of each level = level_completed(success) ÷ level_started, broken down by attempt_number; next to it, the fail and abandon rates — Source: level_started, level_completed, level_failed, level_abandoned — Type: combo (bar + line)
- **Drop-off breakdown: failure vs. abandonment** — the ratio of level_failed to level_abandoned in each level (separating difficulty drop-off from boredom drop-off), with progress_pct at the moment of exit — Source: level_failed, level_abandoned — Type: stacked bar
- **Game economy balance sheet (Source/Sink)** — total earn_virtual_currency against spend_virtual_currency by source and sink (an inflation/deficit signal), plus the occurrence rate of resource_sink_emptied — Source: earn_virtual_currency, spend_virtual_currency, resource_sink_emptied — Type: diverging bar / sankey
- **Offer monetization funnel** — offer CTR = offer_clicked ÷ offer_shown, then begin_checkout ÷ offer_clicked, then purchase ÷ begin_checkout — Source: offer_shown, offer_clicked, begin_checkout, purchase — Type: funnel
- **Revenue cards (KPI)** — count of purchase, first-time buyer rate, active subscriptions (subscription_started minus subscription_cancelled), count of refund_issued; monetary value only from the value/currency the site sends, without a revenue formula — Source: purchase, subscription_started, subscription_cancelled, refund_issued — Type: KPI cards
- **Rewarded ad funnel** — the opt-in rate from ad_offer_shown to playback, and the reward rate = ad_reward_granted ÷ ad_offer_shown (actual media playback with placement=ad comes from the MEDIA family) — Source: ad_offer_shown, video_started, video_completed, ad_reward_granted — Type: funnel
- **Daily retention loop** — distribution of daily_reward_claimed by day_index/streak_length; streak drops show the drop-off points — Source: daily_reward_claimed — Type: retention curve / heatmap
- **Social economy and virality** — invite coefficient = invite_accepted ÷ invite_sent; clan join rate; share volume by share_channel — Source: invite_sent, invite_accepted, clan_joined, share — Type: bar + ratio KPI
- **PvP and balance** — win rate = match_ended(result=win) ÷ match_ended; distribution of MMR change (mmr_after minus mmr_before); share of opponent_type=bot — Source: match_started, match_ended — Type: distribution / win-rate line
- **Game conversion rate (from the Report Builder funnel)** — a funnel is built in Report Builder for each goal step, and its rate is the conversion rate; each card is one rate + its time trend; there is no event-marking mechanism and no limit on the number of conversions — Source: purchase, subscription_started, tutorial_complete, sign_up, level_completed, ad_reward_granted, daily_reward_claimed — Type: rate card from the funnel + trend sparkline
- **Content progression** — unlock rate of each world/achievement and the time taken to reach it; identifying progression walls — Source: world_unlocked, achievement_unlocked, level_up — Type: progression funnel / cohort

##### Presence in other Shahin services
- **Content/Behavior (Engagement module)**: progression events (level_completed, world_unlocked, quest_completed) as the "engagement quality" signal of each game page; the owner sees which game/mode is actually played, not just loaded.
- **User Journey**: the time sequence of user/session events; the chain level_failed → store_opened → offer_shown → purchase builds the real path to purchase and its drop-off point, or tutorial_begin → level_abandoned the early-churn path.
- **Session Replay**: every event is a jump-point on the recording timeline; the analyst sees exactly the moment of resource_sink_emptied or offer_shown on the replay and follows where the player looked and where they left.
- **AI Insights**: events + auto-properties as raw data; an automatic insight such as "mobile players coming from Telegram have 3x the purchase rate after the third level_failed" is built from crossing session_referrer + device_type with purchase, without a segment being defined in advance.
- **Analytics (traffic dashboard)**: each conversion event (purchase, tutorial_complete, sign_up) shows the conversion-rate column next to the traffic volume of each campaign/source; the same record, with auto-properties, feeds the device/geo/utm slices (capture once, consume many times).

---


#### Pack 15 — Marketplace

This pack is for multi-vendor platforms that connect buyers and sellers: from classified-ad and services marketplaces to multi-vendor stores with an integrated cart and checkout. The pack's distinctive role is to cover concepts that have no home in any other family: the supply side, two-way buyer↔seller communication, the post-purchase fulfillment cycle, and marketplace trust health. The design principle is that for the two big blocks, browsing listings and the purchase funnel, the pack references the canonical families (Search & Discovery and E-commerce) instead of defining events again, and rides the multi-vendor dimension on those same events only as optional domain fields.

##### Owned events
- Event `seller_contacted` — the buyer contacts the seller via the listing's form/chat/call (a marketplace lead; in classified-ad models it takes the place of purchase as the main conversion)<br>Required fields: seller_id, listing_id, contact_method · ✓ funnel goal step · Implementation: requires site code
- Event `phone_revealed` — a click on "Show phone number" on a listing (a high-intent micro-conversion)<br>Required fields: listing_id, seller_id · ✓ funnel goal step · Implementation: requires site code
- Event `offer_submitted` — the buyer submits a price offer/negotiation (make-offer / RFQ) for a listing; a deliberate user action, not an intermediate funnel step<br>Required fields: listing_id, seller_id, offer_value, currency · ✓ funnel goal step · Implementation: requires site code
- Event `offer_responded` — the seller responds to the price offer (response = accepted/rejected/countered); the seller-side echo, since the buyer's deliberate action was already counted in offer_submitted<br>Required fields: listing_id, seller_id, response · Implementation: requires site code
- Event `review_submitted` — the buyer submits a review/rating for a product or seller (target_type = listing/seller); a social-proof and engagement signal, not a revenue conversion. It is owned here because the core has no canonical review/rating in the ENGAGEMENT family (Travel references this one)<br>Required fields: rating, target_type · Implementation: requires site code
- Event `listing_created` — the seller publishes a new listing (supply side, inventory health); the seller-growth conversion<br>Required fields: seller_id, category · ✓ funnel goal step · Implementation: requires site code
- Event `seller_registered` — a new seller's sign-up/onboarding (supply-side growth); a domain complement to the Authentication pack's sign_up, not a repetition of it: it adds the seller-role dimension and the supply-side conversion, and links seller_id to the sign_up user identifier when needed<br>Required fields: seller_id · ✓ funnel goal step · Implementation: requires site code
- Event `order_shipped` — the seller shipped the order (a fulfillment status change); a post-purchase stage outside the COMMERCE family<br>Required fields: order_id, seller_id · Implementation: requires site code (if it happens only in the admin panel it is server-derived and must be marked with source=server)
- Event `order_delivered` — the order delivered to the buyer (the end of the fulfillment cycle); the basis of the delivery SLA and post-purchase satisfaction<br>Required fields: order_id, seller_id · Implementation: requires site code (possibly server-derived, with source=server)
- Event `dispute_opened` — the buyer or seller files a dispute/complaint for an order; a cross-vendor marketplace trust-health signal (different from content_reported, which is a content report)<br>Required fields: order_id, reason · Implementation: requires site code

##### Referenced events (from the core or another pack — not defined here)
- Event `item_viewed` ← Search & Discovery pack: the raw `listing_viewed` and `seller_profile_viewed` are collected into this event with item_type=listing/seller; the seller dimension goes on the same event as the optional domain field seller_id. The basis of the purchase funnel and two-sided health (conv only when referrer_surface ∈ {search, list, recommendation})
- Event `item_list_viewed` ← Search & Discovery pack: the raw `listing_list_viewed` becomes this (item_type=listing); the basis of the promoted-listing CTR widget and the funnel
- Event `list_item_clicked` ← Search & Discovery pack: `listing_clicked` (choosing a listing from a list, with position) maps to this; analysis of rank effect and promoted listings
- Event `item_list_filtered` ← Search & Discovery pack: `listing_filter_applied` maps to this (filter_type/filter_value as params)
- Event `list_item_impressed` ← Search & Discovery pack: listing impressions in a list, for an accurate CTR in the promoted-effect widget (if impression-level is implemented)
- Event `search_submitted` ← core: the raw `listing_search_performed` is the enriched version of this canonical; when the pack is enabled, the generic search Toggle is switched off and this event is sent with search_context=marketplace (dedup). Feeds the search gap widget
- Event `search_no_results` ← core: the raw `listing_search_no_results` = this canonical with search_context=marketplace; a supply/demand gap signal in the Search Gap widget
- Event `add_to_cart` ← E-commerce pack: adding a listing to the cart; canonical commerce with vertical=marketplace and seller_id as an optional domain field. Funnel and upper-funnel conversion (the GA4-reserved name is kept)
- Event `remove_from_cart` ← E-commerce pack: removing a listing from the cart; canonical commerce (vertical=marketplace)
- Event `cart_viewed` ← E-commerce pack: the cart page opening; seller_count as an optional domain field adds the multi-vendor dimension
- Event `add_to_wishlist` ← E-commerce pack: saving a listing to the wishlist; canonical commerce. A light micro-conversion for retargeting
- Event `begin_checkout` ← E-commerce pack: the raw `checkout_started` = this canonical (a GA4-reserved name); funnel and upper-funnel conversion, with seller_count as an optional domain field
- Event `shipping_info_submitted` ← E-commerce pack: submitting shipping information in checkout; canonical commerce and, per the conversion corrections, non-conv (a funnel step)
- Event `payment_info_submitted` ← E-commerce pack: submitting payment information in checkout; the deepest pre-purchase step (a funnel goal step) and a pillar of the funnel
- Event `coupon_applied` ← E-commerce pack: a coupon successfully applied; seller_id as optional (a platform-level or seller-level coupon)
- Event `coupon_denied` ← E-commerce pack: a coupon rejected (a friction signal); a jump-point in Session Replay
- Event `purchase` ← E-commerce pack: the raw `order_completed` = this unified canonical (a GA4-reserved name; the commerce terminal conversion); multi-vendor domain fields (seller_ids, seller_count, platform_commission) as optional on the same event. The basis of the GMV KPI, the funnel and the seller leaderboard
- Event `refund_issued` ← E-commerce pack: the raw `order_refunded` = this canonical; always revenue_impact=negative and never a positive conversion, subtracted from GMV. The refund friction widget
- Event `order_failed` ← E-commerce pack: a payment/order failure; revenue-negative and non-conv. The basis of the payment failure rate in the friction widget
- Event `order_cancelled` ← E-commerce pack: an order cancellation; revenue_impact=negative and non-conv, subtracted from GMV

##### Custom Event candidates
- Event `store_builder_theme_changed`: the seller storefront customization tool is specific to each marketplace (every platform has a different theme/template), and the schema cannot be standardized across sites (suggested schema: theme_id, seller_id, section)
- Event `bulk_listing_imported`: bulk listing upload from a file/feed for professional sellers, with a structure that depends on each platform's import tool; predefining it would create mandatory fields irrelevant to most sites (suggested schema: batch_id, seller_id, listings_count, source=csv/api/feed, failed_count)
- Event `escrow_funds_released`: releasing escrow funds is a financial mechanism specific to the marketplaces that have it; most sites have no escrow (suggested schema: order_id, amount, currency, hold_days)
- Event `seller_payout_requested`: a seller settlement request is part of each platform's own financial dashboard and often a server-side admin-panel event; the payout structure is not the same across marketplaces (suggested schema: seller_id, payout_amount, currency, period)
- Event `listing_boost_purchased`: buying a listing bump/internal promotion is specific to each platform (different pricing models and boost types) and overlaps with the Advertising pack, so it must be defined site by site and is not merged into the Advertising owned set (suggested schema: listing_id, seller_id, boost_type, boost_value, currency, duration_days)

##### Shown in the Marketplace Dashboard
- **KPI card — GMV (gross merchandise value)** — total order_value on purchase minus total refunds and cancelled orders in the range (Toman, no decimals) — Source: purchase, refund_issued, order_cancelled — Type: KPI with trend sparkline and delta vs. the previous range
- **Marketplace purchase funnel** — pass-through rate between the steps item_viewed → add_to_cart → begin_checkout → payment_info_submitted → purchase, with the drop-off percentage at each step — Source: item_viewed, add_to_cart, begin_checkout, payment_info_submitted, purchase — Type: vertical Funnel with drop-off percentages
- **Conversion rate (from the Report Builder funnel)** — a funnel with a chosen final step (e.g. purchase or seller_contacted) is built in Report Builder, and its rate is the conversion rate; it can be sliced on utm_source — Source: purchase, seller_contacted, begin_checkout — Type: rate card from the funnel + breakdown by utm_source (from auto-properties)
- **Seller performance table (Top Sellers)** — for each seller_id: count of purchase, GMV, average rating (from review_submitted) and dispute rate = dispute_opened / purchase — Source: purchase, review_submitted, dispute_opened, item_viewed — Type: sortable table (leaderboard) with a mini-bar column
- **Two-sided marketplace health (Supply vs Demand)** — the supply-side trend (listing_created, seller_registered) against the demand side (item_viewed with item_type=listing, purchase), to monitor marketplace balance — Source: listing_created, seller_registered, item_viewed, purchase — Type: dual-axis line chart (dual-axis time series)
- **Search Gap** — the most frequent search_no_results queries (search_context=marketplace) and the zero-result share = search_no_results / search_submitted — Source: search_no_results, search_submitted — Type: word-cloud/bar table of zero-result queries
- **Promoted listing effect on clicks** — CTR of promoted vs. regular listings = list_item_clicked / item_list_viewed, broken down by is_promoted and position — Source: item_list_viewed, list_item_clicked, list_item_impressed — Type: grouped columns (promoted vs organic) on a position axis
- **Payment and refund friction** — payment failure rate = order_failed / (purchase + order_failed) and refund rate = refund_issued / purchase, broken down by failure_reason and payment_method — Source: order_failed, purchase, refund_issued — Type: reason-based columns + refund rate KPI
- **Negotiation and leads (classified-ad marketplace)** — lead conversion rate = seller_contacted / item_viewed and offer acceptance rate = offer_responded(accepted) / offer_submitted — Source: seller_contacted, phone_revealed, offer_submitted, offer_responded, item_viewed — Type: KPI grid + small offer funnel
- **Delivery SLA and fulfillment cycle** — average delivery_days and completion rate = order_delivered / purchase, and the distribution of shipped→delivered time — Source: order_shipped, order_delivered, purchase — Type: delivery-time histogram + completion rate KPI

##### Presence in other Shahin services
- **Analytics**: per the "capture once, consume many times" principle, the same events (purchase, item_viewed, seller_contacted...) become sliceable together with auto-properties (utm, device, geo, session); for example GMV by utm_source or city without defining a new report. The dedicated Marketplace Dashboard is built from these same records
- **Content / Behavior / User Journey**: the time sequence of a user's events builds the path to purchase (search_submitted → item_viewed → add_to_cart → purchase) and shows through which path, and with how many sellers, users reach a purchase and where they drop off
- **Session Replay**: every marketplace event is recorded as a jump-point on the timeline; the analyst sees the moment of order_failed, coupon_denied or dispute_opened on the replay bar and follows where the user got stuck
- **AI Insights**: automatic crossing of auto-properties with the pack's events, without predefined segments; e.g. "mobile users from Telegram have twice the purchase rate" from session_referrer × device_type × purchase, or automatically discovering sellers with disputes well above average

---


#### Pack 16 — Mobile App

The Mobile pack tracks user behavior inside a native app (iOS / Android), the layer where Shahin's web-based auto-properties (browser, viewport, Performance API) do not exist at all. That is why every owned event of this pack depends on Shahin's native SDK; none of them are collected automatically. The pack's job is to capture the app lifecycle (install, open, update, crash), push and system permissions, and native friction signals in one place, stitching together the loop between install attribution, activation, re-engagement and in-app revenue. Until a decision is made to build the native SDK, this pack stays on paper and is not scheduled.

##### Owned events
- Event `app_installed` — the app's first run after installation (fires once; the canonical owner of install attribution; it is not the web equivalent of `shahin_first_visit`)<br>Required fields: app_version, platform · ✓ funnel goal step · Implementation: requires site code (Shahin's native SDK, a prerequisite for the whole pack)
- Event `app_opened` — the app opening, or returning from background to foreground (the native equivalent of launch/session)<br>Required fields: app_version, platform · Implementation: requires site code
- Event `app_backgrounded` — the app going to the background<br>Required fields: app_version · Implementation: requires site code
- Event `app_updated` — the first run after an app version upgrade<br>Required fields: app_version, previous_version · Implementation: requires site code
- Event `app_crashed` — an unhandled crash of the native app (deliberately not named the same as the web `shahin_client_error`, to preserve dedup; distinct from `error_shown`)<br>Required fields: app_version, error_message · Implementation: requires site code
- Event `screen_viewed` — a native page/screen being shown (the app equivalent of `shahin_page_view`; screen_name takes the place of page_url)<br>Required fields: screen_name · Implementation: requires site code
- Event `deep_link_opened` — the app opening through a deep link or universal link<br>Required fields: link_url · Implementation: requires site code
- Event `push_permission_prompted` — the notification permission dialog being shown to the user<br>Required fields: permission_type · Implementation: requires site code
- Event `push_permission_granted` — the user granted push permission (re-engagement enabled)<br>Required fields: permission_type · ✓ funnel goal step · Implementation: requires site code
- Event `push_permission_denied` — the user denied push permission<br>Required fields: permission_type · Implementation: requires site code
- Event `push_received` — the device received a push in the background<br>Required fields: notification_id · Implementation: requires site code
- Event `push_opened` — the user tapped a push notification and entered the app<br>Required fields: notification_id · ✓ funnel goal step · Implementation: requires site code
- Event `app_rated` — the user submitted stars/a rating in the in-app rating prompt<br>Required fields: rating · Implementation: requires site code
- Event `app_review_prompted` — the store review/rating request prompt being shown<br>Required fields: placement · Implementation: requires site code
- Event `permission_requested` — a request for a non-push system permission (camera, location, contacts, microphone); generic<br>Required fields: permission_type · Implementation: requires site code
- Event `permission_granted` — the user granted a non-push system permission<br>Required fields: permission_type · Implementation: requires site code
- Event `permission_denied` — the user denied a non-push system permission<br>Required fields: permission_type · Implementation: requires site code
- Event `network_error_shown` — a network/offline error being shown to the user (because it is mobile-network-specific, it is separate from the logical/validation `error_shown`; it has no equivalent in the core)<br>Required fields: screen_name · Implementation: requires site code
- Event `notification_settings_changed` — a change to the in-app notification settings<br>Required fields: setting_name, new_value · Implementation: requires site code
- Event `rage_tap_detected` — several consecutive taps on one area with no response; a frustration signal (the app equivalent of the web rage_click; if the SDK gets a heuristic, it will later become a Toggle)<br>Required fields: screen_name · Implementation: requires site code

##### Referenced events (from the core or another pack — not defined here)
- Event `feature_used` ← SaaS / B2B pack: interaction with a core app feature; a generic wrapper instead of a separate event for each button. owner=SaaS; Mobile references it with feature_name/feature_area and does not redeclare it (an adoption signal in the Mobile dashboard and the behavioral path).
- Event `onboarding_started` ← core: the start of the app activation funnel. A baseline without a single domain owner (Mobile is in referencing_packs); Mobile references it with flow_id.
- Event `onboarding_step_completed` ← core: the steps of the activation funnel. Canonical with flow_id/step_name/step_index; Mobile references it.
- Event `onboarding_completed` ← core: the activation milestone in the Mobile funnel (the final funnel step). Canonical; Mobile references it.
- Event `sign_up` ← core (owner: Authentication): a successful in-app sign-up in the activation funnel. A funnel goal step; the method parameter is referenced. Mobile is only a consumer.
- Event `login` ← core (owner: Authentication): a successful in-app login. Dedup with the Authentication definition; conv flag: non-conv (per the core conv_correction).
- Event `search_submitted` ← core (owner: Search & Discovery): in-app search. The enriched version with search_context/search_id; Mobile is in referencing_packs and only a consumer for the dashboard.
- Event `share` ← core (owner: Video/core, GA4-reserved): sharing content from the native share sheet with share_channel + entity_type. Mobile references it (the ownership conflict was resolved in favor of the canonical version).
- Event `file_download` ← core: downloading a file/offline content in the app. The GA4-aligned name `file_download` (not file_downloaded); the file_type/file_name parameters. Mobile references it.
- Event `error_shown` ← core (owner: Navigation & Forms): showing a user-friendly/validation error. Canonical; distinct from `app_crashed` and `network_error_shown`. Mobile references it.
- Event `empty_state_viewed` ← core (owner: Navigation & Forms): an empty/no-data screen (an onboarding friction signal). Canonical with surface_type/screen_name/reason; Mobile references it.
- Event `purchase` ← E-commerce pack (COMMERCE family): a successful in-app purchase (IAP); the canonical `purchase` with the vertical param (ecommerce/gaming). A funnel goal step (terminal). Mobile consumes it for the revenue card.
- Event `purchase_failed` ← E-commerce pack (COMMERCE family): a failed IAP attempt, for the success rate. revenue-negative → non-conv. Mobile is a consumer.
- Event `paywall_viewed` ← Subscription / Paywall pack (SUBSCRIPTION family): a paywall/upgrade prompt shown in the app (revenue funnel exposure) with the product_context param. Mobile references it.
- Event `account_reactivated` ← Authentication pack: the user returning after a dormancy window (resurrection); Mobile references it. A funnel goal step; the computed field last_active is needed downstream (needs-new-field).

##### Custom Event candidates
- Event `widget_interaction`: home-screen widgets and live activities are specific to each app, and their interaction schema cannot be predefined (suggested schema: widget_id: string, action: string, surface: 'home_screen'|'lock_screen'|'live_activity')
- Event `watch_app_action`: an Apple Watch / Wear OS companion app and its actions differ completely from site to site (suggested schema: action: string, complication: string, source: 'watch')
- Event `siri_shortcut_invoked`: Siri shortcuts/App Intents and voice actions are defined by the app itself (suggested schema: shortcut_id: string, phrase: string, source: 'voice'|'spotlight')
- Event `ar_session_completed`: an AR/camera experience is specific to particular apps and its metrics cannot be anticipated (suggested schema: ar_model_id: string, duration_sec: number, placements: number)
- Event `offline_action_queued`: offline queue/sync behavior depends on each app's data architecture (suggested schema: action_type: string, queued_at: timestamp, synced: boolean)

##### Shown in the Mobile dashboard
- **KPI card — Active installs** — count of unique `app_installed` in the range (attributed installs) — Source: app_installed — Type: big number + daily trend sparkline
- **Activation funnel** — pass-through rate app_installed → app_opened → onboarding_completed → sign_up (each step relative to the previous one) — Source: app_installed, app_opened, onboarding_completed, sign_up — Type: vertical funnel
- **Push opt-in rate** — the ratio of push_permission_granted to push_permission_prompted — Source: push_permission_prompted, push_permission_granted, push_permission_denied — Type: donut (granted/denied/dismissed)
- **Push campaign effectiveness** — open rate = push_opened divided by push_received, per campaign — Source: push_received, push_opened — Type: horizontal bar per campaign
- **App health (stability)** — crash-free session rate = 1 minus the ratio of app_crashed to app_opened, by app_version — Source: app_crashed, app_opened, error_shown — Type: multi-line chart by app version
- **Version and platform spread** — share of sessions by app_version and platform (iOS/Android) — Source: app_opened, screen_viewed — Type: stacked bar
- **Most visited app screens** — count of screen_viewed per screen_name and the average time spent — Source: screen_viewed, app_backgrounded — Type: sorted table + rank heat
- **In-app revenue** — total value in purchase (vertical=ecommerce/gaming) and success rate = purchase divided by (purchase + purchase_failed) — Source: purchase, purchase_failed, paywall_viewed — Type: trend area + success-rate card
- **Friction points** — count of error_shown, network_error_shown, empty_state_viewed and rage_tap_detected by screen_name — Source: error_shown, network_error_shown, empty_state_viewed, rage_tap_detected — Type: horizontal top-N screen bar
- **Reactivation and return** — count of account_reactivated and the distribution of days_dormant — Source: account_reactivated, app_opened — Type: histogram of dormancy days
- **App conversion rate (from the Report Builder funnel)** — a funnel is built in Report Builder for each goal step, and its rate is the conversion rate; there is no event-marking mechanism and no limit on the number of conversions — Source: app_installed, onboarding_completed, sign_up, push_permission_granted, push_opened, purchase, account_reactivated — Type: a row of rate cards from the funnel

##### Presence in other Shahin services
- **Content**: `screen_viewed` and `share` (with entity_id/entity_type) go to the Engagement module so the editor can see which content has the most views/shares in the mobile app; a complement to the web data for the same entity.
- **Behavior / User Journey**: the time sequence screen_viewed → feature_used → purchase builds the in-app behavioral path and its drop-off points; deep_link_opened marks the path's entry point.
- **Session Replay**: if the native SDK supports recording, every screen_viewed, error_shown and rage_tap_detected appears as a jump-point on the app session recording timeline; the analyst follows the moment of a crash or rage tap visually.
- **AI Insights**: crossing app_version and platform with app_crashed and purchase builds automatic insights, such as "Android users on version X have twice the crash rate and half the purchase rate", without manually defining a segment.
- **Analytics**: app_installed, sign_up and purchase appear as Conversions in the general Analytics reports and funnels; device_type/geo (auto-properties) make it possible to slice the same conversion by city and source.


---


#### Pack 17 — AI / LLM

This pack is the heart of conversational and generative products. It covers the "user message → model response" loop, the generation lifecycle (text/image/code/audio), multi-step agent execution and tool calls, through to RUN, RAG, trust and safety, and AI revenue metering. Almost all of these concepts happen at the application level and have no canonical owner in any other pack, so they are owned and mostly require site code. The goal of the AI Analytics dashboard is to answer questions no page-view metric can answer: Did the user activate? How good is the response quality? Where does the token cost go? Where does the agent break?

##### Owned events
- Event `conversation_started` — the user starts a new conversation (the thread-level analog of shahin_session_start)<br>Required fields: conversation_id, entry_point · Implementation: requires site code
- Event `conversation_resumed` — the user reopens and continues a previous conversation<br>Required fields: conversation_id · Implementation: requires site code
- Event `conversation_ended` — the conversation is closed/abandoned/resolved; end_reason=resolved is the containment measure for a support bot<br>Required fields: conversation_id, end_reason · ✓ funnel goal step · Implementation: requires site code
- Event `conversation_renamed` — the conversation title changes, manually or automatically<br>Required fields: conversation_id · Implementation: requires site code
- Event `conversation_archived` — the user archives or deletes the conversation (an action enum that unifies archive and delete in one param)<br>Required fields: conversation_id, action · Implementation: requires site code
- Event `conversation_branched` — the user creates a new conversation branch from a message<br>Required fields: conversation_id, from_message_id, new_branch_id · Implementation: requires site code
- Event `ai_message_sent` — the user sends their turn in an AI conversation (input_type: text|voice|image|file|mixed; mode: chat|agent|search|reasoning)<br>Required fields: conversation_id, message_id, input_type · ✓ funnel goal step · Implementation: requires site code · [the pack-specific name `ai_message_sent`, because the canonical `message_sent` belongs to the Community pack (human-to-human messages)]
- Event `message_received` — the assistant's full response is received (the second edge of the loop); token/latency/cost are all properties<br>Required fields: conversation_id, message_id, finish_reason · Implementation: requires site code · [non-conv: it is a system echo and would double-count first_message_sent]
- Event `first_message_sent` — the first message ever of a user/device; the primary activation event (can be derived from the first ai_message_sent)<br>Required fields: conversation_id, message_id · ✓ funnel goal step · Implementation: requires site code
- Event `generation_started` — a generative tool starts producing output (output_type: text|image|audio|video|code)<br>Required fields: generation_id, output_type · Implementation: requires site code · [non-conv: a funnel step]
- Event `generation_completed` — a generation finishes successfully<br>Required fields: generation_id, finish_reason · ✓ funnel goal step · Implementation: requires site code
- Event `generation_failed` — a generation stops with an error (error_type: rate_limit|content_policy|timeout|model_error|quota_exceeded)<br>Required fields: generation_id, error_type · Implementation: requires site code · [non-conv: negative revenue_impact]
- Event `response_stopped` — the user stops the response stream midway (a proxy for silent dissatisfaction)<br>Required fields: message_id · Implementation: requires site code
- Event `response_regenerated` — the user asks for the response to be regenerated (a quality-dissatisfaction signal; reason: user_request|error|variant)<br>Required fields: message_id · Implementation: requires site code
- Event `response_variant_selected` — the user picks one of several displayed drafts<br>Required fields: message_id, variant_index, variant_count · Implementation: requires site code
- Event `message_edited` — the user edits a previous prompt and resends it<br>Required fields: message_id · Implementation: requires site code
- Event `response_rated` — the user gives the response a thumbs up/down or a rating (rating: up|down)<br>Required fields: message_id, rating · Implementation: requires site code · [non-conv: an engagement micro-event; because the widget needs AI-specific markup, the generic Toggle does not work]
- Event `content_flagged` — the user reports/flags the response<br>Required fields: message_id, flag_reason · Implementation: requires site code
- Event `response_copied` — the user copies the response or part of it (value realization; copy_scope: full|snippet|code_block)<br>Required fields: message_id · Implementation: requires site code · [non-conv: an engagement micro-event that would inflate the conversion rate; it needs AI-specific markup]
- Event `code_applied` — the user applies/runs/copies generated code (applied_to: editor|terminal|clipboard; the three cases are aggregated in a param)<br>Required fields: message_id, applied_to · ✓ funnel goal step · Implementation: requires site code
- Event `artifact_created` — the user creates an artifact/canvas<br>Required fields: artifact_id, artifact_type · Implementation: requires site code
- Event `artifact_downloaded` — the user downloads an artifact (an AI-specific artifact, not the generic file_download)<br>Required fields: artifact_id, format · Implementation: requires site code
- Event `generation_downloaded` — the user downloads a generative output (an AI-specific output, not the generic file_download)<br>Required fields: generation_id, format · ✓ funnel goal step · Implementation: requires site code
- Event `citation_clicked` — the user clicks a citation/source in a grounded response (RAG)<br>Required fields: message_id, source_id · Implementation: requires site code
- Event `suggestion_accepted` — the user accepts/dismisses an inline autocomplete suggestion (Copilot-style; action: accepted|dismissed)<br>Required fields: suggestion_id, action · Implementation: requires site code
- Event `voice_input_completed` — the user's voice input is completed and transcribed<br>Required fields: message_id · Implementation: requires site code
- Event `attachment_processed` — an uploaded attachment is processed/extracted (AI-specific semantics, following the core file_uploaded)<br>Required fields: attachment_id, processing_status · Implementation: requires site code
- Event `prompt_suggestion_clicked` — the user clicks a ready-made chip/suggestion (starter) (a strong activation driver)<br>Required fields: suggestion_id · Implementation: requires site code
- Event `prompt_template_used` — the user uses a ready-made prompt template<br>Required fields: template_id · Implementation: requires site code
- Event `model_switched` — the user switches the model or the auto-router switches it (trigger: manual|auto_route; covers model_auto_routed)<br>Required fields: from_model, to_model · Implementation: requires site code
- Event `mode_switched` — the user switches mode (chat→reasoning/agent/search)<br>Required fields: from_mode, to_mode · Implementation: requires site code
- Event `custom_instruction_saved` — the user saves a system prompt / custom instruction (field: about_you|response_style)<br>Required fields: field · Implementation: requires site code
- Event `setting_changed` — the user changes an AI setting (generic)<br>Required fields: setting_name · Implementation: requires site code
- Event `tool_invoked` — the agent calls a tool/function (a more precise replacement of the previous thin pack's tool_call)<br>Required fields: tool_name, invocation_id · Implementation: requires site code
- Event `tool_call_completed` — a tool call finishes (status: success|error|timeout; the tool error rate is critical for an agent)<br>Required fields: invocation_id, status · Implementation: requires site code
- Event `tool_permission_decided` — the user responds to a tool permission request (decision: requested|granted|denied; the three permission events are aggregated in a param)<br>Required fields: tool_name, decision · Implementation: requires site code
- Event `agent_run_started` — a multi-step agent run begins<br>Required fields: run_id · Implementation: requires site code · [non-conv: a funnel step]
- Event `agent_run_completed` — the agent run finishes (outcome: completed|partial|failed|aborted)<br>Required fields: run_id, outcome · ✓ funnel goal step · Implementation: requires site code
- Event `agent_step_executed` — each individual step in an agent run (action_type: think|tool|browse|write; high volume, a sampling candidate)<br>Required fields: run_id, step_index, action_type · Implementation: requires site code
- Event `human_handoff_triggered` — the chatbot escalates to a human operator (the counter-metric of containment failure; the main KPI of a support bot)<br>Required fields: conversation_id, reason · Implementation: requires site code
- Event `knowledge_source_added` — the user adds a knowledge source (file/url/connector) to the assistant (source_type: file|url|connector; an adoption-depth milestone)<br>Required fields: source_type · ✓ funnel goal step · Implementation: requires site code
- Event `knowledge_indexed` — a knowledge source is indexed (status: indexing|completed|failed)<br>Required fields: source_id, status · Implementation: requires site code
- Event `assistant_published` — the user builds and publishes a custom GPT/assistant (a deep product-led milestone)<br>Required fields: assistant_id · ✓ funnel goal step · Implementation: requires site code
- Event `memory_saved` — a personalization memory is saved or referenced (action: saved|referenced)<br>Required fields: memory_id, action · Implementation: requires site code
- Event `retrieval_executed` — a RAG retrieval is executed (grounding health; no_results=true is the no-result sub-state)<br>Required fields: message_id · Implementation: requires site code
- Event `content_filter_triggered` — a content/safety filter fires on the input or output (the trust filter-rate metric; distinct from the generic error_shown)<br>Required fields: filter_category · Implementation: requires a new field
- Event `response_refused` — the model refuses to answer (the trust refusal-rate metric)<br>Required fields: message_id, refusal_reason · Implementation: requires a new field
- Event `hallucination_flagged` — a response is marked as a hallucination (by the user or a validator)<br>Required fields: message_id · Implementation: requires a new field
- Event `safety_event_detected` — a safety/compliance incident is detected (safety_type: pii_detected|jailbreak_attempt|usage_policy_violation; distinct from the Security pack's suspicious_activity_detected because it concerns LLM content, not an auth/session threat)<br>Required fields: safety_type · Implementation: requires a new field
- Event `clarification_requested` — the assistant asks a clarifying question (an input-quality signal)<br>Required fields: message_id · Implementation: requires site code
- Event `goal_completed` — a conversation-level goal is achieved (task success, not message success; a conversation-level rollup)<br>Required fields: conversation_id, goal_type · ✓ funnel goal step · Implementation: requires site code
- Event `quota_reached` — the user hits a usage cap (limit_type: messages|tokens|images|requests; the monetization funnel; covers rate_limit_hit)<br>Required fields: limit_type · Implementation: requires site code
- Event `upgrade_prompt_shown` — an upgrade banner/modal is shown to the user (an AI-quota-specific impression)<br>Required fields: plan · Implementation: requires site code
- Event `credits_consumed` — credit is consumed (credit_type specific to AI metering)<br>Required fields: credit_type, amount · Implementation: requires site code

##### Referenced events (from the core or another pack — not defined here)
- Event `feedback_submitted` ← Customer Support pack: the user's structured feedback after a down-vote (feedback_category: incorrect|unsafe|not_helpful|refused|too_long|hallucination|formatting); the canonical owner of the VoC/feedback concept is the Customer Support pack, and AI only consumes it in the response-quality widget without declaring it again.
- Event `share` ← core: sharing a response/conversation (raw response_shared), aligned with the GA4-reserved name `share`; with entity_type=ai_response and share_channel as params. Consumed in the Value-Realization Actions widget.
- Event `file_uploaded` ← core: uploading a file for processing is the core file_uploaded; the AI-specific context (page_count/processing_status) is carried as optional params. attachment_processed (owned) is its semantic continuation.
- Event `cta_clicked` ← core: an upgrade CTA click with `placement=upgrade_prompt` (non-conv: a CTA-intent micro-event); the Monetization Funnel widget reads it.
- Event `integration_connected` ← SaaS / B2B pack: connecting a connector/provider; canonical ownership lies with SaaS/B2B, AI only consumes it (an adoption-depth milestone in the dashboard), and with cross-reference dedup it is not counted twice.
- Event `api_key_created` ← API Analytics pack: AI platforms with an API layer consume this; the canonical owner is the API Analytics pack and it is deduplicated by cross-reference.
- Event `purchase` ← Subscription / Paywall pack: the revenue terminal in the Monetization funnel and the cross-service User Journey; the canonical is defined in Subscription/Paywall, and AI only consumes it in its own funnel.
- Event `sign_up` ← Authentication pack: the canonical sign_up/login lives in Authentication; AI only references them for attribution and dedup so they are not counted twice.

##### Custom Event candidates
- Event `prompt_library_item_saved`: a "prompt library" is custom to each product; it has neither a shared schema nor standard fields (suggested schema: prompt_library_item_saved { item_id, folder, is_shared(bool), tag[] })
- Event `playground_param_tuned`: playground/studio products have entirely proprietary parameters (temperature, top_p, presence_penalty, custom sliders) with uncontrolled cardinality that cannot be predefined (suggested schema: playground_param_tuned { param_name, old_value, new_value, model })
- Event `agent_workflow_node_configured`: a visual workflow/agent graph builder is a bespoke widget; node types and connections depend entirely on the product (suggested schema: agent_workflow_node_configured { workflow_id, node_id, node_type, connection_count })
- Event `comparison_view_used`: the "side-by-side comparison of two models' responses" capability is a UI experience specific to some products and has no generic mapping (suggested schema: comparison_view_used { message_id, models_compared[], winner_model })
- Event `avatar_persona_selected`: companion/voice products have branded personas/avatars with proprietary identifiers that cannot be enumerated in advance (suggested schema: avatar_persona_selected { persona_id, voice_id, language })
- Event `inline_widget_action`: the actions of custom in-text widgets (e.g. a "Summarize" button on each block) depend entirely on each site's implementation (suggested schema: inline_widget_action { widget_id, action_name, target_element })

##### Shown in the AI Analytics dashboard
- **Generation Funnel** — the ratio of message_received with finish_reason=stop to ai_message_sent, and the drop at each step — Source: ai_message_sent, message_received, response_stopped, generation_failed — Type: funnel
- **Activation Rate** — share of users who have had at least one first_message_sent + one successful message_received — Source: first_message_sent, message_received — Type: single-value KPI + trend sparkline
- **Response Quality** — the thumbs-up rate out of all response_rated, and the regenerate/stop rate as silent dissatisfaction — Source: response_rated, response_regenerated, response_stopped, feedback_submitted — Type: gauge + stacked bar
- **Latency Distribution** — percentiles of time_to_first_token_ms and latency_ms (p50/p90/p99) — Source: message_received — Type: histogram / percentile bands
- **Token & Cost Economics** — total total_tokens and average cost_usd by model and user segment (only if the site sends cost_usd) — Source: message_received, generation_completed, credits_consumed — Type: stacked area + breakdown table
- **Model & Mode Mix** — the usage share of each model and mode, and the model_switched rate — Source: ai_message_sent, message_received, model_switched, mode_switched — Type: donut + Sankey (switches)
- **Trust & Safety** — refusal rate, filter rate and count of safety incidents relative to all responses — Source: response_refused, content_filter_triggered, hallucination_flagged, safety_event_detected — Type: multi-line trend + alert tiles
- **RAG Grounding Health** — the no_results rate, average top_score and the citation_clicked rate per grounded response — Source: retrieval_executed, citation_clicked — Type: line + click-through bar
- **Agent Reliability** — the rate of outcome=completed in agent_run_completed and the tool_call_completed error rate — Source: agent_run_started, agent_run_completed, tool_invoked, tool_call_completed — Type: stacked bar (outcome) + error-rate line
- **Conversation Depth** — distribution of the number of turns (turn_index) and is_followup in each conversation — Source: ai_message_sent, conversation_started, conversation_ended — Type: distribution bar
- **Containment / Deflection** — the share of conversation_ended with end_reason=resolved minus the human_handoff_triggered rate — Source: conversation_ended, human_handoff_triggered, goal_completed — Type: single-value KPI + trend
- **Monetization Funnel** — the path quota_reached → upgrade_prompt_shown → cta_clicked(placement=upgrade_prompt) and the conversion rate of each step — Source: quota_reached, upgrade_prompt_shown, cta_clicked — Type: funnel
- **AI conversion rate (from the Report Builder funnel)** — a funnel is built in Report Builder for each goal step, and its rate is shown with a breakdown on auto-properties (device/referrer/geo) — Source: ai_message_sent, first_message_sent, generation_completed, code_applied, assistant_published, goal_completed, agent_run_completed — Type: rate card from the funnel + breakdown bars
- **Value-Realization Actions (actions after a response)** — the rate of response_copied/share/generation_downloaded and code_applied relative to message_received — Source: response_copied, share, generation_downloaded, code_applied — Type: grouped bar

##### Presence in other Shahin services
- **Content / Behavior / User Journey**: the time sequence of AI events on the user/session axis builds the behavioral path (prompt_suggestion_clicked → ai_message_sent → message_received → response_copied, or quota_reached → cta_clicked → purchase); User Journey shows the drop-off point in the generation loop and the monetization funnel, and the Engagement module reads the same message_received as value delivery.
- **Session Replay**: every AI event becomes a jump-point on the session recording bar; the analyst sees exactly the moment of response_stopped, response_regenerated or human_handoff_triggered on the replay and follows the user's behavior before/after, giving visual context for silent dissatisfaction.
- **AI Insights**: events + auto-properties (device_type, session_referrer, geo, segment_1..5) become the model's raw data; undiscovered combined slices, such as "mobile users coming from Telegram have a higher response_rated=up rate" or "model X has a higher hallucination_flagged rate on Persian", are built without anyone defining them in advance.
- **Analytics**: the goal steps (ai_message_sent, first_message_sent, generation_completed, goal_completed, agent_run_completed, code_applied, assistant_published, knowledge_source_added) become end points in the standard Report Builder funnel, and the conversion rate is read from that funnel alongside the auto-properties for a breakdown on device/geo/UTM; the boundary events api_key_created (API Analytics), integration_connected (SaaS/B2B), share/file_uploaded/cta_clicked (core), feedback_submitted (Customer Support) and sign_up/purchase (Auth/Subscription) are deduplicated by cross-reference so they are not counted twice.

---


#### Pack 18 — API Analytics

This pack tracks the behavior of developers who work with the site's API and developer panel: from viewing the docs and copying sample code to creating a key, making the first successful call, and managing webhooks and quotas. It is an area where GA4 is weak, and with it Shahin sheds light on the "developer activation" path and the technical health of the API (success rate, errors, latency, rate limits). All of its events require site code, because an API call is not a standard browser event and needs site/client-side code.

##### Owned events
- Event `api_request_made` — every time the site/client code sends a request to the API (a wrapper or interceptor on fetch/XHR)<br>Required fields: endpoint, http_method · Implementation: requires site code (high volume: needs sampling or forwarding from the backend; auto-properties come free)
- Event `api_response_succeeded` — receiving a successful response (status_code in the 2xx family), usually from the same client interceptor<br>Required fields: endpoint, status_code · Implementation: requires site code
- Event `api_error_returned` — receiving an error response from the API (4xx/5xx, except rate-limit and auth, which have separate events); distinct from the core `error_shown` (a user-facing logical error) and from `shahin_client_error` (a JS error)<br>Required fields: endpoint, status_code · Implementation: requires site code
- Event `api_rate_limited` — receiving a rate-limit response (usually 429), a sign of capacity/abuse; distinct from Security's `rate_limit_triggered`<br>Required fields: endpoint · Implementation: requires site code
- Event `api_auth_failed` — an authentication failure on an API call (401/403: invalid key, expired token, insufficient scope); distinct from Security's `login_failed` (a human login failure)<br>Required fields: endpoint · Implementation: requires site code
- Event `api_timeout_occurred` — the request expired without a response within the set timeout (detectable on the client side, distinct from 5xx)<br>Required fields: endpoint · Implementation: requires site code
- Event `api_request_retried` — the client retries a failed request (a sign of instability/a poor developer experience)<br>Required fields: endpoint · Implementation: requires site code
- Event `api_key_created` — creating a new API key in the developer panel, a strong signal of integration intent; per the core ownership table, the owner is this API pack (Authentication and SaaS only reference it)<br>Required fields: key_id · ✓ funnel goal step · Implementation: requires site code
- Event `api_key_revoked` — the user revoking/deleting an API key (a security rotation or the end of an integration)<br>Required fields: key_id · Implementation: requires site code
- Event `api_first_call_made` — the first successful API call after creating a key, the developer activation milestone; emitted once per key/account<br>Required fields: endpoint · ✓ funnel goal step · Implementation: requires site code
- Event `docs_viewed` — viewing a page of the API docs (developer docs / reference); specific to API docs and not part of the LIST/ITEM family's `item_viewed`<br>Required fields: doc_path · Implementation: requires site code (the path partly from the auto page property; section/language require a new field)
- Event `code_sample_copied` — clicking the Copy button of a code sample in the docs, a strong predictor of integration success<br>Required fields: doc_path · Implementation: requires site code
- Event `api_explorer_tried` — running a test call from inside the docs console/playground (Try-it), distinct from a real production `api_request_made`<br>Required fields: endpoint · ✓ funnel goal step · Implementation: requires site code
- Event `sdk_initialized` — initializing the official SDK in the customer's environment (when the page hosting the SDK belongs to the same site and the init emits the event)<br>Required fields: sdk_language · Implementation: requires site code
- Event `webhook_created` — creating a webhook subscription in the developer panel<br>Required fields: webhook_id · ✓ funnel goal step · Implementation: requires site code
- Event `webhook_failed` — a failed webhook delivery (if the webhook management UI returns the status to the client, or it is forwarded from the backend to the SDK)<br>Required fields: webhook_id · Implementation: requires site code (often requires forwarding from the backend)
- Event `api_plan_limit_reached` — the plan's API quota cap was used up (e.g. the monthly number of calls), an upsell driver; an API-quota concept, distinct from the Subscription pack's paywall family<br>Required fields: limit_type · ✓ funnel goal step · Implementation: requires site code
- Event `api_quota_warning_shown` — showing a warning that the quota cap is approaching (e.g. 80%), a leading indicator before the hard limit<br>Required fields: limit_type · Implementation: requires site code

##### Referenced events (from the core or another pack — not defined here)
- Event `integration_connected` ← SaaS / B2B pack: a successful third-party integration connection (Slack/GitHub/OAuth); the final step of the developer activation funnel and a goal step of the dashboard's conversion funnel. Per the core table the owner is SaaS, so it is not redeclared here (dedup with the SaaS pack).
- Event `integration_failed` ← SaaS / B2B pack: a failure to establish/keep an integration (OAuth rejected, token revoked); the failure twin of the integration concept with the same owner, used in integration health analysis.
- Event `consent_updated` ← core: if the dashboard wants to filter by tracking-consent state, it uses this event's canonical (owner=Authentication); the API pack does not define it.

##### Custom Event candidates
- Event `graphql_operation_run`: GraphQL sites want operationName and the query shape instead of endpoint/method; the structure depends on each site's schema and has no generic Required field (suggested schema: operation_name required, operation_type {query|mutation|subscription}, field_count, has_errors, latency_ms)
- Event `grpc_call_made`: gRPC uses service/method instead of an HTTP method, and a different status code model; only particular sites have it, so generalizing is not sensible (suggested schema: service required, method required, grpc_status_code, latency_ms, environment)
- Event `api_query_saved`: saving a query/collection in each platform's own playground; the structure of the saved object and the concept of a collection are entirely bespoke (suggested schema: collection_id required, request_count, is_shared)
- Event `rate_limit_policy_changed`: an admin changing the rate policy settings; the policy model (per-key/per-ip/tiered) is not the same across products (suggested schema: policy_id required, scope, old_limit, new_limit, window_sec)
- Event `sandbox_promoted_to_production`: a key/app moving from test to prod; the definition of "production-ready" differs on each platform and has no generic trigger (suggested schema: app_id required, key_id, checks_passed)

##### Shown in the API dashboard
- **KPI — Total API call volume** — count of `api_request_made` in the time range, with the percentage change vs. the previous period — Source: api_request_made — Type: KPI card with sparkline
- **KPI — Success Rate** — the ratio of `api_response_succeeded` to `api_request_made` as a percentage — Source: api_response_succeeded, api_request_made — Type: KPI card with a percentage gauge
- **KPI — Error Rate** — the ratio of total errors (`api_error_returned` + `api_timeout_occurred` + `api_rate_limited` + `api_auth_failed`) to `api_request_made` as a percentage — Source: api_error_returned, api_timeout_occurred, api_rate_limited, api_auth_failed, api_request_made — Type: KPI card with threshold colors (green/yellow/red)
- **Call trend over time, split success/error** — count of `api_request_made` by outcome (success/error) on the time axis — Source: api_request_made, api_response_succeeded, api_error_returned — Type: stacked area chart
- **Latency — distribution and percentiles** — p50 / p95 / p99 percentiles of latency_ms over calls — Source: api_request_made, api_response_succeeded — Type: multi-line chart (p50/p95/p99) + histogram
- **Top Endpoints** — endpoints ranked by call volume, with each one's error rate and median latency — Source: api_request_made, api_error_returned — Type: sortable table with in-cell bars
- **Error breakdown by status_code** — distribution of error counts across 4xx/5xx codes and the rate-limit/auth/timeout categories — Source: api_error_returned, api_rate_limited, api_auth_failed, api_timeout_occurred — Type: horizontal bar/pie chart
- **Auth and quota health** — the trend of the `api_auth_failed` rate and the count of `api_rate_limited` over time, with an alert on spikes — Source: api_auth_failed, api_rate_limited — Type: dual line chart with a threshold line
- **Developer Activation Funnel** — step-by-step transition ratio: docs_viewed → code_sample_copied → api_key_created → api_first_call_made → integration_connected — Source: docs_viewed, code_sample_copied, api_key_created, api_first_call_made, integration_connected — Type: funnel chart (integration_connected is referenced from the SaaS pack)
- **Quota consumption and upsell pressure** — count of `api_quota_warning_shown` and `api_plan_limit_reached` by plan — Source: api_quota_warning_shown, api_plan_limit_reached — Type: grouped bar chart
- **API conversion rate (from the Report Builder funnel)** — a funnel is built in Report Builder for each goal step, and its rate is the conversion rate (the §5.4 pattern) — Source: api_key_created, api_first_call_made, integration_connected, webhook_created, api_explorer_tried, api_plan_limit_reached — Type: rate cards from the funnel (integration_connected is referenced from SaaS)

##### Presence in other Shahin services
- **Content/Behavior/User Journey**: the time sequence of developer events builds the integration path (docs_viewed → code_sample_copied → api_key_created → api_first_call_made); User Journey reveals the drop-off point (e.g. a key was created but there was no first call), and Content reports "effective content" on the docs (which page produces the most code_sample_copied).
- **Session Replay**: every API event is a jump-point on the recording timeline; the analyst sees the moment of `api_error_returned` or `api_auth_failed` on the replay and follows where in the playground/panel the developer got stuck.
- **AI Insights**: automatically crossing API events with auto-properties builds insights, e.g. "5xx errors come mostly from endpoint X and only in environment=test" or "keys created via the docs_viewed path have a higher api_first_call_made rate", without manual slicing.
- **Analytics**: the same records appear in the general events dashboard (US-2.1) and each event's details (US-2.2); the auto-properties (country, device_type, session_referrer, utm, page) slice every API metric by geography/campaign/device without an extra field, and the conv events enable the conversion-rate column in all Analytics reports.

---


#### Pack 19 — Security

The Security pack builds the threat and account-health layer for any site with a user account system: failed login attempts, MFA friction and drop-off, rate throttling, suspicious activity and session revocation. This pack is the canonical owner of the "failure twin and threat" concept (per the event core's ownership table); it does not announce identity and authentication success itself, but takes it from the Authentication pack and places it next to its own threat signals. The product output of the same records feeds the analytics dashboard and the security audit at the same time: capture once, consume many times.

##### Owned events
- Event `login_failed` — every failed login attempt confirmed by the server (on the authentication failure, not the button click); the most important brute-force/credential-stuffing signal<br>Required fields: failure_reason · Optional fields: method, attempt_number, email_hash, is_new_device (hash only, never the raw email) · Implementation: requires site code
- Event `mfa_challenge_failed` — the MFA challenge was failed; the mandatory failure twin for every sensitive MFA success<br>Required fields: mfa_method, failure_reason · Optional fields: attempts, context · Implementation: requires site code
- Event `session_revoked` — an active session was forcibly invalidated (logout of all devices, an admin action, incident response); revoke_scope and actor are separated with parameters<br>Required fields: revoke_scope · Optional fields: actor, revoked_session_count · Implementation: requires site code
- Event `suspicious_activity_detected` — the site's system detected a suspicious pattern; signal_type/severity/action_taken as parameters, and the country/city/isp_asn auto-properties can be used directly for impossible_travel and geo_anomaly<br>Required fields: signal_type · Optional fields: severity, action_taken, rule_id · Implementation: requires site code
- Event `rate_limit_triggered` — the rate limiter throttled or blocked an endpoint/user/IP; the main input of the brute-force and abuse chart<br>Required fields: limit_type · Optional fields: endpoint, action_taken, threshold · Implementation: requires site code
- Event `recovery_code_used` — a backup code was used; a possible sign of lost access to the primary factor<br>Optional fields: remaining_codes · Implementation: requires site code
- Event `impersonation_started` — an admin/support user signed in as another user (audit-critical); excluded from product analytics and kept in the audit; target_user_ref is a non-PII identifier<br>Required fields: actor · Optional fields: reason, target_user_ref · Implementation: requires site code
- Event `impersonation_ended` — the end of the impersonation session; the session duration can be derived from the auto-property for the session start time<br>Required fields: actor · Optional fields: session_duration_sec, target_user_ref · Implementation: requires site code

##### Referenced events (from the core or another pack — not defined here)
- Event `account_locked` ← Authentication pack: the account-locked event is consumed in the "Sensitive account events" feed and the "Lock and unlock" widget; the MFA/account/recovery cluster is owned by Authentication, and Security only references it.
- Event `account_unlocked` ← Authentication pack: used next to account_locked to show unlocks (automatic after a cooldown, or by an admin/user), broken down by actor in the same widget.
- Event `mfa_enrolled` ← Authentication pack: enabling a second factor; consumed in the "MFA coverage (posture)" widget and as a goal step of the Security dashboard's funnel (the canonical version is defined as a goal step in Authentication).
- Event `mfa_disabled` ← Authentication pack: removing the second factor; a security-downgrade signal, used in the sensitive events feed and in the net posture trend (enrolled minus disabled).
- Event `mfa_challenge_shown` ← Authentication pack: the start of the MFA friction funnel (a challenge shown at login or for a sensitive action); the top of the "MFA friction funnel" widget.
- Event `mfa_challenge_completed` ← Authentication pack: successfully passing the MFA challenge; co-fires with login under one session_id without a recount, and is the intermediate step of the MFA funnel.
- Event `recovery_code_used` ← (canonical owner: Authentication): note: in the MFA/account/recovery cluster this event is owned by Authentication; but because it is also a threat/loss-of-access signal, it is consumed in the Security dashboard's sensitive events feed.
- Event `login` ← core: Authentication owns the canonical login (login_completed); Security consumes the login success, co-fired under the same session_id and without a recount, to build the "failed-vs-succeeded attack trend" widget and the denominator of the MFA funnel.
- Event `logout` ← core: to distinguish a deliberate logout from session_revoked in the "session: expiry vs. revocation" widget.
- Event `session_expired` ← Authentication pack: a session expired by the system (idle/absolute/token); next to session_revoked in the same session-integrity widget, with expiry_reason as a parameter.
- Event `password_reset_requested` ← Authentication pack: Authentication owns the password reset funnel; Security consumes the requested/successful-outcome pair for the reset funnel and the post-incident sweep.
- Event `password_changed` ← Authentication pack: the wave of forced=true after a breach is shown in the password reset funnel.
- Event `credential_added` ← Authentication pack: adding a recovery credential (passkey/recovery_email/security_key…); a posture signal and a takeover signature.
- Event `credential_removed` ← Authentication pack: the chain new_device → credential_removed is consumed as an account-takeover signature in the feed and AI Insights.
- Event `email_changed` ← Authentication pack: the classic account-takeover attack surface; in the sensitive events feed and the takeover signature (hash only).
- Event `verification_completed` ← Authentication pack: the gate for a real account; the canonical version (a funnel goal step) is in Authentication, and Security only shows its conversion rate (from the funnel), it does not declare it.
- Event `verification_failed` ← Authentication pack: the failure twin; a high volume is a deliverability or OTP-attack signal (non-conv).
- Event `consent_updated` ← core (owner: Authentication): consumed for the consent and privacy audit; the security-specific version was removed and turned into a core reference.
- Event `shahin_client_error` ← core: "client security error" is not a standalone event; it is just a filtered view of the auth path of shahin_client_error and needs no site code (derived view).

##### Custom Event candidates
- Event `fraud_rule_matched`: each site's fraud rules are bespoke (a proprietary engine, rule names and thresholds); Shahin cannot predefine the schema of a rule it does not know (suggested schema: rule_name (string), rule_category (string), score (number), action_taken (enum: review|block|allow), is_manual_review (bool))
- Event `device_trust_changed`: the concept of a "trusted device" and its levels depend on each site's trust engine, and there is no standard cross-site trust level (suggested schema: device_fingerprint_id (string), old_trust_level (string), new_trust_level (string), changed_by (enum: user|system|admin))
- Event `security_alert_acknowledged`: the internal security alert flow ("This was me/wasn't me") is a UI and state machine specific to each site, not a standard web interaction (suggested schema: alert_id (string), alert_type (string), response (enum: was_me|was_not_me|dismissed), channel (enum: email|sms|in_app))
- Event `biometric_prompt_completed`: the biometric outcome depends on the platform/WebAuthn and each site's hardware errors and has no general controlled vocabulary; the name was normalized to past-tense object_action (outcome as a parameter) (suggested schema: outcome (enum: success|fail|cancelled|unavailable), authenticator_type (string), platform (string))

##### Shown in the Security dashboard
- **KPI — Failed login attempts (24 hours)** — count of login_failed in the range, with the percentage change vs. the previous range — Source: login_failed — Type: KPI card with sparkline
- **Attack trend — failed vs. successful attempts** — the ratio of login_failed to login over time; a spike in this ratio is a credential-stuffing signal — Source: login_failed, login — Type: two-series time-series line chart
- **Login failure reasons** — distribution of login_failed by failure_reason — Source: login_failed — Type: horizontal bar breakdown
- **Threat geography map** — density of login_failed, suspicious_activity_detected and rate_limit_triggered by country/city/isp_name (auto-properties) — Source: login_failed, suspicious_activity_detected, rate_limit_triggered — Type: choropleth/heatmap
- **MFA friction funnel** — the pass-through rate mfa_challenge_shown → mfa_challenge_completed and the drop-off rate (mfa_challenge_failed/abandon) — Source: mfa_challenge_shown, mfa_challenge_completed, mfa_challenge_failed — Type: funnel chart
- **MFA coverage (posture)** — the net trend of mfa_enrolled minus mfa_disabled and the share of users with a second factor — Source: mfa_enrolled, mfa_disabled — Type: stacked area chart + coverage-percentage KPI
- **Sensitive account events (feed)** — a time stream of account_locked / mfa_disabled / email_changed / credential_removed / session_revoked with severity — Source: account_locked, mfa_disabled, email_changed, credential_removed, session_revoked — Type: time-sorted event-feed table with a severity badge
- **Account lock and unlock** — count of account_locked by lock_reason against account_unlocked by actor — Source: account_locked, account_unlocked — Type: grouped bar chart
- **Session: expiry vs. revocation** — separating session_expired (by expiry_reason, owned by Auth) from session_revoked (by scope, owned by Security) — Source: session_expired, session_revoked — Type: stacked bar chart
- **Password reset funnel** — the conversion rate password_reset_requested → successful outcome (consumed from Auth), plus the wave of forced password_changed — Source: password_reset_requested, password_changed — Type: funnel chart + trend
- **Rate limits and abuse** — rate_limit_triggered by limit_type and endpoint — Source: rate_limit_triggered — Type: stacked bar time series
- **Admin access audit (separate from product analytics)** — count and duration of impersonation and the share of actions with actor=admin — Source: impersonation_started, impersonation_ended — Type: audit table + average-duration KPI
- **Conversion rate (from the Report Builder funnel)** — for the goal steps (mfa_enrolled and verification_completed, both referenced from Auth) a funnel is built in Report Builder, and its rate is the conversion rate — Source: mfa_enrolled, verification_completed — Type: rate card from the funnel

##### Presence in other Shahin services
- **Analytics**: the same records build the "conversion rate" column for mfa_enrolled and verification_completed (both referenced from Auth) next to every traffic slice; slicing by auto-properties (device_type, session_referrer, utm_source, country) shows which channel brings more secure/verified users.
- **Behavior / User Journey**: the time sequence of events reveals the path to a security event; the chain login(is_new_device=true) → email_changed → credential_removed is an account-takeover signature that no single metric shows, plus the mfa_challenge path and its abandonment point.
- **Session Replay**: every security event becomes a jump-point on the recording timeline; the analyst sees exactly the moment of repeated login_failed or abandoning mfa_challenge_shown (impersonation is usually excluded from replay).
- **AI Insights**: events plus auto-properties are the model's raw input; an automatic combined insight such as "a login_failed spike from a particular ISP correlates with impossible_travel" is built from crossing failure_reason with isp_asn/country and suspicious_activity_detected.
- **Content / Behavior (Engagement)**: account_locked (referenced from Auth) and session_expired (referenced from Auth) as friction context; an engagement drop on pages with a high session_expired rate helps the Engagement module tell deliberate churn from a system timeout.


---


#### Pack 20 — VOD

The VOD pack covers the data of a subscription/rental streaming service (SVOD/TVOD/AVOD): from discovering a title in the catalog through playback, playback quality (QoE), in-stream ads and conversion to a subscription. This pack is almost entirely a "consumer": the whole playback lifecycle (the MEDIA family) is owned by the Video pack, and VOD only references it with the discriminators `media_type=vod` and `placement=content|ad`. The three-layer nesting (playback session ⊃ content pod ⊃ ad) is preserved through a shared `playback_session_id`: a parameter contract, not a separate event. Only two genuinely VOD-owned events remain.

##### Owned events
- Event `content_started` — a real VOD content pod (film/episode/clip) started playing, nested under the playback session; the enriched version of the MEDIA family (`video_started` with `media_type=vod`, `placement=content`) that adds series/season/episode metadata<br>Required fields: playback_session_id, media_type, placement, asset_id, title, total_length_sec · ✓ funnel goal step · Implementation: requires site code
- Event `rental_started` — renting or buying a single title (TVOD); the entry point of direct TVOD revenue, which is not covered by the generic COMMERCE family with a vertical, so VOD owns it<br>Required fields: asset_id, price, currency, entitlement_type · ✓ funnel goal step · Implementation: requires site code

##### Referenced events (from the core or another pack — not defined here)
- Event `video_started` ← Video pack: the base schema for playback start; VOD builds the enriched `content_started` on top of it, and also reads resume from continue-watching from it with `playback_source=continue_watching`.
- Event `video_paused` ← Video pack: playback pause; VOD is a consumer and does not redeclare it.
- Event `video_resumed` ← Video pack: playback continuing after a pause.
- Event `video_completed` ← Video pack: the end of a content pod and the end of the whole session (with the appropriate placement); the source of the completion rate KPI and the discovery funnel.
- Event `video_interrupted` ← Video pack: an abnormal playback interruption; the basis of a jump-point in Session Replay.
- Event `video_heartbeat` ← Video pack: the periodic playback heartbeat; the source of truth for watch time, the drop-off (retention) curve and concurrent viewers; the 25/50/75% milestones are derived from it.
- Event `video_seeked` ← Video pack: moving along the timeline; the basis of the Seek Heatmap (`to_position`).
- Event `video_buffered` ← Video pack: a rebuffer interval; a QoE signal.
- Event `video_error` ← Video pack: a playback error; Error Rate with COUNT DISTINCT on `playback_session_id`.
- Event `video_quality_changed` ← Video pack: a quality change (manual or adaptive).
- Event `video_rate_changed` ← Video pack: a playback speed change; an engagement signal.
- Event `video_fullscreen_toggled` ← Video pack: entering/leaving fullscreen; resolved as a member of the MEDIA family (the VOD outlier was rejected).
- Event `video_next_autoplayed` ← Video pack: automatic playback of the next episode; the core binge/retention signal.
- Event `ads_video_started` ← Video pack: the start of an in-stream ad (`placement=ad`); in-stream ad playback folds into MEDIA, not into the Advertising pack.
- Event `ads_video_completed` ← Video pack: completion of an in-stream ad; the AVOD-billable completed-view unit.
- Event `ads_video_skipped` ← Video pack: skipping an in-stream ad.
- Event `ads_video_clicked` ← Video pack: a click on an in-stream ad (click-through).
- ~~Event `startup_time_measured`~~ ← Video pack — **Obsolete (§11, media family v2):** this reference was never defined as a separate event; instead, `startup_time_ms` is a param of `video_started` itself (time-to-first-frame; the source of the TTFF card/QoE panel).
- Event `item_viewed` ← core: a title page view (`item_type=title`); the input to the discovery funnel; a goal step only when `referrer_surface` is in {search, list, recommendation, autocomplete}.
- Event `recommendation_clicked` ← core (owner: Search): a click on a recommended title; recommendation engine evaluation (CTR@k), a funnel goal step.
- Event `search_submitted` ← core (owner: Search): VOD catalog search with `search_context=vod`; the enriched version that switches off the generic Toggle to avoid double counting.
- Event `item_saved` ← Community pack: adding to the watchlist (`item_type=title`); an intent signal / micro-conversion of the recommender funnel.
- Event `item_unsaved` ← Community pack: removing from the watchlist.
- Event `reaction_added` ← Community pack: liking/rating a title (`target_type=title`); a content-quality signal and recommender training.
- Event `share` ← core: sharing a title (`entity_type=title`); the GA4-reserved name is kept.
- Event `file_download` ← core: a generic offline download (the GA4-aligned name); related to `is_offline_playback` of the later playback.
- Event `trial_started` ← Subscription / Paywall pack: the start of an OTT trial period (`product_context=vod`); VOD is a conversion/consumer.
- Event `subscription_started` ← Subscription / Paywall pack: the core SVOD conversion; VOD only displays it.
- Event `subscription_renewed` ← Subscription / Paywall pack: subscription renewal (retention revenue); canonically non-conv (an MRR-retained metric in the waterfall, not an acquisition conv).
- Event `subscription_cancelled` ← Subscription / Paywall pack: subscription cancellation (churn); negative revenue_impact, non-conv.
- Event `paywall_viewed` ← Subscription / Paywall pack: hitting the paywall; the pivot of the subscription funnel and an important Session Replay jump-point.

##### Custom Event candidates
- Event `watch_party_joined`: synchronized group viewing (co-watch) is a capability specific to certain platforms; the room state model, the host/guest roles and the chat signals cannot be standardized, and not every VOD site has it (suggested schema: room_id (required) · role (host|guest) · participant_count · asset_id · sync_position_sec)
- Event `interactive_overlay_clicked`: interactive overlays on a video (shoppable, in-video poll, branching) depend on each site's product and implementation, and the hotspot structure cannot be predefined (suggested schema: overlay_id (required) · overlay_type (shoppable|poll|branch|link) · asset_id · position_sec · action_value)
- Event `intro_skipped`: the "Skip intro/previous-episode recap" button depends on each studio's/site's manual markers and cannot be predefined without content segment metadata (as it matures it can be upgraded to chapter_skipped) (suggested schema: asset_id (required) · skip_type (intro|recap|credits) · from_position_sec · to_position_sec)
- Event `profile_switched`: a multi-profile system (kids/adult) and its ownership model are specific to platforms with this capability, and the profile schema is not the same across sites (suggested schema: from_profile_id · to_profile_id (required) · is_kids_profile · profile_count)
- Event `live_reaction_sent`: real-time reactions on a live stream (in-stream emoji/like) are a native feature of each live player, and there is no standard global reaction vocabulary; different from `reaction_added` because it is live-stream, per-frame and not persisted (suggested schema: asset_id (required) · reaction_type · stream_position_sec · is_live (true))

##### Shown in the VOD dashboard
- **Top-bar KPIs — Plays and Unique Viewers** — count of `content_started` and COUNT DISTINCT of viewers with at least one play in the selected range — Source: content_started, video_started — Type: KPI card with a trend spark-line
- **Total Watch Time and average per play** — total watch time from the sum of consecutive heartbeat intervals; average = total watch time ÷ number of plays — Source: video_heartbeat, content_started — Type: KPI card + daily bar
- **Audience Retention Curve (drop-off curve)** — percentage of viewers still watching at each `position_sec` point relative to the start, from the distribution of each session's last position — Source: video_heartbeat, content_started, video_completed — Type: line/area curve (X axis = percentage of the content length)
- **Completion Rate by title/genre** — completion rate = `video_completed` (placement=content) ÷ `content_started`, grouped by asset/genre — Source: video_completed, content_started — Type: horizontal bar (Top/Bottom titles)
- **Seek Heatmap** — density of `video_seeked` by `to_position_sec` on the content timeline; the most re-watched/most skipped sections — Source: video_seeked — Type: heatmap/density on the time bar
- **QoE playback quality panel** — Rebuffer Ratio = total duration of `video_buffered` ÷ total watch time; average Startup Time (from `startup_time_ms` on `video_started`); Error Rate = COUNT DISTINCT of sessions with `video_error` ÷ all sessions — Source: video_buffered, video_started, video_error — Type: KPI gauge + trend line by cdn/quality
- **Concurrent Viewers (for livestream)** — number of sessions with an active heartbeat in each time window (sampled from the heartbeat) — Source: video_heartbeat — Type: real-time / time-series line
- **Ad Performance** — Ad Completion Rate = `ads_video_completed` ÷ `ads_video_started`; Skip Rate = `ads_video_skipped` ÷ `ads_video_started`; CTR = `ads_video_clicked` ÷ `ads_video_started`, by ad_type — Source: ads_video_started, ads_video_completed, ads_video_skipped, ads_video_clicked — Type: grouped bar + KPI
- **Discovery-to-play funnel** — step-by-step pass-through rate `item_viewed` → `content_started` → `video_completed`, and the branch `recommendation_clicked` → `content_started` — Source: item_viewed, recommendation_clicked, content_started, video_completed — Type: funnel
- **Subscription funnel and Conversion display** — next to every traffic number, a conversion-rate column = the percentage of sessions that reached a conversion event; `paywall_viewed` → `trial_started` → `subscription_started` → `subscription_renewed` — Source: paywall_viewed, trial_started, subscription_started, subscription_renewed, subscription_cancelled — Type: funnel + conversion-rate column
- **Binge & Continue-Watching** — average consecutive episodes per session = count of `video_next_autoplayed` ÷ series sessions; return share = sessions with a resume (`video_started` with playback_source=continue_watching) ÷ all sessions — Source: video_next_autoplayed, video_started, content_started — Type: bar + KPI
- **Engagement Mix (playback speed, quality, subtitles)** — distribution of playback rate (`video_rate_changed`), share of sessions with subtitles on, and the distribution of `video_quality_changed` — Source: video_rate_changed, video_quality_changed — Type: stacked bar / donut

##### Presence in other Shahin services
- **Content**: playback events (`content_started`, `video_completed`, `video_heartbeat`), with asset/genre/series/channel, feed the content Engagement module: which title was actually watched, not just opened; Completion Rate and Watch Time per title/genre next to the article metrics, without a manual report.
- **Behavior / User Journey**: the sequence `item_viewed` → `content_started` → `paywall_viewed` → `subscription_started` as the behavioral path to conversion; the drop-off points of the subscription and discovery funnels, and the share of `recommendation_clicked` in playback starts.
- **Session Replay**: every event = a jump-point on the recording timeline, especially `paywall_viewed`, `video_error`, `ads_video_skipped` and `video_buffered`; the analyst sees exactly the moment of a stall or of hitting the paywall on the replay bar and follows the subsequent behavior.
- **AI Insights**: events + auto-properties (device_type, session_referrer, city, utm, isp_name) as the model's raw data → automatic combined insights such as "mobile viewers on a particular ISP have the highest rebuffer ratio and the most `video_interrupted`" or "users coming from Telegram have a higher trial→subscription conversion rate", without these slices being defined in advance.
- **Analytics**: every VOD event can be sliced with all its auto-properties in the traffic/segment reports; the conversion rate is read from the Report Builder funnel (with a chosen final step) for each traffic metric, with no marking mechanism and no limit on the number of conversions.


---


#### Pack 21 — FinTech & Wallet

This pack is the analytics backbone of any platform that moves money: a wallet, a neobank, a payment gateway, a bill-payment and top-up app, or an investment and lending service. The goal is simple: the financial owner must be able to follow the whole life of a transaction (from account activation and identity verification to a successful payment, a failure, a withdrawal and a refund) with the same discipline as Shahin's event layer. The pack's three core values: activation and payment funnels, transaction success and failure rates by gateway, and revenue health that accounts for negative effects such as refunds and chargebacks. The canonical owner of the KYC concept is Shahin; Authentication only references it.

> Every metric in this pack is built only from `amount`/`currency` and event counts; no rial-loss or RPM formula is proposed (Shahin's implementability rule). On every monetary financial event, `currency` is required so that Toman/rial totals stay unambiguous, and sensitive identifiers (Sheba/card/bill) are always recorded masked. On every `*_completed` event, the `transaction_id` field is also required so that refreshing the gateway callback page does not cause double counting (the same logic as `order_id` in E-commerce).

##### Owned events
- Event `account_opening_started` — the user starts the first step of the account or wallet opening form<br>Required fields: account_type · Implementation: requires site code
- Event `account_opening_completed` — the account or wallet opening was finalized successfully<br>Required fields: account_type, account_id · ✓ funnel goal step · Implementation: requires site code
- Event `kyc_started` — the user starts the identity verification (KYC) process<br>Required fields: kyc_level · Implementation: requires site code
- Event `kyc_step_completed` — a step of identity verification finished (national ID, selfie, face match)<br>Required fields: kyc_level, step_name · Implementation: requires site code
- Event `kyc_approved` — identity verification was approved (the final successful outcome, usually server-derived from the KYC service webhook)<br>Required fields: kyc_level · ✓ funnel goal step · Implementation: requires site code (source: server)
- Event `kyc_rejected` — identity verification was rejected<br>Required fields: kyc_level, rejection_reason · Implementation: requires site code (source: server)
- Event `bank_card_added` — the user links a bank card or Sheba to the account<br>Required fields: instrument_type · Implementation: requires site code
- Event `bank_card_removed` — a saved card or Sheba was removed<br>Required fields: instrument_type · Implementation: requires site code
- Event `wallet_topup_initiated` — the user starts a wallet top-up (the amount is confirmed and sent to the gateway)<br>Required fields: amount, currency · Implementation: requires site code
- Event `wallet_topup_completed` — the wallet top-up succeeded (a successful return from the gateway)<br>Required fields: amount, currency, transaction_id · ✓ funnel goal step · Implementation: requires site code
- Event `wallet_topup_failed` — the wallet top-up failed<br>Required fields: amount, currency, failure_reason · Implementation: requires site code
- Event `wallet_withdrawal_requested` — the user requests a withdrawal or settlement from the wallet to a bank account<br>Required fields: amount, currency · Implementation: requires site code
- Event `wallet_withdrawal_completed` — the withdrawal or settlement was finalized (usually server-derived after interbank clearing)<br>Required fields: amount, currency, transaction_id · ✓ funnel goal step · Implementation: requires site code (source: server)
- Event `wallet_balance_viewed` — the user views the wallet balance page or card<br>Required fields: none · Implementation: automatic from auto-properties
- Event `transfer_initiated` — the user starts a money transfer (wallet-to-wallet, card-to-card, Paya/Satna)<br>Required fields: amount, currency, transfer_type · Implementation: requires site code
- Event `transfer_completed` — the money transfer was completed successfully<br>Required fields: amount, currency, transfer_type, transaction_id · ✓ funnel goal step · Implementation: requires site code
- Event `transfer_failed` — the money transfer failed<br>Required fields: amount, currency, transfer_type, failure_reason · Implementation: requires site code
- Event `payment_initiated` — the user starts a payment (a service purchase or a payment gateway)<br>Required fields: amount, currency · Implementation: requires site code
- Event `payment_completed` — the payment was finalized successfully (a successful return from the gateway)<br>Required fields: amount, currency, transaction_id · ✓ funnel goal step · Implementation: requires site code
- Event `payment_failed` — the payment failed<br>Required fields: amount, currency, failure_reason · Implementation: requires site code
- Event `payment_retried` — the user tries again after a failed payment<br>Required fields: amount, currency · Implementation: requires site code
- Event `gateway_redirected` — the user was redirected to the bank payment gateway (leaving for Shaparak or a PSP)<br>Required fields: gateway · Implementation: requires site code
- Event `gateway_returned` — the user returned from the bank gateway to the site (callback), whether successful or not<br>Required fields: gateway, gateway_status · Implementation: requires site code
- Event `bill_payment_initiated` — the user starts a bill payment<br>Required fields: amount, currency, bill_type · Implementation: requires site code
- Event `bill_payment_completed` — the bill payment succeeded<br>Required fields: amount, currency, bill_type, transaction_id · ✓ funnel goal step · Implementation: requires site code
- Event `mobile_topup_completed` — a mobile top-up or bundle was purchased successfully<br>Required fields: amount, currency, operator · ✓ funnel goal step · Implementation: requires site code
- Event `loan_application_started` — the user starts an application for financing, a loan or credit<br>Required fields: product_type · Implementation: requires site code
- Event `loan_application_submitted` — the financing application was finally submitted (an intermediate funnel step, not the final outcome)<br>Required fields: product_type, requested_amount, currency · Implementation: requires site code
- Event `loan_approved` — the financing was approved (usually server-derived)<br>Required fields: product_type, approved_amount, currency · ✓ funnel goal step · Implementation: requires site code (source: server)
- Event `loan_rejected` — the financing application was rejected<br>Required fields: product_type, rejection_reason · Implementation: requires site code (source: server)
- Event `installment_paid` — the user paid an installment<br>Required fields: amount, currency, installment_index · ✓ funnel goal step · Implementation: requires site code
- Event `recurring_payment_setup` — the user enables automatic payment, automatic top-up or direct debit (a mandate is created; this is the terminal activation event, not a funnel step)<br>Required fields: mandate_type · ✓ funnel goal step · Implementation: requires site code
- Event `recurring_payment_cancelled` — the user cancels the automatic payment<br>Required fields: mandate_type · Implementation: requires site code
- Event `investment_order_placed` — the user places an investment order (fund, gold, crypto, stocks)<br>Required fields: instrument_class, order_side, amount, currency · Implementation: requires site code
- Event `investment_order_executed` — the investment order was executed or settled<br>Required fields: instrument_class, order_side, amount, currency, transaction_id · ✓ funnel goal step · Implementation: requires site code
- Event `transaction_failed` — a generic umbrella for any failed financial transaction that has no dedicated event<br>Required fields: transaction_kind, failure_reason · Implementation: requires site code
- Event `chargeback_received` — a dispute or reversal of a transaction was recorded from the bank's side (server-derived, a negative effect on revenue)<br>Required fields: amount, currency, transaction_id · Implementation: requires site code (source: server)
- Event `transaction_limit_reached` — the user reached the transaction cap, the daily withdrawal cap or the KYC level cap (a friction signal)<br>Required fields: limit_type · Implementation: requires site code
  - Dedup note: SaaS is the canonical owner of the general "cap reached" concept (`limit_reached`); this pack records the finance-specific version under the name `transaction_limit_reached` so it is not double-counted with the SaaS event.
- Event `transaction_history_viewed` — the user opens the transaction history or statement<br>Required fields: none · Implementation: automatic from auto-properties
- Event `security_action_performed` — the user performed a finance-specific security action (a second or dynamic PIN, a limit change, financial 2FA)<br>Required fields: action_type · Implementation: requires site code
  - Ownership note: this event covers only finance-specific security actions and is separate from the base MFA/account/recovery cluster. The canonical owner of `account_locked`, `account_unlocked`, `mfa_enrolled`, `mfa_disabled`, `mfa_challenge_shown`, `mfa_challenge_completed`, `recovery_code_used` and the base password/2FA events is **Authentication** (Security only references them); this pack does not define them.

##### Referenced events (from the core or another pack — not defined here)
- Event `refund_issued` ← E-commerce pack (COMMERCE funnel family, vertical=fintech): a refund to the customer; used in the "Negative revenue effect" widget as a revenue-negative event and never a positive conversion. Its canonical owner is E-commerce and it is not redefined here.
- Event `file_download` ← core: downloading a statement or receipt is the core `file_download` (the GA4 carve-out name is kept) with `file_type=statement`/`file_name`; the old domain event `statement_downloaded` was removed and turned into this reference. Used in the financial widgets as the receipt download event.
- Event `sign_up` ← core (owner: Authentication): account sign-up success at the identity level; the financial activation funnel starts after `sign_up` (the input to this pack's `account_opening_started`). Referenced for top-of-funnel attribution.
- Event `consent_updated` ← core (owner: Authentication): consent or privacy for processing financial data; referenced when financial tracking needs gating.
- Base identity/security cluster ← Authentication (Security references it): `account_locked`, `account_unlocked`, `mfa_enrolled`, `mfa_disabled`, `mfa_challenge_shown`, `mfa_challenge_completed`, `recovery_code_used`, `login`, `logout` and password reset; this pack defines none of them and only consumes them when needed for transaction-security context.
- Event `limit_reached` ← SaaS pack: the general "cap reached" concept; this pack's financial version is recorded as `transaction_limit_reached` (above), and SaaS owns the general version.

##### Custom Event candidates
- Event `crypto_swap_executed`: a crypto swap with a currency pair, floating fee and live price has a schema entirely specific to each exchange; `investment_order_executed` is generic, but a swap with two simultaneous assets and slippage cannot be standardized (suggested schema: from_asset, to_asset, from_amount, to_amount, rate, slippage_pct, network, fee, fee_asset)
- Event `gift_card_redeemed`: a gift card or voucher is an optional, brand-driven capability; the code structure, restrictions and funding source differ between sites (suggested schema: voucher_code_masked, face_value, currency, applied_to, remaining_balance)
- Event `savings_goal_created`: a piggy bank or smart savings goal is a product-specific widget; the goal logic, round-up rule and period differ in each app (suggested schema: goal_id, target_amount, currency, deadline, auto_rule_type, initial_deposit)
- Event `split_bill_created`: group bill splitting has a participants array with open cardinality; it cannot be predefined with fixed fields (suggested schema: split_id, total_amount, currency, participant_count, split_method, per_share_amount)
- Event `reward_cashback_applied`: each fintech's loyalty club or cashback has its own rules, rate and cap; the reward funding source cannot be standardized (suggested schema: reward_id, cashback_amount, currency, source_transaction_id, tier_name, balance_after)
- Event `fraud_alert_acknowledged`: the user's interaction with a fraud alert depends on the proprietary risk engine and the alert types specific to each system; the cause and the recommended action cannot be standardized (suggested schema: alert_id, risk_type, recommended_action, user_response, transaction_id)

##### Shown in the FinTech dashboard
- **Top-row KPI cards** — total successful transaction volume (TPV), number of transactions and average amount (the sum of `amount` on the `*_completed` events divided over the time range) — Source: wallet_topup_completed, payment_completed, transfer_completed, bill_payment_completed — Type: KPI cards with period-over-period delta
- **Payment Funnel** — the conversion rate of each step: payment_initiated → gateway_redirected → gateway_returned → payment_completed — Source: payment_initiated, gateway_redirected, gateway_returned, payment_completed — Type: vertical funnel chart
- **Transaction Success Rate** — completed divided by (completed + failed) for each transaction type — Source: payment_completed/failed, wallet_topup_completed/failed, transfer_completed/failed — Type: gauge + line trend
- **Failures by cause** — count of `failure_reason` and `failure_stage`, ranking the most frequent failure causes — Source: payment_failed, wallet_topup_failed, transfer_failed, transaction_failed — Type: horizontal bar / Pareto
- **Gateway performance** — success rate and average amount by `gateway`, comparing PSPs — Source: payment_completed, payment_failed, gateway_returned — Type: grouped bar
- **Financial user activation funnel (Onboarding)** — account_opening_started → kyc_started → kyc_approved → the first successful transaction — Source: account_opening_started, kyc_started, kyc_approved, wallet_topup_completed, payment_completed — Type: funnel chart
- **Identity verification (KYC) funnel** — the pass-through rate of each step and the rejection rate; kyc_started → kyc_step_completed → kyc_approved, with a kyc_rejected branch — Source: kyc_started, kyc_step_completed, kyc_approved, kyc_rejected — Type: funnel + breakdown on rejection_reason
- **Transaction Mix** — the share of each transaction type in total TPV (top-up, payment, transfer, bill, investment) — Source: wallet_topup_completed, payment_completed, transfer_completed, bill_payment_completed, investment_order_executed — Type: stacked area over time / donut
- **Negative revenue effect (Net Revenue Adjustment)** — the total of refund_issued and chargeback_received amounts as a deduction from TPV (a negative effect, separate from conversions) — Source: refund_issued, chargeback_received — Type: negative bar + ratio to TPV
- **Friction and caps** — the number of cap hits and their type, a signal for a KYC upgrade or a cap increase — Source: transaction_limit_reached, payment_retried — Type: bar by limit_type
- **Conversion rate panel (from the Report Builder funnel)** — a funnel is built in Report Builder for each goal step, and its rate is shown with a breakdown on auto-properties such as `device_type` and `session_referrer` — Source: wallet_topup_completed, payment_completed, transfer_completed, loan_approved, investment_order_executed — Type: rate cards from the funnel + trend line
- **Credit product revenue** — the loan funnel: loan_application_started → loan_application_submitted → loan_approved; and the installment_paid trend (repayment health) — Source: loan_application_started, loan_application_submitted, loan_approved, loan_rejected, installment_paid — Type: funnel + line trend

##### Presence in other Shahin services
- **Content / Behavior**: the Behavior module extracts the sequence wallet_balance_viewed → transaction_history_viewed → payment_initiated as a behavior pattern, and aggregates the most visited financial pages and products from the `entity_module` auto-property.
- **User Journey**: the full path to financial conversion (account_opening_started → kyc_approved → wallet_topup_completed → payment_completed), showing the exact drop-off point; a drop at gateway_redirected means a problem leaving for the gateway. The same payment-funnel data is seen here as a per-user path.
- **Session Replay**: every financial event is recorded as a jump-point on the timeline; the analyst sees the moment of payment_failed or transaction_limit_reached on the replay: where in the gateway form the user got stuck, what error they saw, where they exited. Especially useful for debugging payment failures and KYC abandonment.
- **AI Insights**: automatic crossing of financial events with auto-properties, e.g. "mobile users on gateway X have twice the payment_failed rate" from `device_type` + `gateway` + payment_failed, or "users coming from campaign Y have the most wallet_topup_completed" from `session_referrer` + utm, without manually defining a segment.
- **Analytics**: the same events are available in general reporting as sliceable dimensions on geo/device/utm; the conversion rate of goal steps is read from the shared Report Builder funnel (with no limit on the number of conversions).


---


#### Pack 22 — Customer Support

This pack standardizes the entire support interaction cycle from day one: from opening the chat widget and searching the help center to filing and resolving a ticket, live chat, the chatbot and the satisfaction survey. Shahin is the canonical owner of the "voice of the customer" concept (VoC: support ticket, NPS, feedback); the SaaS/B2B and Mobile App packs consume these events and do not declare them again. The pack's main value is measuring the "self-service deflection rate" (Deflection) and resolution quality: what share of the user's pain is solved with an article and the chatbot before it reaches the more expensive human channel. This pack does not yet have a PRD or a built dashboard and is a proposal on the V3 map.

##### Owned events
- Event `support_widget_opened` — the user opens the floating chat or support widget by clicking the bubble<br>Required fields: entry_point · Implementation: requires site code (it can be a Toggle only with a stable widget selector)
- Event `support_widget_dismissed` — the user closes the widget without starting a conversation (a friction signal, or an unwanted proactive message)<br>Required fields: entry_point · Implementation: requires site code
- Event `help_article_rated` — a click on "Was this answer helpful?" under a help article; a usefulness vote on help content, distinct from a social reaction<br>Required fields: article_id, rating · Implementation: requires site code
- Event `support_ticket_created` — filing a new ticket or support request (contact form, widget email, chat converted to a ticket); the pack's anchor event<br>Required fields: ticket_id, category, channel · Implementation: requires site code
- Event `support_ticket_updated` — the user sends a reply or a follow-up message on an existing ticket (a back-and-forth measure)<br>Required fields: ticket_id · Implementation: requires site code
- Event `support_ticket_resolved` — the ticket reaches the resolved or closed state; the basis of Resolution Rate<br>Required fields: ticket_id · ✓ funnel goal step · Implementation: requires a new field (time_to_resolution_sec is usually computed on the server side)
- Event `support_ticket_reopened` — the user reopens a resolved ticket (a negative resolution-quality signal)<br>Required fields: ticket_id · Implementation: requires site code
- Event `live_chat_started` — the start of a live support conversation (the user's first message or entering the queue)<br>Required fields: chat_id, channel · ✓ funnel goal step · Implementation: requires site code
- Event `live_chat_message_sent` — the user sends a message in a live conversation (interaction volume and conversation length)<br>Required fields: chat_id · Implementation: requires site code
- Event `live_chat_ended` — the end of a live conversation (closed by the user, the agent or a timeout); the basis of conversation duration and the abandonment rate<br>Required fields: chat_id · Implementation: requires site code
- Event `chat_queue_abandoned` — the user leaves the queue before being connected to an agent (a capacity or wait-time signal)<br>Required fields: chat_id · Implementation: requires site code
- Event `chatbot_session_started` — the start of an interaction with the support chatbot or automated assistant before a human agent; support scope, distinct from the AI pack<br>Required fields: bot_session_id · Implementation: requires site code
- Event `chatbot_intent_matched` — the chatbot recognizes the user's intent and gives an automatic answer; the basis of the bot coverage rate<br>Required fields: bot_session_id, intent · Implementation: requires site code
- Event `chatbot_escalated_to_agent` — the conversation is handed over from the chatbot to a human agent (the complement of the containment rate)<br>Required fields: bot_session_id · Implementation: requires site code
- Event `chatbot_resolved` — the chatbot solves the problem without needing an agent; the basis of Bot Containment Rate<br>Required fields: bot_session_id · ✓ funnel goal step · Implementation: requires site code
- Event `callback_requested` — instead of waiting in the queue, the user requests a callback<br>Required fields: channel · ✓ funnel goal step · Implementation: requires site code
- Event `csat_submitted` — the user submits the post-interaction satisfaction survey (CSAT); the main measure of support quality<br>Required fields: score, interaction_type · ✓ funnel goal step · Implementation: requires site code
- Event `nps_submitted` — the user submits an NPS score (0 to 10); the canonical owner of the VoC concept (the site sends nps_category, or Shahin derives it from score)<br>Required fields: score · Implementation: requires site code
- Event `ces_submitted` — the user submits a Customer Effort Score (a complement to CSAT)<br>Required fields: score · Implementation: requires site code
- Event `feedback_submitted` — submitting general feedback (bug, feature request, complaint) from the feedback form; the catch-all for the voice of the customer outside tickets<br>Required fields: feedback_type · Implementation: requires site code
- Event `support_contact_clicked` — a click on support contact links (phone, email, Telegram/WhatsApp); it overlaps with outbound_click on tel:/mailto, but adds the domain channel/contact_method<br>Required fields: contact_method · Implementation: requires site code
- Event `faq_expanded` — expanding an FAQ accordion item on the page; a light self-service signal, distinct from reading a full article<br>Required fields: faq_id · Implementation: requires site code

##### Referenced events (from the core or another pack — not defined here)
- Event `search_submitted` ← core (owner: Search & Discovery): help-center search is the enriched version of search; it maps with `search_context = "help_center"` and the generic search Toggle is switched off. The dashboard uses it for the successful-search rate before a ticket and as the base of the Deflection funnel.
- Event `search_no_results` ← core (owner: Search & Discovery): the zero-result state of help-center search with `search_context = "help_center"`; the input to the "zero-result search rate" metric in the knowledge base quality widget, instead of a manual field.
- Event `item_viewed` ← core / LIST/ITEM browse family (owner: Search & Discovery): viewing a help article's content with `item_type = "article"`; the Deflection containment column and knowledge base quality are built from this plus `help_article_rated`. (conv only with a discovery-driven referrer_surface; here it is non-conv consumption.)
- Event `outbound_click` ← core: the generic Toggle for tel:/mailto/messengers; in the channel breakdown of the dashboard, the domain version `support_contact_clicked` is the reference, and the generic outbound_click is switched off for these links.
- Event `shahin_page_view` ← core (auto-property): a view of the service status page is effectively the page_view on the status entity (`entity_module`); it needs no separate domain event, and incident fields, if any, are carried as optional params. The service-outage correlation widget is built from this plus `support_ticket_created`.

##### Custom Event candidates
- Event `cobrowse_session_started`: co-browsing or screen sharing is a highly site-specific capability; each implementation has a different schema and trigger and it cannot be made a default for everyone (suggested schema: cobrowse_session_started { session_link_id, initiated_by (user|agent), page_url(auto) }).
- Event `screen_recording_attached`: attaching a screen video recording to a ticket is a proprietary tool of some ticketing systems, and the concept and format of a "recording" depend on the site's tool (suggested schema: screen_recording_attached { ticket_id, recording_duration_sec, file_size_bytes }).
- Event `community_answer_marked_solution`: if a peer-to-peer support forum exists, it intersects with the Community pack, and the ownership or approval logic differs from site to site; if built, it must be coordinated with the Community pack's ENGAGEMENT verbs family, not here (suggested schema: community_answer_marked_solution { thread_id, answer_id, marked_by (op|moderator) }).
- Event `sla_breach_warning_shown`: showing an SLA breach warning exists only in certain enterprise support panels; the SLA definition and thresholds are contractual and site-specific, and Shahin does not know the threshold in advance (suggested schema: sla_breach_warning_shown { ticket_id, sla_type, hours_remaining }).
- Event `macro_suggestion_clicked`: a canned-response or macro suggestion is a proprietary widget of each help-desk tool, and its structure and event depend on the site's product (suggested schema: macro_suggestion_clicked { suggestion_id, intent, accepted (bool) }).

##### Shown in the Support dashboard
- **KPI strip at the top of the dashboard** — ticket volume, resolved tickets, Resolution Rate (the ratio of resolved to filed tickets) and average CSAT — Source: support_ticket_created, support_ticket_resolved, csat_submitted — Type: KPI cards with a trend vs. the previous period
- **Self-Service Deflection funnel** — the containment rate: what percentage of help searches and article reads were resolved without turning into a ticket (conceptually: one minus the ratio of filed tickets to the total of help searches and help article views) — Source: search_submitted, item_viewed, help_article_rated, support_ticket_created — Type: multi-step funnel
- **Bot Containment data narrative** — the bot containment rate (the ratio of conversations solved by the bot to all bot sessions) and the escalation rate (the ratio of those handed to an agent to all bot sessions) — Source: chatbot_session_started, chatbot_resolved, chatbot_escalated_to_agent — Type: stacked column chart (solved by bot / handed over / abandoned)
- **Contact channel breakdown** — the share of each channel in all contacts (channel on the ticket/chat plus contact_method on the contact click) — Source: support_ticket_created, live_chat_started, support_contact_clicked, callback_requested — Type: donut/pie
- **Ticket volume by category** — the most frequent categories: the number of filed tickets grouped by category, to identify product pain points — Source: support_ticket_created, support_ticket_reopened — Type: horizontal bar chart
- **CSAT / NPS / CES score distribution** — average CSAT, the NPS index (percentage of promoters minus percentage of detractors) and CES, plus the satisfaction trend over time — Source: csat_submitted, nps_submitted, ces_submitted — Type: gauge plus line trend
- **Knowledge base quality** — the article usefulness rate (the ratio of positive votes to help article views) and the zero-result search rate (the ratio of zero-result help-center searches to all of its searches) — Source: item_viewed, help_article_rated, search_submitted, search_no_results — Type: articles table with the usefulness rate and a "no results" badge
- **Resolution time and back-and-forth** — mean/median time to resolution and the distribution of the number of reopens; speed and stability of resolution — Source: support_ticket_resolved, support_ticket_reopened, support_ticket_updated — Type: resolution-time distribution histogram
- **Service-outage correlation with support volume** — the time overlap of service status page views and ticket filing; a simultaneous spike is a sign of an incident — Source: shahin_page_view, support_ticket_created, live_chat_started — Type: dual-axis time series
- **Conversion rate panel (from the Report Builder funnel)** — a funnel is built in Report Builder for each goal step, and its rate is the conversion rate — Source: support_ticket_resolved, live_chat_started, chatbot_resolved, callback_requested, csat_submitted — Type: rate card from the funnel

##### Presence in other Shahin services
- **Content (Engagement module):** help article views, usefulness votes and help-center search enrich the content engagement module; the help center is analyzed as a type of content (which help article was read and rated "helpful") with the same logic as the Article pack's read rate.
- **Behavior:** the time sequence of events builds the "pain to resolution" path; for example the chain zero-result search → widget opened → live chat started → CSAT submitted shows where self-service fails and the user moves to a more expensive channel; the drop-off point of the Deflection funnel is visible without a single metric.
- **Session Replay:** every support event is a jump-point on the recording timeline; the analyst sees the moment a ticket was filed or the queue abandoned on the replay bar, and follows which error_shown or shahin_client_error the user faced before that (visual context for the complaint).
- **AI Insights:** automatic crossing of events with auto-properties, e.g. "mobile users on a particular ISP abandon the chat queue the most" or "ticket category X correlates with device_type/os", built from the intersection of category/channel with device/geo/referrer without defining the slice in advance.
- **Analytics:** the goal steps (ticket resolved, live chat started, resolved by bot, callback requested, CSAT submitted) become the end point of a funnel in Funnel Builder, and the conversion rate is read from that funnel; the same record, with utm_*, lets us see which campaign generates the most support load.


---


#### Pack 23 — Travel & Booking

This pack follows user behavior across the whole travel cycle: from destination search and availability checks to completing the booking, ancillary services and the post-stay review. It is "reference-driven" by nature: most funnel steps are borrowed from the Commerce family (owner: E-commerce, with `vertical=travel`) and the List/Item family (owner: Search & Discovery, with `item_type=offer`), and the pack itself owns only the travel-unique behaviors that have no canonical home. All owned events require site code.

##### Owned events
- Event `availability_checked` — the user pressed the check availability or price button for a specific date and travelers, and the system responded (a strong intent signal before booking)<br>Required fields: offer_id · Implementation: requires site code
- Event `rate_plan_selected` — the user selected a specific rate or plan from the offer page (e.g. a double room with breakfast, or a refundable economy fare)<br>Required fields: offer_id, rate_plan_id · Implementation: requires site code
- Event `offer_unavailable_viewed` — the user saw an offer that is unavailable or full for the selected date or travelers (the travel equivalent of out-of-stock; distinct from `empty_state_viewed` and `search_no_results`)<br>Required fields: offer_id · Implementation: requires site code
- Event `offer_compared` — the user put two or more offers into the comparison tool<br>Required fields: offer_type · Implementation: requires site code
- Event `traveler_info_submitted` — the user filled in and confirmed the traveler information step (a travel-specific checkout step that carries the traveler age and type fields, so it is separate from the core `payment_info_submitted`/`shipping_info_submitted`)<br>Required fields: booking_id · Implementation: requires site code
- Event `ancillary_added` — the user added an ancillary service (travel insurance, extra baggage, seat selection, transfer, breakfast); deliberately kept separate from the core `add_to_cart`, because the main booking item is not modeled with add_to_cart<br>Required fields: booking_id, ancillary_type · Implementation: requires site code
- Event `booking_modified` — a change to an existing booking (date, travelers, upgrade) after confirmation; post-booking behavior that has no canonical equivalent in the core (E-commerce has no order_updated event)<br>Required fields: booking_id · Implementation: requires site code
- Event `price_alert_created` — the user set a price alert for a route or destination (the travel equivalent of back-in-stock/price-drop; a deferred-intent signal and lead capture)<br>Required fields: alert_type · ✓ funnel goal step (a micro-conversion for a returnable lead) · Implementation: requires site code

##### Referenced events (from the core or another pack — not defined here)
- Event `review_submitted` ← Marketplace pack: submitting a review or rating for a past stay or trip; the canonical owner of this behavior is Marketplace, and Travel only consumes it (in the travel dashboard it is a stay-quality and trust-building signal)
- Event `search_submitted` ← core: destination search with `search_context=travel` and `search_scope` (hotel|flight|tour); the input to the booking funnel and the high-demand destinations widget. Domain parameters (origin/check_in/pax) are carried as optional fields on this same event
- Event `search_no_results` ← core: a no-result search with `search_context=travel`; the basis of the "demand gap" widget
- Event `item_list_viewed` ← Search & Discovery pack: showing results with `item_type=offer` and `list_type=search`; the results step in the booking funnel and the basis of the look-to-book rate
- Event `item_list_filtered` ← Search & Discovery pack: applying a filter to results with `item_type=offer` (stars/price/time/stops as filter_type/filter_value); a step of the cross-service behavioral path
- Event `list_item_clicked` ← Search & Discovery pack: a click on a result card with `item_type=offer`
- Event `item_viewed` ← Search & Discovery pack: the offer details page with `item_type=offer`; the detail step in the funnel (counted as a conversion only when referrer_surface is in {search, list, recommendation}, i.e. discovery-attributed)
- Event `add_to_wishlist` ← E-commerce pack: saving an offer (formerly offer_saved) with `vertical=travel`; the deferred-intent and recovery widget
- Event `begin_checkout` ← E-commerce pack: starting the booking (formerly booking_started) with `vertical=travel`; the booking start step in the funnel (non-conv, only a funnel step)
- Event `payment_info_submitted` ← E-commerce pack: the deepest pre-purchase step with `vertical=travel`; the closest intent before purchase and a funnel goal step
- Event `coupon_applied` ← E-commerce pack: a discount code successfully applied in the booking, with `vertical=travel`
- Event `coupon_denied` ← E-commerce pack: a discount code rejected (expired or invalid), with `vertical=travel`
- Event `purchase` ← E-commerce pack: completing the booking (formerly booking_completed) with `vertical=travel`; the revenue moment and the dashboard's main conversion. booking_id/order_id is the dedup key against a refresh of the gateway callback page; value=subtotal, with tax/fees separate; travel fields (lead_time_days/trip_length_nights/is_round_trip) are carried as optional
- Event `refund_issued` ← E-commerce pack: a refund with `vertical=travel`; revenue_impact=negative and non-conv; the input to the net value widget
- Event `outbound_click` ← core: the floor; for the metasearch model, a deep link to the supplier's site (non-conv by default, but Travel can toggle it to conv per workspace for referral revenue)
- Event `form_started` ← core: the Toggle floor; starting to fill in the search or traveler form, no code needed
- Event `login` ← Authentication pack: the user logging in during the booking process; consumed from Authentication and deduplicated, not declared again here
- Event `sign_up` ← Authentication pack: the user signing up during the booking process; the canonical sign_up is consumed from Authentication

##### Custom Event candidates
- Event `map_pin_explored`: interacting with an interactive results map (zoom/pan/pin click) depends on each site's map widget and map SDK (Neshan or Google) and has no common schema across sites (suggested schema: map_pin_explored { destination_id, interaction: zoom|pan|pin_click, visible_offers_count })
- Event `itinerary_built`: a multi-step or multi-city trip builder (multi-city planner) is a custom feature, and its steps and objects differ from site to site (suggested schema: itinerary_built { itinerary_id, step_name, legs_count, total_value, currency })
- Event `virtual_tour_interacted`: a 360° virtual tour or panorama depends on each site's own player, and the interaction model (hotspot or rotation) has no shared standard (suggested schema: virtual_tour_interacted { offer_id, action: open|rotate|hotspot_click, dwell_seconds })
- Event `loyalty_points_redeemed`: each operator's loyalty program or wallet has different rules and units; until a dedicated Loyalty/FinTech pack is built, it has no single predefinable schema (suggested schema: loyalty_points_redeemed { points, balance_after, booking_id, currency_value })
- Event `chat_assistant_used`: each site's booking assistant or chatbot is different and belongs to the AI/LLM pack, not Travel; the events and intents are custom (suggested schema: chat_assistant_used { conversation_id, intent, resolved: bool, led_to_booking: bool })

##### Shown in the Travel dashboard
- **Booking Funnel** — transition rate of each step = sessions reaching each step ÷ the previous step; overall conversion rate = purchase ÷ search_submitted — Source: search_submitted, item_list_viewed, item_viewed, availability_checked, begin_checkout, payment_info_submitted, purchase — Type: vertical funnel chart with the drop-off percentage at each step
- **Revenue and booking KPI cards** — number of successful bookings = count of purchase; gross value = total value; net value = value minus refund amounts and cancelled bookings; average value = value ÷ count — Source: purchase, refund_issued — Type: KPI card with delta vs. the previous period
- **Conversion rate by slice (from the Report Builder funnel)** — for the goal step (purchase or payment_info_submitted) a funnel is built in Report Builder, and its rate is shown per slice next to the traffic volume, per §5.4 — Source: purchase, payment_info_submitted — Type: rate card from the funnel
- **High-demand destinations and routes** — search and booking volume by destination_id; the look-to-book rate of each destination = purchase ÷ item_list_viewed for that destination — Source: search_submitted, item_list_viewed, purchase — Type: heat map / horizontal top-N destinations bar
- **Demand Gap** — share of no-result searches = search_no_results ÷ search_submitted; destinations and dates with demand but no availability — Source: search_no_results, offer_unavailable_viewed, search_submitted — Type: horizontal bar of top no-result destinations with a time trend
- **Payment drop-off analysis** — payment failure rate = failures ÷ (failures + purchase); a booking failure is computed from the funnel itself as the absence of purchase after payment_info_submitted (there is no separate booking_failed event; failure_reason as a new field if needed) — Source: payment_info_submitted, purchase — Type: stacked bar by drop-off stage
- **Booking horizon and length of stay** — distribution of lead_time_days (the gap from booking to the trip) and trip_length_nights from the optional fields on purchase — Source: purchase — Type: distribution histogram
- **Ancillary attach rate (ancillary revenue)** — attach rate = bookings with ancillary_added ÷ all purchase; the share of ancillary value in total value — Source: ancillary_added, purchase — Type: donut with an attach-rate KPI
- **Deferred intent and recovery** — volume of add_to_wishlist (formerly offer_saved) and price_alert_created, and their subsequent conversion rate to purchase within a time window — Source: add_to_wishlist, price_alert_created, purchase — Type: bar with an attached conversion rate
- **Campaign effect on bookings** — bookings and conversion rate by utm_source/utm_campaign (from auto-properties): which channel brings bookings, not just clicks — Source: search_submitted, purchase — Type: comparative channel bars with a conversion-rate column

##### Presence in other Shahin services
- **Content/Behavior (Engagement) / User Journey**: the time sequence of events builds the behavioral path to a booking; the chain search_submitted → item_list_filtered → item_viewed → availability_checked → begin_checkout → purchase shows through which path users reach a booking and where they drop off (e.g. after availability_checked)
- **Session Replay**: every event becomes a jump-point on the session recording timeline; the analyst sees exactly the moment of offer_unavailable_viewed or a payment drop-off on the replay bar and follows where the user got stuck; invaluable for debugging payment drop-off
- **AI Insights**: events plus auto-properties are the model's raw data; an automatic combined insight such as "mobile users coming from Instagram have 2x the conversion rate on beach destinations" is built from crossing session_referrer, device_type and destination_id with purchase, without a segment being defined in advance
- **Analytics**: the capture-once, consume-many-times principle; the same records become the end point of a funnel in Funnel Builder, and the conversion rate (purchase ÷ session) is read from that funnel; slicing by utm/geo/device comes free from auto-properties


---


### 7.4. Where the packs sit relative to product scope

> **Product scope is two business types, E-commerce and Media, plus one horizontal Video pack that is consumed in both (not a standalone business type).** Reference: [`00-Business-Model.md`](./00-Business-Model.md) section 5.
> The old phasing (V1 to V3) was removed: that model assumed all packs were on the roadmap and only their order differed, which is no longer true.

**In-scope packs** — these feed the overview of the two business types (E-commerce and Media) and the horizontal Video pack:
Video · Article & Content · Gallery · E-commerce · Search & Discovery · Authentication · Subscription / Paywall · Navigation & Forms · Community

**Schema-track candidate packs** — these are future business types, not throwaway work. We have no integration point for them, so when a customer of that type arrives they are delivered through the **schema track**: the business type's overview is built from this catalog, and the customer's developer implements the events. Having the catalog ready means that day one does not start from zero.
Audio & Podcast · Advertising · Education / LMS · SaaS / B2B · Gaming · Marketplace · Mobile App · AI / LLM · API Analytics · Security · VOD · FinTech & Wallet · Customer Support · Travel & Booking

**The product commitment covers only the current scope.** A pack being on the list above means its catalog is ready, not that it is on the roadmap.

**Rule for entering scope:** either we have an integration point for its business type, or a real customer is waiting for it.
