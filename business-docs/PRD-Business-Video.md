# Video Dashboard — Video Analytics

**Service:** Events
**Type:** Horizontal pack (not a business type) — "Video" is an activatable pack that both **media** and **e-commerce** businesses can turn on; the Video pack's reference catalog is in Strategy-Predefined-Events.md.
**Status:** Final — V4 (synced with the live demo; the conversion banner was removed and the completion metrics were redefined as "completion rate")
**Gallery template:** this dashboard is also «ویدیو و پخش» (Video & streaming) in the report-builder gallery, under «ساخت شاهین ▸ نوع کسب‌وکار» (Decision-Log, decision 19). Its roles bind to the pack events the project sends, and saving it gives the customer an independent dashboard. Reference: `report-builder/v12` → gallery.
**Reference wireframe:** `wireframes/video-dashboard/v36.html` (active version, served on `localhost:8012`) — version `v33` is kept for comparison only, and its only difference is the presence of the standalone buffer metrics.
**Related:** [README.md](./README.md)

> This document holds both the PRD and the presentation narrative of the video dashboard in one place: for each card/chart, first the **narrative** (why it is here), then the **precise definition and logic** (conceptual formula, counting unit, status) and the **bilingual tooltip ⓘ**. Per PM decision, on-screen tooltips contain only "title + definition"; formulas, thresholds and event names do not appear in them; the conceptual formulas live only in this document.

---

## Overview

The **Video** dashboard organizes the entire video experience around **one single question**: when a user abandons a video, is the **content** to blame or the **technical playback quality**? User behavior is split into two layers: the content layer (completion rate and watch depth) and the infrastructure layer (player stalls and playback errors; buffering as a context column in the tables). Separating "the user was not interested" from "the network had a problem" is exactly the line that sets Shahin apart from generic tools, because Shahin holds both the page context and the video context at the same time.

Around this core sit two business lenses: **acquisition** (how did the user reach the video in the first place?) and **monetization** (what business action did the video generate?). The page layout is a step-by-step narrative funnel of the viewer's journey.

### Placement in the Shahin menu

Under the **Events → Video analytics** group (the horizontal Video pack). Breadcrumb: "Shahin › Events › Video analytics".

### Product goal of the page

This page drives decisions for **three roles**: the editor/content team (which content holds viewers), the infrastructure/technical team (where playback slips) and the product manager (what business and discovery value video creates). Every metric on the page must illuminate one of these decisions, not merely show a number.

---

<a id="user-question"></a>

## User question this dashboard answers

**The pain:** Viewers stop watching, and the number alone cannot say why. Completion falls for two very different reasons — the content stopped holding the viewer, or the player stalled, failed or dropped quality — and the two belong to different teams. Lumping them together sends the editor to fix a network problem and the engineer to fix a script. A viewer who leaves has not always lost interest.

**The main question:**

> "When viewers abandon my videos, is the content to blame or the technical playback quality?"

**Supporting questions → where the page answers them**

- Is it the content — viewers losing interest at the opening or midway, or never having chosen to watch at all? → Combined card "Watch depth and time"; Chart — Completion funnel and its `By category` view; Chart — Playback source.
- Or is it the playback — and which layer should fix it: the player, the backend, or the network? → Stall rate; Playback error rate ⚙ Next phase; Chart — Adaptive quality drops; "User environment" component and its buffer rate column; Chart — Watch time trend (a sudden drop rather than a gradual decline).
- For one specific video, at which moment and in which environment does the audience leave? → Videos table; Video detail panel: Moment-by-moment audience retention, Seek heatmap, Device split and Carrier split.
- Is the growth problem that a video is not seen, or that it is not compelling enough to click? → Zone 1 — Discovery: Videos viewed, Impression-to-play rate ⚙ Next phase, Page engagement share, and the "Search visibility" band (Organic discovery funnel, Index and schema health, Queries driving plays).
- Does the video do business work, or do its ads drive viewers away? → Ad KPI row: Ad completion rate, Ad skip rate, Ad-driven drop-off, CTA click rate ⚙ Next phase; Table — Ad performance by position.

---

## The backbone of the whole dashboard — one question

The master narrative, which every section serves:

> **When a viewer abandons a video, is the "content" to blame or the "technical playback quality"?**

The content side is told by **completion rate** and **watch depth**; the technical side by **stalls** (player) and **playback errors**, together with buffer context columns in the tables. All around this core sit two more lenses: the **discovery and acquisition** lens and the **monetization** lens.

> **Calculation ledger:** all rates are displayed with two decimal places; all technical rates are counted on `DISTINCT session_id` so that one troubled session does not inflate the number.

---

## Layout — five zones without section titles

The page is laid out as one continuous narrative funnel from top to bottom — in the order of the viewer's journey. Per PM decision, **there are no section titles on the page**; zones are separated only by layout rhythm (KPI row → that zone's charts), and titles sit only on cards/charts:

1. **Discovery** — how the user found the video (including the zero point of discovery in Google).
2. **Engagement** — how long they stayed, how far they watched and which behavior repeated.
3. **Technical playback quality** — how technically healthy playback was.
4. **Monetization** — what business action the video generated.
5. **Single-video exploration** — the videos table and the detail panel.

Global implementation rules: all icons from the Phosphor pack; all charts in ECharts with the design system's color tokens; all controls genuinely functional (no decorative controls); bilingual FA/EN and dark/light theme.

---

## Global filters

The top bar of the page has two components: **Date range** (a standalone component with a comparison tab for previous period/last year) and the **Filters** button, which opens the single drawer panel with these sections (edits are a draft and are applied with `Save filters`):

- **Video** — select one or more specific videos with search; with no selection, all videos are shown together.
- **Content category** — News, Education, Sports, Entertainment, Documentary, Music.
- **Video duration** — All / Short (under 1 min) / 1–5 min / 5–20 min / Long (over 20 min). Watch depth and completion rate can only be compared fairly between videos of similar length.
- **Playback source** — Manual / Autoplay / Suggested (a click on a suggested video). The final term is "Suggested" (Persian: «پیشنهادی»), not "recommender" («توصیه‌گر»).
- **Device** — type (desktop/mobile/tablet/smart TV), browser, operating system.
- **Internet carrier** — Irancell, Hamrah-e Aval, Mokhaberat, Shatel, Rightel, Other; for tracking playback-quality problems that trace back to a specific network.
- **Location** — the viewer's country or city, with search.
- **Referrer** — channels / source / domain.
- **Campaign (UTM)** — campaign / source / medium.
- **User type** — All / Returning / New.
- **Bot traffic** — default "Exclude bots"; can be included for audits.

> **Removed filter — playback quality:** the quality-level filter (1080p/720p/…) was deliberately removed because in adaptive streaming the quality changes several times within a single session, so "720p sessions" has no clear definition. Quality is only a reporting dimension (the "Dominant watch and download quality" card), not a filter dimension.

---

## Zone 1 — Discovery

Before the user presses play, they have to find the video. The goal of this zone: determine whether the growth problem lies in **not being seen** or in **not being compelling enough to click**. First the on-site KPI row, then the distinct "Search visibility" band.

### Videos viewed

We do not show the dead statistic of "total uploaded catalog"; Shahin only counts videos that generated at least one real playback event in the selected range. Shahin does not see "uploads" except through a direct integration with the customer's VOD/CMS.

**Card tooltip ⓘ:**

Persian: تعداد ویدیوهای یکتایی که در بازه انتخابی دست‌کم یک‌بار پخش شده‌اند؛ شاخصی برای وسعت کاتالوگ فعال.

English: The number of unique videos played at least once in the selected range; a measure of the active catalog's breadth.

### Impression-to-play rate ⚙ Next phase

Out of every 100 people who saw the video cover, how many started playback — a signal of cover and title appeal. **Status:** requires the `video_impression` event; the card holds its place with a sample value and a `Next phase` chip. Conceptual formula: "video_started ÷ video_impression × 100".

**Card tooltip ⓘ:**

Persian: از کاربرانی که کاور ویدیو را دیدند، چه سهمی پخش را شروع کردند؛ نشانه جذابیت کاور و عنوان.

English: Of users who saw the video cover, the share who started playback; a signal of cover and title appeal.

### Page engagement share

Shahin's signature metric: a bridge metric between page analytics and video, which only Shahin has because it holds both contexts at the same time. Conceptual formula: "video watch time ÷ total time on page × 100".

**Card tooltip ⓘ:**

Persian: سهمی از کل زمان حضور کاربر روی صفحه که داخل پلیر ویدیو می‌گذرد؛ نشان می‌دهد ویدیو وزن اصلی تعامل صفحه را دارد یا نقش حاشیه‌ای.

English: The share of a user's total time on the page spent inside the video player; shows whether video carries the page's engagement or plays a side role.

### The "Search visibility" band — the zero point of discovery

The user's first encounter with the video is not necessarily on our site; it is in Google results. The data source is **Google Search Console** (not the on-page SDK), so it depends on backend access approval (Khashayar), and until then the numbers are estimates. The band's distinct appearance only separates the source, not the narrative. Three components:

- **Organic discovery funnel:** three steps — Google impressions → clicks → plays from search — in the standard stepped funnel form (form described in Zone 2) with **honest proportions** (bar heights are truly proportional even when the drop is steep); each step's click-through rate and play-through rate appear in the caption below the chart.
- **Index and schema health:** two ring gauges — "Indexing rate" and "Valid schema" (VideoObject markup). Presentation note: fixing schema is the highest-return SEO task, because it is a markup change, not a content change.
- **Queries driving plays:** a ranked list of real searches that brought a viewer who then played; requires a join between the Search Console query and the same-session playback event.

**Band tooltip ⓘ:**

Persian: اولین برخورد کاربر با ویدیوی شما در نتایج گوگل، پیش از ورود به سایت؛ داده این بخش از Google Search Console می‌آید.

English: The user's first encounter with your video in Google results, before they reach the site; this section is fed by Google Search Console.

**Discovery funnel tooltip ⓘ:**

Persian: سه گام کشف در گوگل — نمایش، کلیک و تماشا؛ افت میان گام‌ها محل گلوگاه ارگانیک را نشان می‌دهد.

English: The three discovery steps in Google — impressions, clicks, and resulting plays; the drop between steps locates the organic bottleneck.

**Queries tooltip ⓘ:**

Persian: جستجوهایی که کاربری آورده‌اند که سپس روی صفحه ویدیو پخش کرده است؛ راهنمای مستقیم نقشه محتوا.

English: Searches that brought a user who then played a video on the page; a direct guide for the content roadmap.

---

## Zone 2 — Engagement

The user has started playback. This zone opens with a **single combined card** (PM decision: instead of a row of six uniform cards), followed by the engagement charts.

### Combined card "Watch depth and time"

Three visual forms in one card, to break uniformity and show how the metrics relate:

- **Average watch-percentage ring** (a ring gauge, the zone's primary value) with the period delta.
- **Next to the ring, two related time measures:** "Avg watch time" and "Avg video duration" — the related trio is read in one place (watching 3:42 of a 5:58 video is the same 62% in the ring).
- **Stats column:** total watch time, full-completion rate, replay rate, download rate — compact rows with delta chips.

Conceptual formulas: average watch percentage = "average watch time ÷ video duration × 100" · full-completion rate = "video_completed ÷ video_started × 100" (complete means 90%+, to remove the effect of skipping the last few seconds) · download rate = "sessions with a download ÷ total playback sessions × 100" — **download is live** (PM decision; removed from the next-phase list).

> **Autoplay contamination:** for comparison with industry benchmarks, autoplay sessions must be segmented separately, because they do not represent user intent and systematically pull the rates down.

**Card tooltip ⓘ:**

Persian: تصویر یکپارچه از ماندن بیننده پس از شروع پخش: چه سهمی از ویدیو دیده می‌شود، چقدر زمان صرف می‌شود و چه رفتاری تکرار می‌شود.

English: One picture of viewer staying power after play: how much of a video gets watched, how much time is spent, and what behavior repeats.

**Measure tooltips ⓘ (each on its own label):**

Persian: به‌طور میانگین چه سهمی از طول ویدیو تماشا می‌شود؛ سنجه عمق تماشا، مستقل از طول ویدیو. / سهم پخش‌هایی که به انتهای ویدیو رسیدند؛ مکمل میانگین درصد تماشا که عمق متوسط است. / میانگین زمانی که هر بیننده در یک پخش تماشا می‌کند؛ در کنار میانگین مدت ویدیو معنا پیدا می‌کند. / میانگین طول ویدیوهای پخش‌شده در بازه؛ مرجعی که میانگین زمان تماشا را معنادار می‌کند. / مجموع زمان واقعی تماشای همه بینندگان در بازه انتخابی. / سهم بینندگان یکتایی که یک ویدیو را در نشست‌های جداگانه دوباره تماشا می‌کنند؛ نشانه محتوای ماندگار و مرجع. / سهم نشست‌هایی که به‌جای تماشای آنلاین، ویدیو را دانلود کردند؛ نشانه مصرف آفلاین و ارزش نگه‌داشتنی محتوا.

English: On average, the share of a video's length that gets watched — depth independent of duration. / The share of plays that reached the video's end; the companion to avg completion, which is average depth. / The average time a viewer watches per play; read it alongside average video duration. / The average length of the videos played in the range; the reference that gives meaning to average watch time. / The total real watch time across all viewers in the selected range. / The share of unique viewers who re-watch a video in separate sessions; a signal of evergreen, reference-grade content. / The share of sessions that downloaded the video instead of streaming it; a signal of offline consumption and content keepability.

### Chart — Watch time trend

A line chart of daily average watch time. A gradual decline = content-quality drift; a sudden drop = a technical problem. It has no local toggle and takes its range/granularity from the global filters (an informational chip on the card). The `View as table` button opens the same data in a table modal with CSV export.

**Chart tooltip ⓘ:**

Persian: میانگین زمان تماشای روزانه در بازه انتخابی؛ افت تدریجی معمولا محتوایی است و افت ناگهانی فنی.

English: Daily average watch time over the selected range; a gradual decline usually points to content, a sudden drop to a technical issue.

### Chart — Playback source

A donut breaking down how playback starts: Manual / Autoplay / Suggested, with each group's completion rate in the slice tooltips. Presentation narrative: if the autoplay share rises but that group's completion is low, the autoplay placement does not match user intent.

**Chart tooltip ⓘ:**

Persian: تفکیک شروع پخش‌ها به دستی، پخش خودکار و پیشنهادی (کلیک روی ویدیوی پیشنهادی)؛ سهم بالای پخش خودکار در کنار اتمام پایین یعنی ناهمخوانی با قصد کاربر.

English: How plays start — manual, autoplay, or suggested (a click on a suggested video); a large autoplay share next to low completion signals a mismatch with user intent.

### Chart — Completion funnel

Audience drop-off across five steps (start → one quarter → half → three quarters → complete 90%+). **The funnel form follows the Mixpanel standard** (benchmarked): wide vertical bars in the design system's single blue, a faint "ghost" of the previous step above each bar that shows the drop-off, a white chip with percentage + count on the edge of each bar, an "Overall completion rate" legend above the chart, and a percentage axis. Each step's drop-off appears in the tooltip and in the caption below the chart.

The **`By category`** button is functional and turns the same funnel into a grouped view of three content categories (Education/Entertainment/News).

Key point: video consumption is non-linear (users seek forward/backward), so these steps are independent milestones, not a mandatory funnel, and the main measure is **the difference between bars**: a steep valley between two steps means the script/edit lost its pull right there.

**Chart tooltip ⓘ:**

Persian: سهم نشست‌هایی که به هر نقطه از طول ویدیو رسیدند؛ محل ریزش می‌گوید مشکل از شروع ویدیو است یا ادامه آن. جهش با seek ممکن است ترتیب را غیریکنوا کند؛ اختلاف پله‌ها ملاک است.

English: The share of sessions reaching each point of the video's length; where the drop happens tells whether the problem is the opening or the rest. Seeking can make steps non-monotonic; read the deltas between bars.

---

## Zone 3 — Technical playback quality

If playback slips technically, even the finest content gets abandoned. This zone's KPI row has **two cards** (stalls and playback errors), and buffering — per PM decision — appears only as a context column in the tables (see "Dropped metrics").

### Stall rate

The share of sessions that hit a complete player freeze; more serious than buffering: buffering means the player waited and continued, a stall means the player froze/crashed. Conceptual formula: "video_stalled ÷ video_started × 100 (DISTINCT session)". Target: below 1%.

**Card tooltip ⓘ:**

Persian: سهم نشست‌هایی که پلیر در آن‌ها به‌کلی قفل شد؛ جدی‌تر از بافر است و معمولا به خود پلیر یا یک محیط خاص برمی‌گردد.

English: The share of sessions where the player froze outright; more severe than buffering and usually rooted in the player itself or a specific environment.

### Playback error rate ⚙ Next phase

The share of plays that failed completely before the first frame was shown (404, unsupported codec, DRM, network drop) — i.e. "it never played at all". **Status:** requires the `video_error` event. Conceptual formula: "video_error ÷ video_play_intent × 100".

**Card tooltip ⓘ:**

Persian: سهم پخش‌هایی که پیش از نمایش اولین فریم شکست خوردند و ویدیو اصلا شروع نشد.

English: The share of plays that failed before the first frame — the video never started at all.

> **The golden stall / playback-error split (presentation narrative):** the most common mistake in video analytics is lumping all technical errors under one vague umbrella. The split is deliberate, so that each error is routed directly to the team responsible for it: **stall** → the player and browser layer; **playback error** → the backend, media encoding and CMS layer (and buffering, wherever it appears as a column → the network and CDN layer).

### Chart — Dominant watch and download quality

A single grouped chart: for each quality level (1080p/720p/480p/360p), two bars side by side — **watch share** and **download share** (both live). The data story lies in this comparison: watching concentrates on 720p (bandwidth constraints), while downloads skew toward high quality (users keep the better version for offline). It drives two decisions: tuning the bitrate ladder to real bandwidth, and eliminating the encoding/storage cost of rarely used qualities.

**Chart tooltip ⓘ:**

Persian: سهم هر سطح کیفیت در تماشا و دانلود؛ تصویری از پهنای باند واقعی مخاطب برای تنظیم کیفیت‌های عرضه‌شده.

English: Each quality level's share of watching and downloading; a picture of the audience's real bandwidth for tuning the offered qualities.

### Chart — Adaptive quality drops

How many times did the system automatically lower the quality? Only system-initiated downgrades (not manual, not upgrades), broken down by downgrade path. If the most slippage is on the 1080p-to-720p switch, the bitrate ladder must be optimized for real bandwidth. Conceptual formula: "count of video_quality_changed with an adaptive trigger and a lower target quality".

**Chart tooltip ⓘ:**

Persian: شمار دفعاتی که پلیر کیفیت را به‌دلیل کمبود پهنای باند خودکار پایین آورد، به تفکیک مسیر کاهش.

English: How often the player auto-downgraded quality for lack of bandwidth, split by downgrade path.

### "User environment" component

The same distribution component as the service's User Agent page, redefined for video. **Every dimension (device/OS/browser/brand) uses a donut** (PM decision: the bar mode specific to device was removed) + a numeric table next to it.

- **View selector:** "Distribution" or "Trend" (change in share over time; for brand it has an error state + **Try again**).
- **Table columns:** viewers · share · **buffer rate** · △share. Each "viewer" = a unique user who played at least one video in the range. The buffer-rate column replaces the page-level "bounce rate" (video has no "bounce"), and its red/orange color gives away a troubled environment.
- **Group by version:** functional — for OS and browser it genuinely breaks the donut into version slices; disabled for device and brand.
- **Scope:** global across all video traffic; a specific video's device breakdown appears in that video's panel.

**Component tooltip ⓘ:**

Persian: توزیع بینندگان بر اساس دستگاه، سیستم‌عامل، مرورگر یا برند؛ ستون نرخ بافر محیط پرمشکل را نشان می‌دهد. بیننده یعنی کاربر یکتایی که در بازه دست‌کم یک ویدیو پخش کرده است.

English: Viewer distribution by device, OS, browser, or brand; the buffer column flags the problem environment. A viewer is a unique user who played at least one video in the range.

---

## Zone 4 — Monetization

Video has to do business work. This zone has a four-card KPI row, and below it a performance table by position.

### Ad KPI row

All rates are measured against **ads started**:

- **Ad completion rate:** the share of started ads that were watched to the end.
- **Ad skip rate:** the share of skippable ads that the user skipped; a signal of the ad's fit with the audience.
- **Ad-driven drop-off:** the share of viewers who abandoned watching entirely as soon as the ad started; unlike skipping, where only the ad is dismissed, here the viewer leaves. The boundary of ad annoyance. (The final Persian term is «ریزش با آگهی»; «پرش آگهی» and «ترک هنگام آگهی» were rejected.)
- **CTA click rate ⚙ Next phase:** the share of plays that led to a click on the site's own in-player call-to-action button (buy, sign up, next lesson); its denominator is all video plays, not ads. How it differs from ad clicks: an ad click is on the advertiser's creative and measures ad revenue; a CTA click measures the video's own business impact for the site owner. Requires the `video_cta_clicked` event.

**Card tooltips ⓘ:**

Persian: سهم آگهی‌های شروع‌شده‌ای که تا انتها دیده شدند. / سهم آگهی‌های قابل رد که کاربر رد کرد؛ نشانه تناسب آگهی با مخاطب. / سهم بینندگانی که با شروع آگهی تماشا را به‌کلی رها کردند؛ برخلاف رد کردن که فقط آگهی کنار می‌رود، این‌جا خود بیننده می‌رود. / سهم پخش‌هایی که به کلیک روی دکمه فراخوان خود سایت داخل پلیر (مثل خرید یا ثبت‌نام) رسیدند؛ جدا از کلیک روی آگهی، که کلیک روی تبلیغ آگهی‌دهنده است.

English: The share of started ads watched to the end. / The share of skippable ads the user skipped; a signal of ad relevance. / The share of viewers who abandoned watching the moment an ad started; unlike skipping, which only dismisses the ad, here the viewer leaves. / The share of plays that led to a click on the site's own in-player call to action (like Buy or Sign up); separate from ad clicks, which are clicks on the advertiser's creative.

### Table — Ad performance by position

Benchmarked against YouTube Studio's ad-type report: a **table** following the analytics-table convention, not a stacked bar. Each row is one position (All ads / Pre-roll / Mid-roll / Post-roll), and the columns are: ads started (+ share of total), completion rate, skip rate and drop-off rate — each rate with **a small bar in its concept's color inside its own column** (the GA4 pattern) at true scale — plus each position's click rate.

Positions come from the position property on ad events and can be broken down right now. Other types (skippable/non-skippable, bumper, overlay) require a new property/event — "skippable/non-skippable" should be added to the backend checklist.

**Table tooltip ⓘ:**

Persian: هر ردیف یک جایگاه آگهی است (پیش، میان یا پس از پخش) و ستون‌ها می‌گویند از هر ۱۰۰ آگهی شروع‌شده آن جایگاه، چند تا کامل دیده شد، چند تا رد شد و چند تا بیننده را از تماشا انداخت.

English: Each row is one ad position (pre-, mid-, or post-roll), and the columns say how many of that position's 100 started ads were watched fully, skipped, or drove the viewer away.

---

## Zone 5 — Single-video exploration

From platform-wide data down to diagnosing a single video.

### Videos table

A datatable following the **analytics-page table convention** (reference: Referrers/Pages):

- **Toolbar:** live search on the title + a `Columns` menu with default and optional columns — the menu genuinely adds/removes columns.
- **Default columns:** video title (a link in text color; hover = brand color + underline) · plays + share of total · growth % (green/red arrow; low-data videos show "—" with an insufficient-data tooltip) · completion rate · avg watch · buffer rate (colored by threshold).
- **Optional columns (with data):** replay rate · stall rate · page engagement share.
- **Behavior:** sort by clicking column headers (direction indicator; insufficient-data rows always at the bottom) · pagination of 10 with a "Rows 1 to 10 of 15" counter · empty search state with a clear button · clicking a row/title = that video's detail panel, with a route to `#/video/<id>`.

**Table tooltip ⓘ:**

Persian: عملکرد تک‌تک ویدیوها؛ با کلیک روی هر ردیف، جزئیات همان ویدیو باز می‌شود.

English: Each video's performance; click a row to open that video's details.

### Video detail panel

A drawer panel following the **analytics-page side-panel convention**; it closes with Escape and a backdrop click. Section order:

1. **Header:** a small `Video details` label + the video name in brand color with an icon chip; the name is a navigation link.
2. **Video trend:** a daily trend chart with **metric chips colored like their lines** (plays / completion rate / buffer rate — clickable, counts on the left axis and rates on the right axis, at least one line always on) + an aggregation note.
3. **Overall stats:** a three-column grid of 12 cells — plays, full-completion rate, avg watch percentage, avg watch, buffer rate, stall rate, playback error rate (next phase), replay rate, download rate, page engagement share, video duration, unique viewers. Each cell has its own tooltip; the goal is full alignment of definitions with the global view.
4. **Video SEO:** an invalid-schema warning + a "How to add schema" accordion (three steps + ready-to-copy JSON-LD code + a link to Google's Rich Results Test).
5. **Queries driving this video's plays:** thin brand-colored bars (the "Top sources" pattern).
6. **Moment-by-moment audience retention:** the percentage of the audience remaining at each moment; a steep drop pinpoints the exact content problem.
7. **This video's watch and download quality:** a single compact table with column headers — one row per quality: bar + watch share + download share (live).
8. **In-player interactions:** a numeric list with column headers (action / count / share) — seek forward/backward, mute/unmute, skip intro (next phase), share, subtitles (next phase).
9. **Device split** and **Carrier split:** numeric lists with column headers; carrier has an error state + **Try again**.
10. **Seek heatmap:** seek density along this video's length (5% buckets) with direction chips All/Backward/Forward. It lives only in the single-video panel, because aggregating seeks across all videos is meaningless.

> **Rule for numeric lists in the panel:** every numeric list has column headers (a final PM convention), and composition/top lists are rendered with thin ECharts bars.

**Overall stats section tooltip ⓘ:**

Persian: سنجه‌های کلیدی داشبورد، محدود به همین ویدیو؛ هم‌ترازی کامل میان نمای کلی و سطح تک‌ویدیو.

English: The dashboard's key measures scoped to this video; full parity between the global view and the single-video level.

---

## Dropped metrics

The following metrics **were dropped; they were predicted to be of no use (useless) for Shahin's target audience.** Their definitions are kept for future reference and can return if the audience persona changes (wireframe version v33, which has these metrics, is kept for comparison):

- **Buffer rate (KPI card):** the percentage of sessions with at least one buffer event; the thermometer of CDN and network health. Conceptual formula: "video_buffered ÷ video_started × 100 (DISTINCT session)". Removed as a standalone card; buffering remains only as a **context column** in the videos table, the user-environment table and the single-video panel, so the technical signal is not lost without it being a headline metric.
- **Buffer-rate trend + the "CDN performance breakdown" modal:** a daily buffer line chart with a 2.5% threshold line and an incident drill-down by CDN provider (each provider's share of buffering, a detailed table, log export and handoff to the infrastructure team). The entire flow was removed because CDN monitoring is the concern of an infrastructure operator, not of Shahin's target audience.
- **Buffer rate by carrier (chart card):** concentration of buffering by carrier, for diagnosing peering problems. The global card was removed; the same breakdown remains in the **single-video panel** (the level needed for content diagnosis) and as the **global carrier filter**.
- **Ad click rate (KPI card):** the share of clicks on the advertiser's creative relative to ads started. The standalone card was removed; each position's click rate remains as a column in the "Ad performance by position" table.
- **"States and indicators" reference section:** an on-page documentation block (health vocabulary, alert bands, base vocabulary). Removed from the page; its content will move into this dashboard's Help Center section when that is written.
- **Playback-quality filter:** removed because of its ambiguous definition in adaptive streaming (explained in the filters section).

The color thresholds for the buffer columns (orange from 2.5%, red from 5%) and the alert bands are still in force in the system logic; they are simply no longer documented on the page.

---

## Schema notes

Correct event naming per the **Pack 1** catalog is mandatory (pack-number correction: this pack is the same "Pack 1 — Video" as in Strategy-Predefined-Events.md §7.3; this document's earlier references to "Pack 2" were fixed as drift; the catalog is the reference):

- **Autoplay:** instead of a standalone `video_auto_played` event, use `video_started` with the property `playback_source='autoplay'` (other values: `manual`/`suggested`/`continue_watching`) — a standalone event breaks the funnel apart.
- **Buffering:** the correct name is `video_buffered` (`video_buffer` is deprecated); a network/CDN signal, one record per rebuffer interval with `buffer_duration_ms` (still needed for the context columns and industry comparison).
- **Stall:** the correct name is `video_stalled` (`video_stall` is deprecated); a player/browser signal — **separate from buffering** (the golden split in §11 of the design document: buffering is the network/CDN path, stalls are the player/browser path; merging the two destroys root-cause routing).
- **Quality change:** the correct name is `video_quality_changed` (`video_quality_change` is deprecated).
- **Download:** the download event (`video_download`) with a quality property is the source of "download rate" and "download share per quality" (live).
- **Ad position:** ad events (`ads_video_started/completed/skipped/clicked`) with a position property (pre/mid/post-roll) feed the ad table's breakdown report.
- **Counting:** technical rates are counted on `DISTINCT session_id` — preventing outputs above 100%.

> **Dedup rule between Toggle and pack:** the names `video_started` / `video_progress` / `video_completed` are the same in auto-capture and Pack 1; once the pack is implemented, the SDK turns off the Toggle version. The definition of `video_completed` is the same in both: reaching 90%+.

---

## Out of Scope

- Tracking bandwidth consumption in megabytes.
- Monitoring external streaming error codes (HLS/DASH Live) — this dashboard covers the native player only.
- Embedded players (such as Aparat).
- Ad types beyond position: skippable/non-skippable, bumper, overlay — these require a new property/event; "skippable/non-skippable" should be reviewed in the backend checklist.

> **Adoption risk:** many Iranian news publishers use the Aparat embed, not a native player; covering embeds via a postMessage bridge should be reviewed in the roadmap.

---

## Shared dashboard requirements

This dashboard follows the **shared requirements section** of [`04-Panel-IA-And-Stories.md` §8.5](./04-Panel-IA-And-Stories.md), and those items are not repeated here: an Empty/Degraded State per widget, a minimum-sample guard (denominator < 100 → "Insufficient data" and no alert), divide-by-zero behavior ("—" + alert suppression), the Jalali calendar with the Tehran timezone and weeks starting on Saturday, Persian number formatting with the `٬` separator, the Bot filter, and exclusion of AMP/NoScript visits from the denominator of engagement metrics.

---

## Open Questions

1. **Exact Watch Time calculation:** is a timestamp difference better, or a heartbeat every 10 seconds? Audit by the infrastructure team.
2. **CIRR (rebuffering time ratio):** adding a buffer-duration property on `video_buffered` for industry comparison — given that the headline buffer metrics were removed, its priority should be reviewed.
3. **Color threshold for the buffer columns:** current value 2.5%/5% — needs team approval (only for column color, not a headline metric).

---

## Needs Approval

- **Backend access to Google Search Console** for the "Search visibility" band (Khashayar) — until then, this band's numbers are estimates.
- **Next-phase events** that are not yet being sent: `video_impression` (impression-to-play rate), `video_error` (playback error rate), `video_play_intent` (EBVS), `video_cta_clicked` (CTA click rate), `video_intro_skipped` and `video_subtitle_changed` (skip intro and subtitles). (Note: "TTFF / time to first frame" has no standalone event in the current registry — it is handed to the technical team as a requirement to design a startup event/property.)
- **Removal of the standalone `video_auto_played` event** and recording autoplay as the property `playback_source='autoplay'` on `video_started` (per the Schema section).
- **A "skippable/non-skippable" property** on ad events, to break down by ad type (backend checklist).

---

## DOD (Definition of Done)

- [ ] Names of all Pack 1 events and properties normalized to lowercase in the Collector.
- [ ] `COUNT(DISTINCT session_id)` applied for technical rates.
- [ ] All percentages rendered with two decimal places.
- [ ] The "Watch time trend" chart follows the global filters (no local toggle) + a `View as table` modal with CSV.
- [ ] The page's funnels use the standard stepped form (Mixpanel) with honest proportions; the `By category` mode is functional.
- [ ] The videos datatable has search, a real columns menu, header sorting and working pagination.
- [ ] The side panel follows the analytics convention (trend with metric chips, three-column overall stats, numeric lists with column headers).
- [ ] Global filters include "Video duration" and "Internet carrier"; no playback-quality filter.
- [ ] The seek heatmap removed from the global view and present only in the single-video panel.
- [ ] Final approval of the interactive panel and the SEO band by the design team (Arezoo) and backend (Khashayar).
- [ ] The video dashboard's Help Center section written before release (gate).
