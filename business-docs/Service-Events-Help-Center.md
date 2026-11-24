# Events Service Guide

Part of the [Shahin Help Center](README.md)

> **Status: Work in progress (Backlog)** — this section is not yet available on the live product and is intentionally not shown in the published Help Center (the docs on :8012). The content below is an internal draft and will change before release.

---

Events are the rawest and most valuable unit of data in any analytics platform. The Events service is the layer that goes beyond simple visits to record what users actually do, and it powers dashboards tailored to each type of business.

## What is the Events service?

General Analytics tells you how many people came, where they came from and how long they stayed; but it cannot tell you whether an article was actually read or just opened, how far a user watched a video, or where in the journey a shopping cart was abandoned. The Events service fills this gap: it records meaningful behavioral events and, from them, builds dashboards that speak the language of that particular business.

The key architectural point is that Events is a shared collection layer, not a separate report builder: each event is recorded once and reaches several consumers at the same time — business dashboards, Session Replay and later analyses. "Record once, use many times."

This guide covers predefined events (Predefined) and ready-made dashboards; fully custom events (Custom Events) are a separate topic and are not covered here.

## Predefined Schema

The heart of the Events service is that you do not have to define events from scratch. Unlike tools such as GA4, where you have to design and implement every event yourself, Shahin has a standard, ready-made set of events based on your type of business. This gives you three things: meaningful data from day one, no need for deep technical knowledge, and the problem of uncontrolled data sprawl (Cardinality) solved from the start.

Events are grouped into several levels:

- **Level zero (automatic)** — recorded without any action on your part: page view, session start, first visit, returning visit and client error, together with a wide set of automatic properties (path, campaign, referrer, device, geography, new or returning user).
- **Level one (one switch)** — turned on with a Toggle in the panel, with no code: scroll depth, outbound click, form start and submit, video, file download and search.
- **Level two (domain packs)** — events with a pre-designed schema that your site's developer implements; these are what drive the specialized business dashboards.

Every parameter sent with an event automatically becomes a filterable column, without you having to define it in advance — and each parameter's type (dimension, metric or identifier) is inferred from the schema itself.

## What is a Domain Pack?

A domain pack is a ready-made bundle of events for a specific capability — such as payment, search, video or authentication. What you receive as a user is a "business" (such as an online store or a media site), and each business is built from one or more packs. Some packs are vertical (they only make sense within one business, such as payment for an online store) and some are horizontal (any business can turn them on, such as video).

## How is a pack's dashboard turned on?

There are two paths:

- **Automatic path** — if a connection point exists (such as the WooCommerce plugin or video players), you choose your business, flip the switch, and data starts arriving right away. Your developer does not need to do anything.
- **Schema path** — if no ready-made connection exists, the dashboard stays locked until data arrives, and you see a clear checklist of the required events. As each event is implemented, the section that depends on it unlocks. The dashboard opening up is the reward for implementation.

If a pack has not yet been fully implemented, each widget independently shows a "Waiting for event X" state, not a misleading zero. In production, too, you only see dashboards whose events are actually reaching your project.

## Two important rules to know

- **Conversion events are capped: a maximum of 30 per project.** You can mark any existing event as a conversion, but no more than 30. The reason is simple: "When everything is a conversion, nothing is."
- **No backfill (No-Backfill).** Statistics start from the moment an event is activated or implemented; data from before that point is shown as a grey "No data" band, not as zero. This is a deliberate product decision, not a bug. Each dashboard also shows the date its data collection started at the top of the page.

## Shahin's fixed principles in the Events service

These principles apply across every dashboard in this service and make the numbers trustworthy to read:

- **Human-first, bot-free.** Traffic identified as a bot or crawler (such as Telegram link previews) is excluded by default from the denominator of every rate, so the number you see reflects real human users.
- **No exact monetary amounts in sensitive areas.** Where financial privacy requires it, no card or chart shows an exact rial or cryptocurrency amount; volumes are event counts or unique-user counts.
- **The denominator is always stated explicitly.** Any number calculated on a subset of the data states how many events it was calculated on. A number without a denominator is misleading.
- **No made-up formulas.** Metrics are built only from data that actually exists; Shahin does not offer formulas for monetary loss or fake revenue estimates.
- **Privacy.** Sensitive identifiers (such as card numbers or IBANs) are always recorded masked.

---

## Media dashboard

### Introduction

The Media dashboard is the first page an editor opens in the morning. In five seconds it tells you what is hot right now, and then it answers four follow-up questions: how long a story lives, whether the site is running on fresh news or on its archive, how far readers read, and where they come from. What sets it apart from general Analytics are its news-specific measures: story lifespan on an hourly scale (not daily), the share of breaking news, and a breakdown of messaging apps, which are the main news distribution channel in the Iranian market. This dashboard is part of the Events service and is available on plans that include Events.

### What questions does it answer?

- What is hot right now, and where should I promote it?
- How long does my story live, and when does it die?
- Am I running on fresh news or on my archive?
- How far do readers read, and do they go on to a second article?
- Where do readers come from, and how often do they come back?

### How is it turned on? (the hybrid model)

Understanding this model is the key to reading the dashboard correctly. Page views are live from the day the script is installed; but the reading-depth measures need four Media schema events to be implemented on your site: read start, read depth, article completion and active time. Until these events arrive, the dashboard shows a checklist in a locked state, with "Page view" already checked from the start; as each event is implemented, the section that depends on it unlocks.

Important: until then, the dependent cards and columns stay "Waiting" and show "—", not zero — because zero means it was measured and the value was zero, while "—" means it has not been measured yet. This distinction is deliberate, so the numbers do not mislead you.

### Newsroom Pulse (live hero)

A live view of your site at this very moment, independent of the date-range filter. It includes active readers right now, a sparkline of the last thirty minutes, the five hottest articles right now, the breaking-news share, and today's publications.

- **Active readers now** is the number of unique sessions that have been active in the last five minutes — the same mechanism as Shahin's Realtime. It has one honest limitation you should know about: a reader absorbed in a long article who is not moving may temporarily drop out of the count; once the active-time event is implemented, this number becomes more accurate. (The Chartbeat reference counts every open window as one person and defines "active" as engagement in the last 15 seconds; Shahin's phase-one approximation is a five-minute window.)
- **Breaking-news share** equals today's views of articles published in the last 24 hours, divided by all of today's article views. Articles without a publish date are excluded from this calculation, and this is disclosed in the denominator.
- **Hot articles** are ranked by readers right now; their active-time column shows "—" until its event arrives.
- **How to read it:** this card is for decisions in the moment, not for trend analysis — adjust your homepage and distribution channels based on it. Zero active readers is a quiet number, not an error.

### Article views

The number of article page views in the selected range, live from the day of installation. Articles are distinguished from non-article pages based on page metadata; pages without an article identifier are counted separately and disclosed.

### Returning readers

The share of readers in the range who have visited before — a health measure of your relationship with your loyal audience. Live from the day of installation.

- **How to read it:** according to Chartbeat's multi-year analysis, loyal readers, though fewer in number, make up about 40% of publishers' traffic and consume 2.5 times as much content as new readers; so treat this number as a long-term asset, not a daily metric. A drop of more than 5 points against the 30-day average means your loyal audience is starting to churn.

### Average active time (waiting for event)

The average number of seconds readers actually engage with an article — scrolling, touching, moving — not just having the tab open. It equals the total active time on articles divided by the number of reads that have active time.

- **How to read it:** the regional (Middle East) benchmark is about 32 seconds and the global benchmark about 26 seconds (Chartbeat). 30 seconds or more is good; 15 to 30 means reading is superficial and you should look at your articles' leads and structure; under 15 seconds is the "fly-by" threshold (55% of web visits last under 15 seconds) and means most visits are not real reading.

### Article completion rate (waiting for event)

Of the readers who started reading, the share who reached the end of the article. This number is the output of the reading funnel, not a separate counter: unique completions per session divided by unique read starts per session, and its denominator is stated explicitly on the card.

- **How to read it:** the average reading depth in the industry is about 44% (smartocto, 343,000 articles). 40% or more is good; under 25% means readers are abandoning articles midway, and you should review length and structure.

### Views by article age (bar chart, hourly axis)

Views by the article's age at the time of the visit, in hourly buckets (0-3, 3-6, 6-12, 12-24, 24-48, 48+). Age equals the visit time minus the publish time; articles without a publish date are excluded, and this is disclosed in the denominator below the chart.

- **How to read it:** this chart tells you each story's golden distribution window. According to Chartbeat's study of 27 million articles, most stories get 80% of their views in the first 24 hours; the median lifespan of a story arriving from search is about 36 hours (the longest tail), and from social networks about 26 hours. Use this to decide when to republish and how long stories stay on the homepage.

### Share of views by freshness (donut chart)

Three shares of the range's article views, based on publish date: today, yesterday, older (Tehran time).

- **How to read it:** this answers the question of what your site is running on — fresh news or the archive. For most publishers, the share of content more than three days old is under 10% (Parse.ly benchmark); more than that means your archive is an asset, and republishing archive content is worth investing in.

### Reader journey funnel (four-step funnel)

Article view → read start → completion → next article. The last step is "continued reading". Each step's rate is the output of this funnel and is calculated only on steps that have data; until their events arrive, the two middle steps are rendered as dashed "Waiting" columns, with no number.

- **How to read it:** the average "continued reading" rate in the news industry is only about 11% (Chartbeat), and lower on mobile than on desktop; so if your number is close to this, that is normal. With **Open in report builder** you can break this same funnel down by channel, device or section to see where the biggest leak is.

### Reader entry sources (five-way horizontal bar)

The share of sessions by way of entry: internal, direct and messaging apps, search, social, and external links. It is built from the session's referrer classification and UTM, both of which are already collected automatically today.

- **How to read it:** for Persian-language media, a large "direct" share is mostly the dark social of messaging apps — the most hidden news distribution channel (77% of mobile sharing of publishers' content is of this kind). The publisher benchmark (Chartbeat 2025): internal 39%, search 19%, external links 17%, social 13%, direct 11%. This is where you can spot a dangerous dependence on a single channel.

### Section share, sharing and internal search, and reading depth

- **Section share** (live) — each section's share of article views in the range; the section is read automatically from the breadcrumb and the page path. It puts the real weight of audience consumption next to the weight of newsroom output.
- **Sharing and internal search** (live) — the most-shared articles next to the most frequent internal searches; a frequent search with no recent article to answer it is a content-gap signal for the newsroom.
- **Reading depth** (waiting for event) — the distribution of readers who reached the 25, 50, 75 and 100 percent marks of the article body; a sharp drop between two marks shows the abandonment point.

### Articles table

Each article's scorecard for the range: views, share of total, reading depth, active time, dominant source and age (hours). The reading-depth and active-time columns stay "—", not zero, until their events arrive.

### Finer concepts and statistical honesty

- **Alert bands have no absolute baseline.** The industry pattern (Chartbeat) is relative: a spike means an article's messaging-app traffic is above the 95th percentile of your own site's pattern, and a dip means active readers are below "the average for the same hour of the day minus three standard deviations". That is why we do not give you a fixed number; an alert appears when your site departs from its own normal behavior.
- **The denominator is always explicit.** Wherever a number is calculated on a subset of the data (such as excluding articles without a publish date), it states right there how many views it was calculated on.
- **Live versus waiting.** Every card and column states explicitly which stream it belongs to; the live stream works from the day of installation, and the schema stream unlocks as events are implemented.

---

## Video Analytics

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

## Sales & Transactions dashboard (E-commerce)

### Introduction

The Sales & Transactions dashboard is built for WordPress and WooCommerce stores and answers five questions: where the buyer came from, what they saw, where they dropped off, why they did not buy, and what moved the purchase forward. It focuses on the Iranian market: payment abandonment on redirect-based payment gateways, acquisition from Instagram and Telegram, and orders awaiting confirmation for card-to-card transfers. Its architecture is pulse-driven, because 90% of a seller's questions are "How did I sell last night, and is anything broken right now?".

### What questions does it answer?

- How much did I sell last night and today, and is anything broken right now?
- Where in the journey do buyers drop off, and is it worse on mobile or desktop?
- How much money is being left on the table — how much is in abandoned carts and failed payments?
- Which product is hot, and which gets many views but few sales?
- Which channel and which discount code actually generated revenue?

### How is it turned on?

It works with the store pack events, from product view and add to cart to checkout start, payment failure, purchase and refund. Two points:

- The full revenue funnel and each gateway's failure rate require server-side reading of WooCommerce; until this connection is finalized, these sections are shown with the label "Sample data — requires server-side collection".
- Five native WooCommerce signals (order awaiting confirmation, cart item removal, reviews and ratings, product download, discount code outcome) show sample data until their events are activated, and are marked "Requires technical consultation".

### Today's Sales Pulse (live hero)

All numbers in this section are counted from midnight tonight up to this moment, each card has its own hourly trend, and the comparison references are "Yesterday" and "Same day last week". It includes today's net revenue, today's successful purchases, pending carts, today's most-viewed product, and active visitors.

- **How to read it:** the "Pending carts" card shows money left on the table. If today's successful purchases are 20 but pending carts are 150, you immediately know something (price, shipping cost or the gateway) is not working; the "Stuck at gateway" subset links to the follow-up list in the revenue recovery layer.

### Key metrics

Four hero cards: net revenue, purchase conversion rate, average order value (AOV) and number of orders. Colored bands are not shown on the cards (a product decision); the default comparison reference is "Yesterday" unless you choose something else in the date-range filter.

- **Net revenue** is the money that actually stays in the business: net after refunds.
- **Purchase conversion rate is session-based, not view-based:** sessions with a purchase divided by all sessions. **How to read it:** "Out of every 100 sessions that entered the site, how many reached a successful purchase". Analytical bands: under 1.5% weak, 1.5 to 3% average, above 3% good (adjustable by industry; mobile has a lower benchmark).
- **AOV** is gross revenue divided by the number of orders — deliberately gross, to show the real basket size.
- **Mobile versus desktop conversion rate:** since most traffic to Iranian stores (from Instagram and Telegram) is mobile, this comparison is vital. If desktop converts at 3% and mobile at 0.4%, your site's layout or forms have a serious problem on phones.

### Revenue recovery layer

Lost but recoverable money is a seller's most urgent operational question, so it comes right after the key metrics:

- **Cart abandonment rate** is session-level: sessions with an add-to-cart but no purchase, divided by sessions with an add-to-cart. **How to read it:** this measure is deliberately session-level so it can be compared with the global benchmark (about 70%); that is why it differs from the user-based numbers in the funnel, and this is normal.
- **Overall failed transaction rate (Historical Payment Failure Rate):** what percentage of orders that went to the gateway were ultimately not paid — whether failed or gone to the bank and never returned (pending); this is the "Iranian payment abandonment" of the redirect model. Bands: under 10% good, 10 to 20% average, above 20% a silent disaster — the customer made it all the way to the checkout, but the gateway did not let the money go through.
- **Awaiting payment confirmation** and **cart item removals and returns** — signals of card-to-card transfers and buyer hesitation.
- **Each gateway's failure rate is a rate, not a share of all failures.** This distinction is deliberate: a high-volume gateway always has more failures without being worse; so each gateway's metric equals its failed transactions divided by all attempts on that same gateway, and the number of attempts appears in the bar's tooltip.

### Product performance

A full per-product table: views, add to cart, purchases, revenue, "percentage of views that led to a purchase" and a status flag. Variable products (weight/size) are broken down at the variation level, and the product key is the product ID, not the URL.

- **How to read the flag:** each row gets one flag, in this order of priority — "Out of stock, high demand" (zero stock and views above the median), "Running low" (stock below the threshold and active demand), "High views, no purchases" (views in the top quartile but conversion below half the site average), "High cart, low purchases", and otherwise "In stock". The thresholds are percentile-based, not fixed numbers, so they scale with the size of the store.

Next to this table are the product reviews and ratings card and the downloadable product downloads card (both from native WooCommerce signals).

### Full purchase funnel (9 steps)

From view to purchase, with a mobile/desktop switch. Under each drop-off, the "potential lost opportunity" is estimated in Toman.

- **How to read it:** the Toman estimate is shown only from the checkout-start step onward, where there is real purchase intent; no monetary figure appears for the upper funnel steps, because the theoretical ceiling would be dozens of times the revenue and would undermine the widget's credibility (in line with Shahin's "no monetary-loss formula" rule).

### Cart and payment, and marketing and campaigns

- **Revenue by payment method** — online gateway, cash on delivery, BNPL and store wallet; the payment method is only known at the checkout step and is recorded there.
- **Cart and payment measures** — discount code errors, the effect of shipping cost on abandonment, and the average time to complete a purchase.
- **On-site search** — the most frequent terms, with terms that returned no results highlighted, the no-results search rate, and the conversion rate of searchers (which is usually several times the site average, because search is the strongest declaration of purchase intent).
- **Marketing and campaigns** — revenue and arrivals by channel side by side (so you can see whether the high-traffic channel is also the money-making one), the sales time pattern (an hour-of-day by day-of-week heatmap; online shopping in Iran usually peaks between 10 pm and 1 am and on weekends), the top-performing discount codes, and the outcome of discount codes.

### Finer concepts and statistical honesty

- **Each purchase is counted once.** The conversion rate is deduplicated by order ID so that a purchase is not counted twice.
- **A pending order that never returned from the bank is never assumed to be a purchase.** This is a hard rule of the revenue recovery layer.
- **No monetary LTV or RPM metrics.** Under Shahin's rules these are not offered; instead, behavioral proxies are shown: repeat purchase rate, repeat purchase cohort and average number of orders per customer. Metrics such as CAC and profit margin, which require a cost feed or cost of goods, are not shown, because Shahin does not have that data.
- **Occasion annotations.** Iranian calendar occasions (Yalda, Nowruz, Ramadan, sales) and internet disruption events are annotated automatically on trend charts, so a dip or spike is not wrongly attributed to the store; for seasonal businesses, the comparison is "against the same occasion last year", not "the previous period".
