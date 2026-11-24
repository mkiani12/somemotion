# Shahin Help Center — Video Analytics

> Extracted verbatim from `Service-Events-Help-Center.md` (also included in full in this folder).

### Introduction

The whole video experience is built around a single question: when a viewer abandons a video, is the content to blame or the technical quality of playback? Shahin's advantage is that it has both the page context and the video context at the same time; that is why it can separate "the user was not interested" from "the network had a problem" — the very line that sets this dashboard apart from general-purpose tools. This is a horizontal pack: any business that has video can turn it on. Menu path: Shahin › Events › Video Analytics.

### What questions does it answer?

- Where do viewers abandon a video, and is the content or the playback to blame?
- How did the user reach the video in the first place — is it also visible in Google Search?
- Which content holds viewers, and which video is evergreen and a go-to reference?
- Where does playback slip technically, and on which device or carrier?
- What business value did the video create — how did ads and calls to action perform?

### How is it turned on?

It works with the video pack events: play start (with a "play source" property: manual, autoplay, recommended), progress, completion, buffer, stall, quality change, download and ad events. Two important points:

- Shahin does not show the dead statistic of "total uploaded catalog"; it only counts videos that had at least one real play in the range.
- Some metrics hold their place with sample data under a "Next phase" badge because their events are not being sent yet (impression-to-play rate, playback error rate, CTA click rate). The "Search visibility" band also depends on Google Search Console access, and until then its numbers are estimates.

### Global filters

The bar at the top of the page has a date range (with comparison to the previous period or last year) and a single filter panel: video, content category, video duration, how playback started, device, internet carrier, location, referrer, campaign, user type and bot traffic. Two subtle points:

- **Video duration** is deliberately a filter, because watch depth and completion rate can only be compared fairly between videos of similar length; a 30-second clip and a 40-minute documentary should not be judged by the same rate.
- **The quality-level filter (1080p/720p) has been deliberately removed**, because in adaptive streaming the quality changes several times within a session, and "a 720p session" has no clear definition. Quality is only a reporting dimension, not a filter dimension.

### Discovery zone

- **Videos watched** — the number of unique videos played at least once in the range; a measure of the breadth of your active catalog.
- **Impression-to-play rate (next phase)** — out of every 100 people who saw the cover, how many started playback; a signal of how appealing the cover and title are.
- **Video share of page engagement** — a Shahin signature metric: what share of the user's total time on the page is spent inside the player. **How to read it:** if this share is high, the video carries most of the page's engagement; if it is low, the video plays a marginal role and you should reconsider its placement.
- **Search visibility band** — a user's first encounter with your video is not necessarily on your site; it is in Google results. This band shows the organic discovery funnel (impression → click → view), two index-health and valid-schema gauges, and the queries that led to views. "Views from search" and the queries are estimates: Google app traffic is split between Search and Discover based on Search Console clicks. **How to read it:** fixing your video schema (VideoObject markup) is usually the highest-return SEO task, because it is a markup change, not content production.

### Engagement zone

At the center of this zone is a combined card that shows a related trio in one place: average watch percentage (ring), average watch time and average video duration. These three are read together — watching 3:42 of a 5:58 video is the same 62% shown in the ring. Next to it are total watch time, full completion rate, replay rate and download rate.

- **Average watch percentage** equals average watch time divided by video duration. A measure of watch depth, independent of length.
- **Full completion rate** equals completions divided by play starts, where "full" means 90% or more — to remove the effect of skipping the last few seconds.
- **Replay rate** is the share of unique viewers who watch a video again in separate sessions; a sign of evergreen, go-to content.

The charts in this zone: the watch-time trend (a gradual drop is usually about content, a sudden drop is technical), how playback started (manual/autoplay/recommended; a high autoplay share alongside low completion means a mismatch with user intent), and a five-step playback completion funnel.

- **How to read the completion funnel:** video consumption is non-linear (users skip forward and back), so these steps are independent milestones, not a mandatory funnel; the main thing to look at is the gap between two steps — a steep valley means the script or edit lost its pull right there. The **Category breakdown** button splits this same funnel into three content categories (educational/entertainment/news).

### Playback technical quality zone

- **Stall rate** — the share of sessions in which the player froze completely; more serious than buffering (buffering means the player waited and continued, a stall means it froze or crashed). Target: under 1%.
- **Playback error rate (next phase)** — the share of plays that failed before the first frame was shown, so the video never started.
- **How to read it (the golden breakdown):** the most common mistake in video analytics is lumping all technical errors under one vague umbrella. Shahin deliberately separates them so each error goes straight to the team responsible for it: stalls point to the player and browser layer, playback errors to the backend, encoding and CMS, and buffering (a context column in the tables) to the network and CDN.

The charts in this zone: dominant quality for viewing and downloads (viewing usually concentrates on 720p because of bandwidth limits, but downloads skew toward high quality because users keep the better version for offline use), adaptive quality downgrades, and the user-environment component (the distribution of device/OS/browser/brand with a buffer-rate column that reveals problem environments).

### Monetization zone

All rates are measured against ads started: ad completion rate, ad skip rate, ad abandonment rate and CTA click rate (next phase).

- **How to read it:** "ad skip rate" means the user skipped the ad but stayed; "ad abandonment rate" means the viewer left as soon as the ad started — the latter marks the line where ads become annoying. "CTA click rate" is different from ad clicks: an ad click is on the advertiser's promotion and measures ad revenue, while a CTA click is on your own site's call to action (buy, sign up, next lesson) and measures the video's business impact for the site owner. Below these cards is an ad performance table broken down by position (pre-roll/mid-roll/post-roll).

### Single-video exploration zone

From aggregate data to diagnosing a single video: a table of videos with search and customizable columns, and a details panel for each video. Two special views live only in this panel:

- **Moment-by-moment audience retention** — the percentage of the audience remaining at each moment of the video; a sharp drop pinpoints the exact content problem.
- **Seek heatmap** — the density of seeks along this video. It exists only in the single-video panel because aggregating seeks across all videos is meaningless.

### Finer concepts and statistical honesty

- **All technical rates are counted per unique session.** This is deliberate, so a single problematic session cannot inflate the number and no rate goes above 100%. All percentages are shown with two decimal places.
- **A viewer means a unique user.** A "viewer" is a unique user who played at least one video in the range, not a play count and not an amount.
- **Minimum-sample guard.** Any campaign or segment with a denominator below 100 is set aside as "Insufficient data" and does not trigger an alert; division by zero shows "—".
- **Autoplay contamination.** To compare with industry benchmarks, autoplay sessions should be segmented separately, because they do not represent user intent and systematically pull rates down.

---
