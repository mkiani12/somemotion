# 33 — Shahin ready-made dashboards → report builder bridge inventory

Status: COMPLETE for all 15 in-scope dashboards. Each card was extracted from source by read-only passes (one per page group) and classified centrally against `rb-engine-v12.js` and `rb-amp-builder.js`. Engine ids cited below were grepped in the engine. "Unit" means one card, KPI tile, chart, table or side-panel section in the default visible state. Hidden, variant-only and documentation blocks are noted but not counted.

Source worktree (read-only): `/data/projects/asam/shahin/wt-report-builder-v9/product/wireframes/` (HEAD 9b37bb81a). Engine: `report-builder/rb-engine-v12.js` (1753 lines), builder: `report-builder/rb-amp-builder.js` (5014 lines), shell: `report-builder/rb-shell.js`, page: `report-builder/v12.html` (1875 lines). The report-builder `latest` is v12 (`report-builder/versions.js:18`), and `report-builder/index.html` redirects to it and keeps `location.search`.

## Scope

- The basis is Decision-Log decisions 2, 3, 5, 7, 10, 11 and 13 (`product-document/Process-Docs/Decision-Log.md`):
  - Business scope = Store (WooCommerce) + Media (WordPress/news).
  - Video = a horizontal pack with its own ready-made dashboard (decision 10).
  - Decision 13 names `video-dashboard/v36` as the video dashboard.
- Core analytics = the hub's "Dashboards" realm (`shahinhub/index.html` ~lines 229–262).

## Dashboards in scope (path, latest version)

All `latest` values come from each folder's `versions.js`.

- Store: `events-ecommerce/v5.html`.
  - Decision-Log decision 13 cites `events-ecommerce/v6`, but no v6 exists in this worktree or on `origin/main`. That is doc drift.
  - The Store PRD is `Events-Service/PRD-Business-Ecommerce.md`.
- Video pack (canonical): `video-dashboard/v36.html`.
- Video pack (older pack page): `events-video/v4.html`.
- Media: `events-media/v4.html`.
  - Its PRD `Events-Service/PRD-Business-Media.md` still names v2 as canonical, while versions.js calls v4 canonical. That is drift.
- Core analytics:
  - `overview/v9.html`
  - `realtime/v5.html`
  - `pages/v14.html`
  - `utm/v19.html`
  - `utm-table/v9.html` (+ `data-v9.js`)
  - `referrer/v16.html`
  - `user-journey/v8.html`
  - `device-technology/v30.html`
  - `user-activity-patterns/v6.html`
  - `tags/v13.html`
  - `bot-traffic/v15.html` (demo-only per memory; production has no bot classification)

## Per-dashboard cards

### Video pack: `video-dashboard/v36.html` (DONE; this is the canonical Video dashboard)

How the page is set up:
- It does NOT use the shared `shahin-filter.js`. It has its own inline date range (L263–294): radios `input[name="drRange"]`, with **30d as the default** (L276, `data-default checked`) and a Compare tab (L288–290).
- It has its own inline drawer `#shMega` (L311–505) with sections Video (`#vfVideoList`, vid_xxxx), Content category, Duration (`vfDur`), Playback start, Devices (type/browser/OS), Carrier, Location, Referrer, UTM, User type (`vfUserType`) and Bots (`vfBot`).
- Both are wired by `shahin.js` `buildDateRanges`/`buildMegaFilters`. They dispatch no event, and nothing re-renders: `renderMain()` (L2146–2152) runs once, plus on `shahin:lang`, theme and resize.
- The chip «پیرو فیلتر سراسری» / "Global filters" on the watch trend (L700–703) claims behaviour that does not exist.
- The time axes are hardcoded: `DAYS` (L1612) has 7 Khordad ticks, even though the default range is 30d.
- Local state:
  - Videos table: `vtState` (L1459), with `vtApply`/`vtSort`/`vtPage` (L1463–1519).
  - Completion funnel: `complCat`/`vdComplMode` (L1743–1750).
  - User environment: `curDim`/`curView`/`curGran` (L1879), `setDim` (L1979).
  - Side panel: `vdOpenPanel`/`vdRowOpen` (L1400–1419).

Existing bridge (L2177–2204), audited. It is broken in three ways:
1. The link is `/report-builder/?type=<trend|funnel|retention>&view=builder` only. It carries no event, measure, breakdown, range or filter, so every trend card opens the same empty builder.
2. The bridge reads the title text after `shahin.js` has already applied the language. In English mode (the default when localStorage is empty, `shahin.js:51`) the Persian keywords never match, so every card, including the completion funnel, becomes trend.
3. `applyLang` rewrites `[data-fa]` innerHTML (`shahin.js:57–64`), so the appended links vanish after any FA↔EN toggle. The bridge never re-runs.

Coverage of the bridge:
- Only 13 `.sh-card` elements get a link (L610, 691, 713, 723, 740, 788, 803, 815, 935, 1001, 1121, 1128, 1135). In Persian mode only L723 and L740 map to funnel.
- No link on the 9 KPI tiles, the GSC band, the side-panel sections or the watch-time modal.
- `.vd-box` matches nothing in the file. The `.sh-table-wrap` elements have no title, so they are skipped.

Cards:

- Zone 1, Discovery:
  - **KPI Videos viewed** («ویدیوهای دیده‌شده», L509–521), 1,248: **near**. Needs a `video_id` prop on video events; then trend `video_started` · property distinct count of `video_id`.
  - **KPI Impression-to-play rate** («نرخ نمایش به پخش», L522–534; greyed «فاز بعد»): **near**. Needs a `video_impression` event.
  - **KPI Page engagement share** («سهم ویدیو از تعامل صفحه», L535–547), 47%: **near**. Needs a watch-time virtual (`video_heartbeat` count × heartbeat interval, or a `watch_time_sec` prop) divided by `ts_total`.
  - **GSC band, Organic discovery funnel** («قیف کشف ارگانیک», L565–573): **none**. Google Search Console data.
  - **GSC band, Index and schema health** («سلامت ایندکس و اسکیما», L577–597): **none**. GSC and schema data.
  - **GSC band, Queries driving plays** («کوئری‌های منجر به تماشا», L601–605): **none**. GSC data.
- Zone 2, Engagement:
  - **Watch depth and time** («عمق و زمان تماشا», L610–687): **near** at card level.
    - Direct tiles:
      - Full completion, play-based: formula TOTALS(`video_completed`)/TOTALS(`video_started`). Engine pair rate is 0.34 (`rb-engine-v12.js:781`).
      - Completion rate, session-based: a Data Table hybrid metric TOTALS(`video_completed`)/`session_totals`, the same pattern as `T_METRICS` m3.
    - Near tiles:
      - Avg completion %: needs a progress percent prop.
      - Avg and total watch time: need watch time.
      - Avg duration: needs a `video_duration` prop.
      - Replay: needs a replay flag.
      - Download rate: needs a download event.
  - **Watch time trend** («روند زمان تماشا», L691–711, `rWatchTrend` L1702): **near**. Needs the watch-time virtual or prop; then trend daily average per `video_started` user.
  - **Playback source** («نحوه شروع پخش», L713–719): **near**. Needs a `play_trigger` prop (manual / autoplay / suggested). Partial proxies exist: `video_next_autoplayed` and `recommendation_clicked`.
  - **Completion funnel** («قیف اتمام پخش», L723–737, `rComplFunnel` L1756): **near**.
    - Today a 3-step funnel `video_started`→`video_progress`→`video_completed` is possible.
    - The 25/50/75 steps need a `percent` prop on `video_progress`, as a step filter.
    - The "By category" variant needs `content_category`.
  - **Completion rate by channel and campaign** («نرخ اتمام به تفکیک کانال و کمپین», L740–754): **direct**.
    - To match the card's session denominator: Data Table · group by `referrer_type` and `utm_campaign` · hybrid column TOTALS(`video_completed`)/`session_totals`.
    - Alternatively, funnel `video_started`→`video_completed` · breakdown `utm_campaign` (play-based, a different rate).
    - Value mismatch: the card's Newsletter, Telegram and Instagram rows map to `utm_source` values, not `referrer_type`.
- Zone 3, Playback quality:
  - **KPI Stall rate** («نرخ توقف», L758–770), 0.74%: **direct**. formula TOTALS(`video_buffered`)/TOTALS(`video_started`). The engine already has `video_buffered` ("Rebuffered").
  - **KPI Playback error rate** («نرخ خطای پخش», L771–783), greyed "needs the playback-error event": **direct**. formula TOTALS(`video_error`)/TOTALS(`video_started`). The page wrongly claims the event is missing; `video_error` exists.
  - **Watch and download quality** («کیفیت غالب تماشا و دانلود», L788–801): **near**. Needs a `quality` prop and a download event.
  - **Adaptive quality drops** («کاهش کیفیت انطباقی», L803–810): **near**. Needs a `video_quality_changed` event with from/to props. `video_rate_changed` is playback speed, not quality.
  - **User environment** («محیط کاربر», L815–877): **direct**.
    - trend pie or line · `video_started` uniques · group by `device_type`/`os`/`browser`.
    - The buffer column = formula TOTALS(`video_buffered`)/TOTALS(`video_started`) per group.
    - Brand and OS/browser version are near (missing props).
- Zone 4, Monetization:
  - **KPI Ad completion rate** («نرخ اتمام آگهی»), 67%: **direct**. formula TOTALS(`ads_video_completed`)/TOTALS(`ads_video_started`).
  - **KPI Ad skip rate** («نرخ رد آگهی»), 28%: **direct**. formula TOTALS(`ads_video_skipped`)/TOTALS(`ads_video_started`).
  - **KPI Ad-driven drop-off** («نرخ ریزش با آگهی»), 9.4%: **near**. Needs a link between an ad break and content abandonment (session or video id, or `video_interrupted` with an ad context prop).
  - **KPI CTA click rate** («نرخ کلیک CTA», greyed): **near**. Needs a `video_cta_clicked` event; `ads_video_clicked` is a different thing.
  - **Ad performance by position** (table, L935–998): **near**. Needs an `ad_position` prop (pre/mid/post-roll) on `ads_video_*`.
- Zone 5, Per-video:
  - **Videos** (table, L1001–1117): **near**. Needs `video_id`/`video_title`; then Data Table · group by `video_id` · columns `video_started` totals, the completion formula, avg watch time and the buffer formula.
  - **Startup time (TTFF)** (L1121–1127, «فاز بعد»): **near**. Needs a startup-time prop.
  - **Exits before start (EBVS)** (L1128–1134): **near**. Needs a `video_play_intent` or impression event.
  - **Rebuffering ratio (CIRR)** (L1135–1141): **near**. Needs `buffer_duration_ms` on `video_buffered`.
  - For these three cards the bridge opens an empty trend builder, which is useless.
- Side panel (L1149–1338, static apart from the video name). All need a `video_id` filter first:
  - Video trend: **near**.
  - Overall stats: **near**.
  - Video SEO: **none** (schema/GSC).
  - Queries driving this video: **none** (GSC).
  - Audience retention curve: **near**. Needs a playhead position prop on heartbeat/progress.
  - Watch and download quality: **near**.
  - In-player interactions: **near**. `video_seeked` and `captions_toggled` exist; mute and skip-intro events do not.
  - Device split: **near**. Needs `video_id`; then group by `device_type`.
  - Carrier split: **near**. Needs `video_id`; then group by `isp_name`.
  - Seek heatmap: **near**. Needs a seek position/direction prop.

Sample-number checks:
- Ad completion: engine 13,880/21,540 = 64% vs. card 67%. Consistent.
- Ad skip: engine 610/21,540 = 2.8% vs. card 28%. A **10× conflict**.
- Stall: engine 4,270/28,440 = 15% rebuffer per play vs. card 0.74%. A **conflict**: the definitions differ, since the card counts stall time share.
- Play-based completion: engine pair rate 0.34 (34%) vs. card 58.4%. A **conflict**. The 38% at the 90%+ funnel step is close to the engine.
- The page holds three completion figures at once: 58.4% play-based, 38% at the funnel step, 14.2% session-based.
- Ads started 48,200: not checked. The page's 30d default would put the engine at ≈86k.

### Store: `events-ecommerce/v5.html` (DONE)

How the page is set up:
- `body.mode-simple` is fixed (L162). CSS L73 hides `.adv-only`, so only the cards listed here are visible. Hidden cards are summarised at the end.
- The shared filter is mounted at L285, and `../assets/shahin-filter.js` loads at L1950. The default range is 7d.
- No card re-renders when the range or filters change. `renderAll` runs only on load, `shahin:lang` (L1936), theme (L1939) and resize.
- The one local state is `funnelSeg` (L1307, default `'mobile'`) through `setFunnelSeg()` (L1382).
- The page has no report-builder link of any kind.

Visible cards in page order: 38 units.

- **Today's sales pulse** (story box, L180–189): **none**. It is narrative text only.
- **Hero, live today, exempt from the range filter** (L192–245):
  - **Net Revenue Today** (L202–208), 29.4M T: **near**.
    - Purchases minus refunds is expressible as a trend formula, range=today: PROPSUM over `order_value` on `purchase` minus PROPSUM over `order_value` on `refund_issued`.
    - Subtracting discounts and gift codes needs a `discount_amount` prop on `purchase`.
  - **Successful Orders Today** (L211–217), 61: **direct**. trend · `purchase` · totals · range=today.
  - **Hourly chart `#heroToday`** (L220, `buildHero` L1787): **direct**. trend · `purchase` totals + prop sum `order_value` · range=today (hourly unit).
  - **Open carts** (L223–227), 160 of 221: **direct**. funnel `add_to_cart`→`purchase` · range=today; the drop-off equals the open carts.
  - **Unfinished payments** (L228–232), 46 / 24.5M T: **near**. It needs the `order_on_hold` event or a gateway status prop. A funnel `payment_info_submitted`→`purchase` only approximates it.
  - **Online visitors, last 5 min** (L233–237): **none**. The engine's shortest range is today by hour, with no minute-level realtime.
  - **Top product today** (L238–242): **near**. It needs a `product_id`/`product_name` prop on `item_viewed`, `add_to_cart` and `purchase`.
- **KPI row** (L289–328):
  - **Purchase CVR** (L293), 1.65%: **direct**. funnel `session_start`→`purchase`, counted by sessions (engine `Q.funnel.count='sessions'`; amp builder hold `_session`).
  - **Net Revenue** (L302), 197M T: **direct**. formula PROPSUM(`purchase`.`order_value`) − PROPSUM(`refund_issued`.`order_value`).
  - **AOV** (L311), 533K T: **direct**. trend · `purchase` · property average `order_value`.
  - **Orders** (L320), 385: **direct**. trend · `purchase` · totals.
- **The buying path at a glance** (L331–350, `buildSimpleFunnel` L1393): **direct**. funnel `item_viewed`→`add_to_cart`→`begin_checkout`→`purchase` · uniques · win 7d.
- **Revenue recovery board** (L353–376):
  - **Cart abandonment** (L355), 72.4%: **direct**. 1 − conversion of funnel `add_to_cart`→`purchase` within a session.
  - **Historical Payment Failure Rate** (L362), 43%: **near**. Failed transactions can be expressed as the formula TOTALS(`purchase_failed`)/TOTALS(`payment_info_submitted`). Pending transactions need `order_on_hold`.
  - **Awaiting payment confirmation** (L369), 23: **near**. It needs the `order_on_hold` event.
- **Unfinished gateway orders** (table L378–404): **near**. It needs a gateway prop (Zarinpal, IDPay, TorobPay…); `payment_method` only has Online gateway / Wallet / On delivery. It also needs `order_on_hold`.
- **Failure rate per gateway** (L405–413, `buildGateway` L1460): **near**. Same gateway-prop gap; the page itself marks it as sample data that needs server-side collection.
- **Cart item removals & restores** (L417–424): **near**. `remove_from_cart` exists; `restore_cart_item` does not.
- **Orders awaiting confirmation trend** (L425–432): **near**. It needs `order_on_hold`.
- **Mobile vs. Desktop CVR** (L436–454, `buildCvrDevice` L1831): **direct**. funnel `session_start`→`purchase` · breakdown `device_type`.
- **Product Performance (per-SKU)** (table L461–479, `buildSku` L1479; row drill `openProduct` L1504): **near**. It needs `product_id`/`product_name` (variation-aware) on the item events. Then it becomes a Data Table grouped by product, with columns `item_viewed`, `add_to_cart`, `purchase` and prop sum `order_value`.
- **Product reviews & ratings** (L482–489): **near**. It needs a `review_submitted` event with a `rating` prop.
- **Digital product downloads** (L490–506): **near**. It needs a `product_downloaded` event.
- **Net Revenue Trend** (L536–550, `buildRev` L1275): **direct**. Gross is prop sum `order_value` on `purchase`; net uses the refund formula above; daily. The engine has annotations (`ANNOT`, `rb-engine-v12.js:398`).
- **Full funnel, page_view to purchase** (L648–664, `buildFullFunnel` L1360): **direct**.
  - All nine step ids exist in the engine: `page_view`, `item_list_viewed`, `item_viewed`, `add_to_cart`, `cart_viewed`, `begin_checkout`, `shipping_info_submitted`, `payment_info_submitted`, `purchase`.
  - The segment buttons map to filters: `device_type` in Mobile or Desktop, `utm_source`=instagram (or `referrer_domain`=instagram.com), and `referrer_type`=Organic.
  - Bridge caveat: the card opens with the mobile filter on (`funnelSeg='mobile'`), so the bridge must carry that filter.
- **Revenue by payment method** (L806–812, `buildPayMethod` L1465): **direct**. trend bar · prop sum `order_value` on `purchase` · group by `payment_method`. Value-set mismatch: the card shows BNPL and Store wallet, while the engine has Online gateway / Wallet / On delivery.
- **Cart & checkout metrics** (stat tiles L813–823): **direct**, with one tile near.
  - Coupon error rate: formula TOTALS(`coupon_denied`)/(TOTALS(`coupon_applied`)+TOTALS(`coupon_denied`)).
  - Average time to purchase: funnel time-to-convert.
  - Checkout abandonment: funnel `begin_checkout`→`purchase`.
  - Abandonment after shipping cost (near): needs a `shipping_cost` prop.
- **Cart Recovery Rate, 72h** (L889): **near**. It needs identity stitching plus an "abandoned then purchased" definition.
- **First-Time Buyer Share** (L897): **near**. It needs an `is_first_purchase` prop or an order-count prop. `is_new_user` means new to the site, not a first purchase.
- **Repeat Purchase Rate** (L904), 22%: **direct**. retention `purchase`→`purchase` (engine `RET_R1['purchase>purchase']=0.27`), or a frequency distribution of `purchase` taking the share with 2 or more.
- **Top Search Queries** (L913–933, `buildTopQ` L1450): **near**. It needs a `search_term` prop on `search_submitted`. Its footer tiles are direct: zero-result rate = TOTALS(`search_no_results`)/TOTALS(`search_submitted`), and searcher conversion = funnel `search_submitted`→`purchase`.
- **Revenue by channel** (L943–949): **direct**. prop sum `order_value` on `purchase` · group by `utm_source` or `referrer_domain`. Value mismatch: Digikala and Telegram as channels.
- **Traffic Acquisition Breakdown** (L950–956): **direct**. table · `session_totals` · grouped by `referrer_type`/`utm_source`.
- **Sales Time Pattern** (heatmap L974–980): **near**.
  - It needs `hour_of_day` and `weekday` props, or a heatmap view over hourly granularity.
  - Its subtitle says it "follows the date-range filter", but it does not.
- **Top Performing Coupons** (table L984–1005): **near**. It needs a `coupon_code` prop on `coupon_applied`/`purchase`. Today `code` exists only on the custom `discount_code_applied`.
- **Coupon outcomes** (L1006–1013): **near**. Applied, denied and converted are direct (converted via funnel `coupon_applied`→`purchase`); "removed" needs `coupon_removed`.
- **Side panel, product drill** (L1504–1532): **near**. It needs `product_id`. The `openDetail()`/`METRIC` panel (L1743–1770) is dead code, and `openEvt` is reachable only from the hidden catalog.

Hidden `.adv-only` cards: not counted, and they would need a bridge only if un-hidden.
- Checkout funnel (L518–532): direct.
- Secondary KPI row (L553–639): checkout abandonment, payment failure and repeat rate are direct; refund rate is direct as a formula; CAC, ROAS and gross margin are none (cost feeds); LTV is near (identity).
- Entry & engagement (L667–683): bounce is direct through mex; scroll 58% is near (no percent prop).
- Search & Discovery and PDP (L686–796): mostly near. They need `search_term`, `product_id`, and the `read_reviews`/`view_image_gallery` events.
- Account (L827–859): DAU/WAU/MAU are direct (trend uniques with activeUnit); guest vs registered is near (stitching).
- Segments chips, schema tables and event catalog (L1048–1159): none.

Sample-number conflicts with the engine for the same query, 7d. These are exactly the mismatches Decision 7 says must disappear.
- **Orders 385 vs. engine ≈218.** `purchase` w=232/week × 0.94.
- **AOV 533K T vs. engine mean `order_value` 1,650,000 T.** `NUMP` at `rb-amp-builder.js:19`; `SUM_AVG.order_value=1650` (thousand) at `rb-engine-v12.js:142`.
- **Net revenue 197M T vs. engine ≈360M T gross.** About 218 × 1.65M.
- **Simple funnel step 1 at 8,400 vs. engine `item_viewed` w=5,200.** That is about 4.9k events, and fewer as uniques.
- **Acquisition sessions 23.3k vs. engine `session_start` ≈15.8k.**
- **Zero-result search rate is consistent:** 14.3% on the card vs. 240/1,770 = 13.6% in the engine.
- **Two sources inside the page also disagree:** the KPI deltas say "vs. yesterday", while the values are 7-day totals and `METRIC` says "vs last week".

### Pages: `pages/v14.html` (DONE)

How the page is set up:
- Filter mount at L200: `data-shahin-filter data-shahin-filter-bare data-page-action`. That gives a date range only, in the page header, with no Filters drawer.
- The default range is 7d. Nothing re-renders on a range change: `redraw()` at L958 runs only on load and on `shahin:lang` (L965).
- `SHAHIN_PAGE.version` is stale ('v12' at L745).
- Local state:
  - `selected` (L764): the rows to plot, at most 5.
  - `switchView()` (L845).
  - `#lcMetric` (L338–344): not wired.
  - Scope tabs All / Entry / Exit (L408–418): visual only.
  - `openPanel(path)` (L934).
- No report-builder link.

Cards:
- **Users** («کاربران», L210–217), 128,406: **direct**. table/mex · `visitors`, or trend `page_view` · uniques.
- **Sessions** («نشست‌ها», L223–230), 202,730: **direct**. mex · `session_totals`.
- **Pageviews** («بازدید صفحه», L236–243), 818,033: **direct**. trend · `page_view` · totals.
- **Bounce rate** («نرخ پرش», L249–256), 42%: **direct**. mex · `bounce_rate`.
- **Fastest Growing Page** («بیشترین رشد بازدید», L265–279): **near**.
  - The growth itself is expressible: trend `page_view` totals · group by `page_path` · compare to the previous period · sort by change.
  - It needs a `page_title` prop. It also needs real `page_path` cardinality: the engine's `page_path` holds only 5 demo buckets (`/product/*`, `/`, …) at `rb-engine-v12.js:159`.
- **Highest-Engagement Page** («درگیرکننده‌ترین صفحه», L284–298): **near**. It needs an engagement-rate session metric; `is_engaged` exists as a prop, but there is no rate in `MX_SESS`. It also needs `page_title`.
- **Most Declining Page** («بیشترین افت بازدید», L303–317): **near**. Same gaps as Fastest Growing Page.
- **Comparison chart, trend view** («نمودار مقایسه», L334–355, `renderTrend` L813): **direct**.
  - trend line · `page_view` totals · group by `page_path` · filter `page_path` in the plotted rows.
  - For the metric switcher, users / sessions / time / bounce come from mex `visitors`, `session_totals`, `ts_page` and `bounce_rate` with the same group-by.
- **Comparison chart, distribution view** (L358–399, `drawDonut` L824): **direct**. trend pie · `page_view` · group by `page_path`.
- **Pages table** (L407–618): **direct**.
  - Data Table · group by `page_path` · columns `page_views`, `visitors`, `session_totals`, `ts_page`, `bounce_rate`.
  - The Entry and Exit tabs map to `session_entries`/`entry_rate` and `session_exits`/`exit_rate`.
  - Caveats: the page-title subtitle needs `page_title`, and the row badges (Trending / Underperforming / Declining / Orphan / Dead end) have no engine equivalent.
- **Side panel, badge explainer** (`#pnBadgeInfo`, L644): **none**. It is UI rule copy.
- **Side panel, Trend over time** («روند زمانی صفحه», L646–650): **direct**. mex · up to 3 of `session_totals`, `visitors`, `page_views`, `ts_page`, `bounce_rate` · filter `page_path`=X. The engagement-rate chip is near.
- **Side panel, Overall stats** (L652–660): **direct**. Same metrics as KPIs with filter `page_path`=X.
- **Side panel, Referrer** (L662–669): **direct**. table · `session_totals` · group by `referrer_type` · filter `page_path`.
- **Side panel, Location** (L671–677): **direct**. `visitors` · group by `city`.
- **Side panel, User Agent** (L679–685): **direct**. `visitors` · group by `device_type`.
- **Side panel, Real user experience** (L688–721, LCP/INP/CLS): **none**. This is CWV field data from the Performance service, not event data.
- **Side panel, User journey, next/previous page** (L723–736): **direct**. flows · `jstart=page_view` · expand `page_path` (the existing deep-link params) · filter `page_path`=X.

Sample-number conflicts:
- Users 128,406 vs. engine 7d `page_view` uniques ≈8–10k.
- Sessions 202,730 vs. engine `session_start` ≈15.8k.
- Pageviews 818,033 vs. engine ≈39k.
- The page also disagrees with itself: KPI 818,033 vs. table total 418,033, sessions 202,730 vs. 168,212, bounce 42% vs. 47%.
- The page is roughly 20× the engine's scale.

### Tags: `tags/v13.html` (DONE)

How the page is set up:
- Filter mount at L183: `data-shahin-filter data-shahin-filter-exclude="tag" data-shahin-filter-bare data-page-action`. Date range only; default 7d.
- Re-renders happen on `shahin:lang` (L863) and `shahin:theme` (L864) only, never on a range change.
- Two scripts share the page: legacy L432–649 (`window.__TAGS`) and the ported front-cp script L651–869, which wins the table.
- Local state:
  - `#lcMetric` (L268): pageViews / sessions / users. It is wired.
  - `#tblSearch` (L296): wired.
  - `#perPage` (L315).
  - `selected` (L868): at most 5.
- No report-builder link.
- Data source per the title tooltip: the page meta `og:keyword`.

Every card is grouped or filtered by tag, and the engine has no tag prop. A tag prop would have to be multi-valued: one page counts once under each of its tags, as the Pageviews column tooltip says. The engine has no array-prop semantics. `oneFilterFactor` already tolerates an out-of-catalog prop "(e.g. tags)" (`rb-engine-v12.js:349`), but only as a pseudo share.

Cards:
- **Fastest-growing tag** («روبه‌رشدترین برچسب», L195–209): **near**. Needs `tags`; then trend `page_view` · group by `tags` · compare to the previous period.
- **Longest-Read Tag** («برچسب با بیشترین زمان مطالعه», L214–228): **near**. Needs `tags`; then table · `ts_page` · group by `tags`.
- **Fastest-falling tag** («روبه‌افول‌ترین برچسب», L233–247): **near**. Needs `tags`.
- **Comparison chart, trend** (L266–280, `drawTrend` L797): **near**. Needs `tags`; then trend `page_view` totals / `session_totals` / `visitors` · group by `tags`.
- **Comparison chart, distribution** (L281–283): **near**. Needs `tags`.
- **Tags table** (L286–328): **near**. Needs `tags`; then Data Table · group by `tags` · columns `page_views`, `visitors`, `session_totals`, `ts_page`, `bounce_rate`.
- **Side panel, Trend over time** (L339–344): **near**. Needs `tags` as a filter.
- **Side panel, Overall stats** (L346–349): **near**. Needs `tags`.
- **Side panel, Traffic Acquisition** (L351–354): **near**. Needs `tags`; then group by `referrer_type`.
- **Side panel, Top pages with this tag** (L356–359): **near**. Needs `tags` and `page_title`.
- **Side panel, Co-occurring tags** (L361–364): **near**. Needs a multi-valued `tags` prop plus a co-occurrence computation the builder lacks.
- **Side panel, Location** (L366–369): **near**. Needs `tags`; then group by `city`.
- **Side panel, User Agent** (L371–374): **near**. Needs `tags`; then group by `device_type`.

Sample-number conflicts:
- Tag table total 1,649,100 pageviews vs. engine `page_view` ≈39k per 7d.
- Internally, the highlight cards do not match the rows: Hormuz shows 4,058 on the card vs. 134,000 in the table, and "Nations Cup" has no row.

### Bot traffic: `bot-traffic/v15.html` (DONE; demo-only)

How the page is set up:
- Filter mount at L160: a full `data-shahin-filter`, including the Bots drawer section, which defaults to exclude. That contradicts the page's purpose.
- Default range 7d. `renderAll()` (L833) runs only on load and on `shahin:lang`.
- Local state:
  - `tableFilter` tabs (L273–286, handler L659).
  - `selected=[0,1,2]` (L455).
  - Hash deep links `#dist` and `#bot-N` via `applyHash()` (L838).
- No report-builder link.

Every card is **none**. Bot hits are server or user-agent classification data that Shahin filters out of human records. The engine has no `is_bot`, bot name, bot type, user agent, HTTP status or robots.txt data. Per memory, bot traffic is demo-only and not in production.

Cards:
- KPI **Bot share of traffic** («سهم ربات از ترافیک», L176–182, 17.8%): none.
- KPI **Bot pageviews** («بازدید ربات‌ها», L186–192, 7.1M): none.
- KPI **Identified bots** («ربات‌های شناسایی‌شده», L196–202, 42): none.
- KPI **Suspicious bot share** («سهم ربات مشکوک», L206–212, 11%): none.
- **Top bot-crawled pages** («صفحات هدف ربات‌ها», L216–226): none.
- **Comparison chart, trend view** (L238–249): none.
- **Comparison chart, distribution view** (L251–264): none.
- **Bots table** (L272–312): none.
- Side panel «جزئیات ربات» (L318–325, `openBot` L763):
  - Chips + robots.txt block button: none.
  - Stats strip: none.
  - Pageview trend: none.
  - HTTP status codes (L722): none.
  - Crawl efficiency (L744): none.
  - Target pages (L707): none.
  - User-Agent signature: none.
  - Closing note: none.
- A bridge here would need a separate bot-log stream exposed to the engine, with props such as `bot_name`, `bot_type` and `http_status`. That is a product decision, not a small addition.

### Media: `events-media/v4.html` (DONE)

How the page is set up:
- Five state containers exist: `#mvLoading` (L208), `#mvError` (L308), `#mvDenied` (L318), `#mvLocked` (L327) and `#mvMain` (L345–622).
- `?state=locked` cannot actually be reached. The v4 switcher at L962–994 lacks "locked" and falls back to an empty `mvMain`.
- Shared filter mount at L397 (script L631, which loads after shahin.js; harmless). Default 7d.
- Nothing re-renders on a range change. The only triggers are `shahin:lang` (L924) and the theme observer (L926).
- The locked checklist (L334–338) names `shahin_page_view`, while the engine id is `page_view` (naming drift). It also lists the four `article_*` events as "not arrived".
- Markup bugs:
  - An unclosed CSS comment (L130–141) disables the `.mv-minilist` styles.
  - Curly quotes at L550–551 break the content-gap note.
  - Curly quotes at L418/L492 break the tooltip titles.

Bridge, audited (L940–960):
- Each link is `/report-builder/?type=<funnel|trend>&view=builder`, appended to `#mvMain .sh-card .sh-card-title`. It carries no query, range or filter.
- `applyLang` wipes the hero's static `/realtime/` link (L353), so the hero gets a trend bridge instead.
- No bridge on the two `.sh-metric` KPI tiles, the hero rail boxes, the hot list or the notes.

Cards:
- Hero «نبض تحریریه» / "Newsroom pulse" (L348–394; live, ignores the date filter):
  - **Readers on the site right now** («خواننده فعال در این لحظه», L359–362), 1,482: **none**. Concurrent open sessions in the last 5 minutes; the engine has no minute window.
  - **Pulse sparkline, last 30 min** (`#ecPulse`, `buildPulse` L818): **none**. Same reason.
  - **Hot-news share** («سهم خبر داغ», L366–372), 61%: **near**. Needs an `article_published_at` prop (or an `article_age` virtual) on `page_view`.
  - **Published today** («انتشار امروز», L373–379), 37: **near**. Needs `article_id` + publish date: a distinct count of articles published today.
  - **Hot right now list** (L382–390, `renderTop` L702): **none** at realtime grain. Readers-now × engaged time needs a minute window and `article_engagement_time`.
  - **Spike note `#mvSpike`** (L391–393): **none**. An alert insight, not a query.
- **Article views** («بازدید مقاله‌ها», L401–413), 184,203: **direct**. trend · `page_view` · totals · filter `entity_module`=article. Value mismatch: the engine's `entity_module` values are store-flavoured (Product/Category/Blog/Landing/Other).
- **Returning readers** («خواننده بازگشتی», L414–425), 43%: **direct**. `page_view` uniques · breakdown `is_new_user` · share of Returning.
- **Pages per session** («صفحه در نشست», L436–443), 2.1: **direct**. mex · `pv_per_session`.
- **Mobile share** («سهم موبایل», L444–451), 74%: **direct**. trend pie · `page_view` · group by `device_type`.
- **Peak reading hour** («ساعت اوج مصرف», L452–459): **near**. Needs an `hour_of_day` prop. Range=today with hourly grain covers one day only.
- **Single-article sessions** («نشست‌های تک‌مقاله‌ای», L460–467), 61%: **direct**. mex · `bounce_rate` (single-page sessions) · filter `entity_module`=article.
- **Views by article age** («بازدید بر حسب عمر مقاله», L472–480, `buildDecay` L832): **near**. Needs publish date to derive an `article_age` bucket.
- **Views by article freshness** («سهم بازدید بر اساس تازگی مقاله», L481–486): **near**. Same gap.
- **Reader journey funnel** («قیف سفر خواننده», L490–505): **direct**. funnel `page_view`→`page_view` · step filter `entity_module`=article · uniques.
  - Caveat: the card mixes views with readers; step 1 = 184,203 = the views KPI.
  - The read steps need the `article_read_*` events.
- **Reader acquisition** («منابع ورود خوانندگان», L506–521): **direct**. `page_view` · group by `referrer_type` · pie, or stacked trend for the Trend view. Value mismatch: "Internal navigation" (34%) has no `referrer_type` value.
- **Section share of views** («سهم سکشن‌ها از بازدید», L526–531): **direct**. `page_view` totals · group by `breadcrumb_1_name`. Value mismatch: the engine's values are store categories (Digital, Fashion…), not news sections.
- **Shares & site search** («اشتراک‌گذاری و جستجوی داخلی», L532–553): **near**.
  - Expressible today: `share` totals by `page_path`, and `search_submitted`/`search_no_results`.
  - Missing: `page_title`/`article_id` for "most shared articles", and a `search_term` prop for top searches.
- **Articles in the selected range** (table, L557–620): **near**.
  - Expressible today: views, share and top source via Data Table · group by `page_path` · `page_views` + top `referrer_type`.
  - Missing: read depth and engaged time need the `article_read_depth` and `article_engagement_time` events; age needs publish date; the title needs `page_title`.

Sample-number conflicts:
- Article views 184,203 vs. engine `page_view` ≈39k per 7d (all pages).
- Mobile 74% vs. engine `device_type` Mobile 58%.
- Returning 43% vs. engine `is_new_user` Returning 66%.
- Pages per session 2.1 vs. engine ≈2.5 (39k/15.8k). Close.

### Video pack page (older): `events-video/v4.html` (DONE)

How the page is set up:
- Shared mount at L96, script L688. Default 7d; no range listener.
- The "Range: last 7 days" sub (L150–154) is hardcoded.
- No state switcher and no report-builder link.

Cards:
- **Today's video pulse** (story box, L77–85): **none**.
- **AI Insight alert** (L88–92): **none**.
- **Total Plays** («کل پخش‌ها», L108–115), 242,800: **direct**. trend · `video_started` · totals. The `placement=content` filter is near: the engine has only `media_type`.
- **Completion Rate** («نرخ تماشای کامل», L118–125), 38.6%: **direct**. formula TOTALS(`video_completed`)/TOTALS(`video_started`).
- **Total Watch Time** («کل زمان تماشا», L128–135), 4,810 h: **near**. Needs a watch-time virtual over `video_heartbeat` (count × interval) or a `watched_seconds` prop.
- **Avg Watch / Play** («میانگین تماشا هر پخش», L138–145): **near**. Same gap, divided by `video_started`.
- **Audience Retention Curve** («منحنی نگه‌داشت مخاطب», L160–171): **near**. Needs `position_sec` and `total_duration_sec` on heartbeat.
- **Milestone Funnel** («قیف میلستون», L174–195): **near**. Needs `milestone_percent` on `video_progress` (the catalog lists it; the engine lacks it).
- **Playback Quality Mix** («توزیع کیفیت پخش», L202–213): **near**. Needs a `video_quality_changed` event with `to_quality` (not in the engine).
- **Playback Speed Mix** («توزیع سرعت پخش», L216–227): **near**. `video_rate_changed` IS in the engine (`rb-engine-v12.js`, w=120) but has no `playback_rate` prop.
- **Conversion alert** (L237–241): **none**. Its "Mark as Conversion" wording contradicts Decision 13.
- **Event catalog table** (L243–272): **none**. Schema documentation.
  - Its counts disagree with each other: the array holds 30 events, the sub says 17+7+6, and the footer says 24.
  - The extraction agent wrongly listed some events as absent from the engine. These DO exist: `video_resumed`, `video_seeked`, `video_rate_changed`, `video_fullscreen_toggled`, `video_next_autoplayed`, `video_interrupted`, `captions_toggled`, `audio_track_changed`. Truly absent: `video_quality_changed` and the six phase-2 custom events.
- **Event detail side panel** (L279–288, `openDetail` L608): **none**. Schema documentation.

Sample-number conflicts:
- Plays 242,800 vs. engine `video_started` ≈26.7k per 7d: a 9× conflict.
- Completion 38.6% vs. engine 9,310/28,440 = 32.7%. Close.
- Inside the page, the retention curve ends at 27% while completion is 38.6%.

### Overview: `overview/v9.html` (DONE)

How the page is set up:
- Full shared mount at L32, script L305. Default 7d; no range listener.
- Re-renders happen only on lang and theme (L418–421).
- No report-builder link. The only links go to `/kiosk-mode/` (L45) and `/bot-traffic/`.

Cards:
- **Pageviews** («بازدید صفحات», L54–57), 6,275: **direct**. trend `page_view` totals (or mex `page_views`).
- **Users** («کاربران», L61–64), 2,397: **direct**. mex `visitors`.
- **Sessions** («نشست‌ها», L68–71), 2,535: **direct**. mex `session_totals`.
- **Views per session** («بازدید به ازای هر نشست», L79–82), 2.5: **direct**. mex `pv_per_session`.
- **Session per user** («نشست به ازای هر کاربر», L86–89), 1.1: **direct**. mex `sess_per_user`.
- **Average session duration** («میانگین مدت زمان نشست», L93–96), 135.4: **direct**. mex `avg_session_duration`. The card shows no unit.
- **Returning user** («کاربر بازگشتی», L104–107), 66: **direct**. `visitors` · filter `is_new_user`=Returning.
- **Bounce rate** («نرخ پرش», L111–114), 70.6%: **direct**. mex `bounce_rate`.
- **Chart** («نمودار», L120–123, `renderLine` L362): **direct**. mex · `visitors`, `page_views`, `session_totals` · daily.
- **Top 10 Tags** («پربازدیدترین برچسب‌ها», L127–140): **near**. Needs a multi-valued `tags` (og:keyword) prop.
- **Top 10 Pages** («پربازدیدترین صفحات», L142–154): **direct**. `page_view` totals · group by `page_path` · top 10. The titles need `page_title`.
- **Location** («موقعیت جغرافیایی», L159–186): **direct**. `visitors` · group by `country` / `city`. The map is presentation.
- **User Agent** («مشخصات فنی کاربر», L188–205): **direct**. `visitors` · group by `os` / `browser` / `device_type`. The Brand tab is near (no brand prop).
- **UTM Parameters** («پارامترهای UTM», L210–223): **direct**. `session_totals` · group by `utm_campaign` / `utm_source` / `utm_medium`. Term/ID/Content are near.
- **Referrer** («ارجاع‌دهنده‌ها», L225–256): **direct**. `session_totals` · group by `referrer_type` / `referrer_domain`. Sample shares sum to 111%.
- **Top 10 Bots** («ربات‌های برتر», L261–279): **none**. Bot data.
- **Top Bot-crawled Pages** («صفحات هدف ربات‌ها», L281–295): **none**. Bot data.
- Not counted: the orientation card (L34–39) and the kiosk promo (L41–46).

Sample-number conflicts:
- Pageviews 6,275 vs. engine ≈39k, users 2,397 vs. ≈8–10k, sessions 2,535 vs. ≈15.8k. The overview is about 6× smaller than the engine, while Pages is about 20× larger. The two pages also disagree with each other: users are 2,397 here vs. 128,406 on Pages.
- Inside the page, the chart's daily sums (pageviews 6,827, sessions 5,335) don't match the KPI tiles.
- Returning 66 matches the engine's `is_new_user` Returning share of 0.66, if the 66 is a percentage.

### Realtime: `realtime/v5.html` (DONE)

How the page is set up:
- No shared filter.
- Its own window selector `#rtTimes` (L78–83) offers 5 / 10 / 15 / 30 minutes, default 5. The handler (L380–388) only rewrites the chart title.
- No polling. `SHAHIN_PAGE.version` 'v3' (L279) is stale.
- No report-builder link.

Every card needs a minute-level "last N minutes" range and an intraday "so far" cutoff. The engine's shortest modes are `today` and `yesterday` by hour (`rb-engine-v12.js:213-214`). That single engine gap makes most cards **near**.

Cards:
- **Pageviews today vs yesterday so far** (L41–50), 290 vs 434: **near**. trend `page_view` · range=today · compare to the previous period, but without a same-time cutoff.
- **Users today vs yesterday so far** (L53–62): **near**. Same gap.
- **Sessions today vs yesterday so far** (L65–74): **near**. Same gap.
- Window tiles, 3 cards (L86–108): **near**. Pageviews, users and sessions over the last N minutes need a minute window.
- **Last 5 Minutes chart** (L111–114, per minute): **near**. Needs minute grain.
- **Top 10 Pages** (L131): **near**. Needs the minute window; then group by `page_path`.
- **Location** (L146): **near**. Needs the minute window; then `country` / `city`.
- **User Agent** (L172–189): **near**. Needs the minute window; then `os` / `browser` / `device_type`.
- **UTM Parameters** (L194–206): **near**. Needs the minute window; then `utm_*`.
- **Referrer** (L209–240): **near**. Needs the minute window; then `referrer_type`.
- **Top 10 Tags** (L119): **near**. Needs the minute window + `tags`.
- **Top 10 Bots** (L244–256): **none**. Bot data.
- **Top Bot-crawled Pages** (L259–271): **none**. Bot data.

### Campaigns (UTM): `utm/v19.html` (DONE)

How the page is set up:
- Shared bare mount at L197 (range only, in the header), script L476. Default 7d; no range listener.
- The hardcoded range labels conflict: an Apr–May delta tooltip (L223), a Jun 28–Jul 4 panel axis, and a Sep 15–22 comparison axis (L1440).
- Local state:
  - `#tpMetric` (L214–219)
  - `#csMetric` (L305–314)
  - `rScope='CAMPAIGN'`, `rPage`, `rSelected` (L1319)
  - `#lcMetric` (L347), `#perPage`, `#tblSearch`
  - `pnSel` (L1111)
- Dead pre-v19 code writes into detached stand-ins (L866–1085).

Bridge: «باز کردن در جدول داده» / "Open in Data Table" (L383 → `openInDataTable` L1511).
- Scope maps to `tgb` as CAMPAIGN→`utm_campaign`, SOURCE→`utm_source`, MEDIUM→`utm_medium`.
- TERM, CONTENT and ID silently fall back to `utm_campaign`.
- It drops the range, search, selected rows, columns and sort.
- `tSeedUtm` opens these columns: `session_totals`, `visitors`, `page_views`, `bounce_rate`, `avg_session_duration`, plus `subscription_started` (attribution lnd/30).

Cards:
- **Top Campaign** («کمپین برتر», L209–230), spring_sale_2026, 42,103 sessions: **direct**. table/trend · `session_totals` (or `visitors` / `page_views` / `sess_per_user`) · group by `utm_campaign` · top 1 + daily sparkline.
- **Traffic Engagement Score** («کیفیت ترافیک کمپین», L233–267), 57/100: **near**. The inputs `pv_per_session` and `avg_session_duration` are direct; the 0–100 banded score needs a saved composite metric (a score virtual).
- **Source Vitality** («سلامت منابع», L273–295): **direct**. pie `session_totals` by `utm_source`; centre = mex `bounce_rate`; footer = returning share via `is_new_user`.
- **Channel Mix by Medium** («ترکیب کانال‌ها بر اساس Medium», L299–320): **direct**. stacked bar · `session_totals` by `utm_medium` · the metric switch uses mex metrics. The engagement-rate option is a formula over `is_engaged`.
- **Comparison chart** («نمودار مقایسه», L327–363): **direct** for the Campaign / Source / Medium scopes. trend · `session_totals` / `visitors` / `page_views` · group by `utm_*` · filter on the ticked rows. The Term / Content / ID scopes are near.
- **Dimension table** (L365–414): **direct**. Data Table · group by `utm_*` (the existing bridge) · columns `page_views`, `visitors`, `session_totals`, `avg_session_duration`, `bounce_rate`, `pv_per_session`. Term / Content / ID are near.
- Side panel «جزئیات کمپین» (L417–469):
  - **Campaign Trend**: **direct**. mex metric chips · filter `utm_campaign`=X.
  - **Overall stats**: **direct**.
  - **UTM parameters**: **near**. `utm_term` and `utm_content` are missing.
  - **Landing Pages**: **direct**. `session_entries` by `page_path` · filter campaign.
  - **Source / Medium**: **direct**.
  - **Location**: **direct**. `city`.
  - **User Agent**: **direct**. `device_type`.

Sample-number conflicts:
- spring_sale_2026 has 42,103 sessions, more than the engine's total `session_start` of ≈15.8k per 7d.
- The campaign names don't exist in the engine, whose `utm_campaign` values are Summer sale, Back to school and Newsletter.

### UTM data table: `utm-table/v9.html` + `data-v9.js` (DONE)

How the page is set up:
- **No date range at all.** There is no filter mount and no range control; only the panel says "Trend (14 days)". The bridge therefore cannot carry a range.
- `SHAHIN_PAGE.version` 'v8' (L239) is stale.
- Local state: `active='channel'` (L248), `rankMetric`, the cross-tab `filters` object, `query`, `remap` (L249–256), and the hash `#tab=` (L547).
- No report-builder link, even though utm/v19 links to the report builder's Data Table for the same job.

Cards:
- **Story box** (L165–173): **none**.
- **Tagging-health banner** (`#health`, L279–295): **near**. Needs saved rules for unattributed sessions and hash-named campaigns (a classifier or virtual prop).
- **Ranked list per tab** (L200–209, `renderList` L368): **direct**.
  - Tabs Channel / Source / Medium / Campaign map to Data Table · group by the `channel` classifier (the builder has `tClassifierModal`) or `utm_source` / `utm_medium` / `utm_campaign`.
  - Columns: `session_totals`, `visitors`, `page_views`, `pv_per_session`, `avg_session_duration`.
  - The Term / Content tabs are near.
- Detail panel (L464–497):
  - **KPI grid**: **direct**.
  - **UTM composition**: **direct**. Group by each `utm_*` · filter the selected value.
  - **Trend (14 days)**: **direct**. mex · range n14.
  - **Raw combinations**: **direct**. Data Table with multiple group-bys `utm_source` × `utm_medium` × `utm_campaign`.
- **Remap dialog** (L228–235): **none**. Data management, not a query.

Sample-number conflicts: 729 total sessions vs. engine ≈15.8k, of which about 48% carry a campaign.

### Referrer: `referrer/v16.html` (DONE)

How the page is set up:
- Shared bare mount at L212 (excludes referrer), script L1312. Default 7d; no range listener.
- Local state: `scope='channels'`, `page`, `selected` (L1113), `setScope` (L1125), `visibleCols` (L1089), and `pnSel` (L1336).
- The live `openPanel` (L1211) fills only the name and six stats. The panel's other sections never populate.
- `#chipsBar` probably throws: `buildFlat` targets a missing node.

Bridge: «باز کردن در جدول داده» / "Open in Data Table" (L413 → L1403).
- channels→`referrer_type`, while sources and domains both map to `referrer_domain`.
- The page's channel labels (Organic Search / Direct / Social / Referral / Email) don't match the engine's values (Organic / Direct / Social / Mail / Other). Referral has no target.
- It drops the range and filters.

Cards:
- **Sessions** («نشست‌ها», L227–234), 14,545: **direct**. mex `session_totals`.
- **Active sources** («تنوع منابع ورودی»), 38: **near**. Needs a distinct count of a categorical prop (`referrer_domain`); `PAGG` offers only sum / avg / median / dist.
- **Avg. session duration** («میانگین زمان حضور»), 2:48: **direct**. mex `avg_session_duration`.
- **New users share** («سهم کاربران جدید»), 62.4%: **direct**. `visitors` by `is_new_user`.
- **Top channel** («کانال برتر»): **direct**. `session_totals` by `referrer_type` · top 1.
- **Highest-engagement source** («باکیفیت‌ترین منبع»), 68.3% engaged sessions: **direct**. Data Table hybrid · `session_totals` filtered `is_engaged`=Engaged ÷ `session_totals` · group by `utm_source`. The tooltip says it ranks by duration, which contradicts the displayed value.
- **Best acquisition source** («بهترین منبع جذب»), google, 3,810: **direct**. `visitors` · filter `is_new_user`=New · group by `referrer_domain` / `utm_source`.
- **Channel Concentration Risk** («ریسک تمرکز کانال», L339–357): **direct**. 100% stacked `session_totals` by `referrer_type`; the 60% line is presentation.
- **Comparison chart** («نمودار مقایسه», L363–396): **direct**. trend · `session_totals` / `visitors` / `page_views` · group by `referrer_type` / `referrer_domain`.
- **Data table** (L398–444): **direct**. Data Table · group by `referrer_type` / `referrer_domain` (the existing bridge) · columns `page_views`, `visitors`, `session_totals`, `avg_session_duration`, `bounce_rate`, `pv_per_session`, engagement formula, and new/returning share.
- Side panel «جزئیات منبع» (L447–508):
  - **Source Trend**: **direct**.
  - **Overall Stats**: **direct**.
  - **Top Sources**: **direct**.
  - **Location**: **direct**.
  - **User Agent**: **direct**.
  - **Top Landing Pages**: **direct**. All filter on `referrer_type`=X.

Sample-number check:
- Sessions 14,545 vs. engine `session_start` ≈15.8k, and Organic 42.9% vs. engine `referrer_type` Organic 41%. **Consistent.** This is the only core page close to the engine's scale.
- Inside the page, the concentration card uses TOTAL_S = 328,460.

### User journey: `user-journey/v8.html` (DONE)

How the page is set up:
- No shared filter. Its own `.sh-filterbar` range (L308–326) defaults to **30d**, with no compare and no drawer.
- Local state: `STEPS=3`, `MAXP=50`, `UNIT='session'`, `CHAIN=[]` (L623); sliders `#stepsRange` (L399) and `#maxRange` (L406); `buildChain` (L873); `picked` (L783); `window.UJ` (L917).

Bridge (L422–426, `showOpenRb` L784):
- A static href `?type=flows&jstart=page_view&jexp=page_path`, shown only after a Sankey node is clicked.
- It never carries the picked page, the chain, the step count or the 30d range.
- Its note says the numbers differ because the report builder counts users, not sessions. This contradicts Decision 7.

Cards:
- **User Journey Agent** («ایجنت مسیر کاربر», L329–348): **none**. AI-generated findings. Each finding could deep-link to a flows query.
- **Multi-page Sessions** («نشست‌های چندصفحه‌ای», L351–379), 34.2%: **direct**. 1 − mex `bounce_rate`.
- **Avg. Journey Depth** («میانگین عمق سفر»), 1.6: **direct**. mex `pv_per_session`.
- **Top Entry Point** («پرتکرارترین ورود»): **direct**. `session_entries` by `page_path` · top 1.
- **User Journey Map** (Sankey, «نقشهٔ سفر کاربر», L382–444): **direct**. flows in property mode over `page_path` with depth = `STEPS`, counting sessions. That requires a session count in Journeys; the builder counts users or totals (`rb-amp-builder.js:2592`), so the count-model mismatch remains.
- **Top Entry Pages** («صفحات ورود برتر», L448–454): **direct**. `session_entries` by `page_path`.
- **Top Exit Pages** («صفحات خروج برتر», L455–461): **direct**. `session_exits` by `page_path`.
- **Exit vs. Continue** («خروج در برابر ادامه», L465–475), 65.8% / 34.2%: **direct**. `bounce_rate` vs. 1 − `bounce_rate`.

Sample-number conflicts:
- 5,210 sessions in 30d vs. engine `session_start` ≈67k per 30d.
- Inside the page, Top Entry says 14% for Budget while the entry list says 27%.

### Activity patterns: `user-activity-patterns/v6.html` (DONE)

How the page is set up:
- No shared filter. Its own range (L96–111) defaults to **30d**. Metric select `#metricSel` (L113–117).
- Two renderers fight over the same containers:
  - Layer A (L221–447) listens to the range: `STATE` at L229.
  - Layer B, ECharts (L469–602), ignores the range.
- `SHAHIN_PAGE.version` 'v4' (L217) is stale.

All four heatmaps are **near**. The single gap is `hour_of_day` and `weekday` props, or a heatmap view over a time pivot.
- **Monthly Activity** («فعالیت ماهانه», L122–138): weekday × week for 52 weeks. It always shows 12 months by design (L127), ignoring the range.
- **Daily Activity** («فعالیت روزانه», L141–149): needs weekday.
- **Hourly Activity** («فعالیت ساعتی», L152–160): needs hour of day.
- **Activity Time Map** («نقشه زمان فعالیت», L163–177): weekday × hour.

### Device & technology: `device-technology/v30.html` (DONE)

How the page is set up:
- Shared bare mount at L255 (excludes device). Default 7d; no range listener.
- Local state:
  - `uScope` / `uSelected` / `uPage` (L1502), `setScope` (L1511)
  - `switchView` (L1665), `drawTrend` (L1600)
  - The older IIFE's `curDim` / `plotted` (L690–694)
- Two table renderers conflict (L923 vs. L1552).

Cards:
- **Target Environments** («محیط‌های هدف (۹۵٪)», L266–278), 14: **direct**. Data Table · group by `os` × `browser` · `visitors` · cumulative cut at 95% (presentation).
- **Top OS** («سیستم‌عامل برتر», L279–288): **direct**. `visitors` by `os`. The version subtitle is near.
- **Top Browser** («مرورگر برتر», L289–298): **direct**. `visitors` by `browser`. The version subtitle is near.
- **Device Distribution** («توزیع دستگاه‌ها», L299–315): **direct**. `visitors` by `device_type`.
- **Viewport Width Distribution** («توزیع عرض نمایشگر», L321–336): **near**. Needs a `viewport_width` prop.
- **Initial Viewport** («محدوده دید اولیه», L340–349): **near**. Needs viewport height and pixel scroll depth; `scroll_depth_reached` has no props.
- **Screen Orientation** («جهت نمایش», L352–384): **near**. Needs an `orientation` prop.
- **Comparison chart** («نمودار مقایسه», L394–435): **direct**. trend · `visitors` / `session_totals` / `page_views` · group by `os` / `browser` / `device_type`. The Brand scope is near.
- **Table** (L437–477): **direct**. Data Table · group by the dimension · `visitors`, `session_totals`, `page_views`, `bounce_rate`, and engagement rate = 1 − `bounce_rate` per its tooltip.
- Side panel drill (L490–531):
  - **Anomaly box**: **none**. Rule-based flags.
  - **Trend**: **direct**.
  - **Overall Stats**: **direct**.
  - **Top Browsers / OS**: **direct**.
  - **Version Breakdown**: **near**. Needs `os_version` / `browser_version`.
  - **Location**: **direct**. `city`.
  - **User Agent**: **direct**. `device_type`.
- **Test matrix panel** (L533–552): **direct**. Data Table · `os` × `browser` · `visitors` + `bounce_rate`.

Sample-number conflicts:
- Users 128,406 vs. engine ≈8–10k.
- OS: Windows 67.3% on the page vs. the engine's `os` Windows 22% (Android 58%).
- Mobile 64% vs. the engine's 58%. Close.


Expected anchors for classification, verified against the engine:

- direct:
  - completion rate = formula TOTALS(video_completed)/TOTALS(video_started)
  - revenue = property sum of `order_value` on `purchase`
  - checkout funnel = cart_viewed → begin_checkout → payment_info_submitted → purchase (PAIR_RATES `rb-engine-v12.js:775-782`)
  - bounce rate, avg session duration, sessions, pv/session via `mex`/`table` (MX_SESS `rb-amp-builder.js:3646-3650`, T_OOTB `:2868-2871`)
  - device, OS, browser, city, ISP, referrer and UTM source/medium/campaign breakdowns (GLOBAL_PROPS `rb-engine-v12.js:143-148`)
- near: see "Engine gaps".
- none: bot classification, ad revenue, Core Web Vitals.

Magnitude rule for the spot checks:

- A 7-day total ≈ `w × 0.94`.
- Period uniques ≈ `w × 0.94 × uf(0.56–0.70) / ~2.75`.
- So page_view ≈ 39k events (≈8–10k users), session_start ≈ 15.8k, video_started ≈ 26.8k and purchase ≈ 218 in 7 days.

## Existing bridges and deep-link params

Deep-link params that v12 actually reads:

- `type`, from the allow-list at `rb-engine-v12.js:1728-1730`: trend, funnel, retention, flows, table, mex, stick, life, comp, emx, impact, compass, personas, exp.
- `state=loading` (`rb-engine-v12.js:1742`).
- `tgb`, only with type=table and a known PROPS id. It seeds the UTM data table (`rb-amp-builder.js:5010`, `tSeedUtm` at `:3585`).
- `jstart` and `jexp`, which open Journeys anchored on an event and expanded by a prop (`rb-amp-builder.js:5008-5011`).
- `s=events` (`v12.html:1521-1522`).
- `board`, `saved`, `space`, `view=spaces|builder`, `notebook`, `linkingDashboardId` (`rb-shell.js:2205-2213`).
- `role` (`rb-shell.js:25`).
- `prole` (`rb-amp-builder.js:2890`).

Missing params:

- No param carries range, filters, events, measure or group-by.
- `?type=X` alone calls `newReport()`, which opens an empty builder (`rb-shell.js:2211`, `:1319`).
- `type` takes precedence over `view=builder`.

Bridges already on dashboard pages:

- `utm/v19.html:1511`
  - Code: `openInDataTable()` → `../report-builder/v12.html?type=table&tgb=<utm_campaign|utm_source|utm_medium>`.
  - TERM, CONTENT and ID map to utm_campaign because the engine has no utm_term, utm_content or utm_id.
  - Gaps: no range, no filters.
- `referrer/v16.html:1403`
  - Code: `openInDataTable()` → `?type=table&tgb=<referrer_type|referrer_domain>`.
  - Gaps: no range, no filters.
- `user-journey/v8.html:424`
  - Code: `#ujOpenRbBtn` → `?type=flows&jstart=page_view&jexp=page_path`.
  - It shows a note that the report builder counts users, not sessions, "so numbers differ from this page". That directly contradicts Decision 7.
- `video-dashboard/v36.html:2176-2200`
  - The script appends to every `.sh-card/.sh-table-wrap/.vd-box` title a link to `/report-builder/?type=<funnel|retention|trend>&view=builder`.
  - The type is chosen by Persian keyword match (قیف/اتمام/تبدیل/سرانجام → funnel; ماندگاری/بازگشت/ریتنشن → retention).
  - It carries no query, range or filters, so it opens an empty builder of that type.
- `events-media/v4.html:941-960`
  - It uses the same pattern on `#mvMain .sh-card .sh-card-title` only, with MAP قیف/Journey/funnel → funnel, else trend.
  - It opens an empty builder.
- No bridge on: `overview`, `realtime`, `pages`, `utm-table`, `device-technology`, `user-activity-patterns`, `tags`, `bot-traffic`, `events-video`, `events-ecommerce`.
- Bridge defects found in the extraction passes:
  - `video-dashboard/v36`: the keyword match runs after `applyLang`. In English mode, which is the default when localStorage is empty, every card becomes trend. The links also vanish after any language toggle.
  - `events-media/v4`: it re-runs on `shahin:lang`, so that bug is avoided. But `applyLang` wipes the hero's `/realtime/` link, and the two KPI tiles get no bridge.
  - `utm/v19`: TERM, CONTENT and ID silently fall back to `utm_campaign`.
  - `referrer/v16`: sources and domains both become `referrer_domain`, and the page's channel labels don't match the engine's `referrer_type` values.
  - `user-journey/v8`: the href is static. It ignores the picked node, the chain, the steps and the page's 30d range.

Internal machinery to reuse for the bridge, already in the report builder:

- `RBH.openSaved(i)` + `RBH.carry(range, filters)` (`v12.html:1076-1090`).
- `applyQ(q, type)` (`v12.html:1050-1067`) restores the trend, funnel, ret, flows, filters and range state, and the `amp` builder state via `RBAmp.load` (`rb-amp-builder.js:4979-4981`).
- Boards already carry the board range and filters into the report they open (`rb-shell.js:1304-1318`, `effective()` at `:222`, `pinnedFilters` with `__range`).
- Seeded boards b1 "Weekly sales pulse" and b2 "Video health" (`rb-shell.js:106-120`) are engine-based mini dashboards.
- Templates `TPLS` (`rb-amp-builder.js:4912-4924`) already encode several dashboard-like queries (daily readers, by source, campaigns table, video completion funnel, returning readers). No URL param selects them.
- What the bridge needs is one new param that feeds `applyQ` and `carry`. Options are a serialized query (`q=`) or `tpl=` + `range=` + `f=`.

## Range and filter state per page

- Shared component `assets/shahin-filter.js`:
  - It injects the bar into `[data-shahin-filter]`: a date range of radios `input[name="drRange"]` with values 7d / 30d / 3m / 6m / 12m / custom, and 7d marked `data-default`.
  - It also injects drawer `#shMega` with sections Page (page_path), Referrer, UTM, Device, Location, Tag, User type and Bot.
  - `assets/shahin.js` wires it: `buildMegaFilters` (line 557), `buildDateRanges` (line 728), exposed as `Shahin.megaFilters` / `Shahin.dateRanges` (lines 794-795).
  - State lives only in the DOM (checked radio and checkboxes). No change event is dispatched, so a bridge must read the DOM at click time.
- Range values match the engine's `rangeInfo()` keys one-to-one (`rb-engine-v12.js:202-224`). Carrying the range is trivial.
- Filters do not map one-to-one:
  - Dashboard drawer values are plain strings, such as "/news" or channel names like "Organic Search".
  - The report builder rebuilds its own drawer from PROPS (`v12.html:1553`, `buildEventDrawer`) with checkbox values `prop::value` (`v12.html:1061`) and engine values like "Organic".
  - The Tag and Bot sections have no engine prop. `oneFilterFactor` tolerates unknown props by using a pseudo share (`rb-engine-v12.js:349-352`), so they would "work" but mean nothing.
- Per page, verified so far:
  - `events-ecommerce/v5`: shared mount at L285; 7d; local `funnelSeg='mobile'` (L1307).
  - `video-dashboard/v36`: no shared component. Inline range at L263–294 with **default 30d**, and an inline drawer at L311–505 with video-specific sections (video id, category, duration, playback start, carrier).
  - `pages/v14`: shared bare mount at L200, range only; 7d.
  - `tags/v13`: shared bare mount at L183, excludes tag; 7d.
  - `bot-traffic/v15`: shared full mount at L160; 7d.
  - On every verified page, nothing re-renders when the range or filters change. All numbers are static sample data.
  - `events-media/v4`: shared mount at L397; 7d. The hero ignores the filter by design.
  - `events-video/v4`: shared mount at L96; 7d.
  - `overview/v9`: shared full mount at L32; 7d.
  - `realtime/v5`: no shared filter. Its own minute window `#rtTimes` (5/10/15/30, default 5, L78–83) changes only the title.
  - `utm/v19`: shared bare mount at L197; 7d. Local `rScope`, `rSelected` (L1319), `#tpMetric`, `#csMetric`, `#lcMetric`.
  - `utm-table/v9`: **no range control at all**. Local `active` tab, `rankMetric`, `filters` (L248–256).
  - `referrer/v16`: shared bare mount at L212 (excludes referrer); 7d. Local `scope`, `selected` (L1113).
  - `user-journey/v8`: no shared filter. Own range L308–326 with **default 30d**. Local `STEPS`, `MAXP`, `UNIT='session'`, `CHAIN` (L623).
  - `user-activity-patterns/v6`: no shared filter. Own range L96–111 with **default 30d**. `#metricSel`; two renderers, and only layer A follows the range.
  - `device-technology/v30`: shared bare mount at L255 (excludes device); 7d. Local `uScope`, `uSelected` (L1502).
- Consequences for the bridge:
  - Four pages default to 30d (video-dashboard, user-journey, user-activity-patterns, plus the realtime minute window) while the rest use 7d. utm-table has no range at all.
  - Pages using the `-bare` mount expose only the range, so their filter state is always empty. Page-local selections (scope tabs, ticked rows, `funnelSeg`, picked journey node) are the real "filters" the bridge must carry.
  - No page re-renders on range change, so in this demo every card's numbers are static regardless of the selected range.

## Summary counts (direct/near/none per dashboard)

- Video (`video-dashboard/v36`), 35 units: 6 direct, 24 near, 5 none.
- Store (`events-ecommerce/v5`), 38 units: 17 direct, 19 near, 2 none.
- Media (`events-media/v4`), 19 units: 8 direct, 7 near, 4 none.
- Video pack page (`events-video/v4`), 13 units: 2 direct, 6 near, 5 none.
- Overview (`overview/v9`), 17 units: 14 direct, 1 near, 2 none.
- Pages (`pages/v14`), 18 units: 13 direct, 3 near, 2 none.
- Campaigns UTM (`utm/v19`), 13 units: 11 direct, 2 near, 0 none.
- Referrer (`referrer/v16`), 16 units: 15 direct, 1 near, 0 none.
- User journey (`user-journey/v8`), 8 units: 7 direct, 0 near, 1 none.
- Realtime (`realtime/v5`), 15 units: 0 direct, 13 near, 2 none. Nearly all of the near cards share one gap: a minute-level range.
- Device & technology (`device-technology/v30`), 17 units: 12 direct, 4 near, 1 none.
- UTM data table (`utm-table/v9`), 8 units: 5 direct, 1 near, 2 none.
- Activity patterns (`user-activity-patterns/v6`), 4 units: 0 direct, 4 near, 0 none. The single gap is hour and weekday props.
- Tags (`tags/v13`), 13 units: 0 direct, 13 near, 0 none. The single gap is a multi-valued `tags` prop.
- Bot traffic (`bot-traffic/v15`, demo-only), 16 units: 0 direct, 0 near, 16 none.
- **Total: 250 units, 110 direct (44%), 98 near (39%), 42 none (17%).**
  - The three businesses (video-dashboard, events-ecommerce, events-media) have 92 units: 31 direct, 50 near, 11 none.
  - The core analytics pages are mostly direct today.
  - Excluding bot-traffic, the "none" bucket is realtime concurrency, GSC/SEO data, CWV, AI/narrative boxes, and documentation panels.

## Engine gaps to close (events/props/virtuals)

Each gap is verified absent from `rb-engine-v12.js` EVENTS (lines 36-95) and PROPS (lines 149-182).

- Range and filter deep link: no URL param. This is the top blocker, since every existing bridge drops them.
- Media:
  - The `article_read_started`, `article_read_depth` (depth_percent), `article_read_completed` and `article_engagement_time` (active_time_sec) events are missing. They are required by PRD-Business-Media.
  - The `article_id`, publish date / article age, section and author props are missing.
  - `scroll_depth_reached` exists but carries no percent prop.
- Store:
  - Item, product and category props on ecom events are missing; only global `breadcrumb_1_name` and `entity_module` exist.
  - Quantity and item revenue are missing; `order_value` is only on purchase, refund and cancel.
  - PRD events such as `stock_unavailable` and `coupon_removed` are missing.
  - Verified against `events-ecommerce/v5`:
    - Missing events: `order_on_hold`, `restore_cart_item`, `review_submitted` (+`rating`), `product_downloaded`, `coupon_removed`.
    - Missing props: `product_id`, `product_name`, category, brand and price on the item events; a gateway prop (`payment_method` lacks BNPL and the named gateways); `coupon_code` on `coupon_applied`/`purchase`; `search_term` on `search_submitted`; `discount_amount` and `shipping_cost` on `purchase`; `is_first_purchase`.
    - Naming drift: the page uses `refund_value` on `refund_issued` (L1590, L1750), while the engine uses `order_value`.
    - Calibration: the engine's `purchase` w=232 and `order_value` mean of 1.65M T do not match the page's 385 orders and 533K AOV. Either the engine or the page has to change.
- Video:
  - Video id, title, duration, watch-time and player props are missing; video events carry only `media_type`.
  - Verified against `video-dashboard/v36`:
    - Missing props: `video_id`/`video_title`, `percent` on `video_progress`, `video_duration`, a watch-time virtual (heartbeat count × interval) or `watch_time_sec`, `play_trigger`, `quality`, `ad_position`, `content_category`, startup time, `buffer_duration_ms`, playhead/seek position, device brand.
    - Missing events: `video_impression`, `video_quality_changed`, `video_cta_clicked`, video download, mute, skip intro, `video_play_intent`.
    - The page's "missing event" claims are wrong for playback error (`video_error`) and subtitles (`captions_toggled`).
  - The progress milestone (25/50/75) as a prop on `video_progress` is missing.
  - PRD events such as `video_impression` and `video_quality_changed` are missing.
- Core analytics:
  - utm_term, utm_content and utm_id are missing.
  - Hour-of-day and weekday props for the activity heatmaps are missing.
  - Screen resolution, browser version and OS version are missing.
  - Page title and tag props are missing.
  - is_bot / bot category is missing.
  - A realtime minute-level "active now" view is missing; the shortest range is today by hour.
- Media, verified against `events-media/v4`:
  - Missing events: `article_read_started`, `article_read_depth` (`depth_percent`), `article_read_completed`, `article_engagement_time` (`active_time_sec`).
  - Missing props: `article_id`, `article_published_at` (giving an `article_age` virtual), `page_title`, `search_term`, `hour_of_day`.
  - Missing values: an "Article" value for `entity_module`, news-section values for `breadcrumb_1_name`, and an "Internal" value for `referrer_type`.
  - Naming drift: the locked checklist says `shahin_page_view`, the engine says `page_view`.
- Core analytics, verified against the core pages:
  - Missing props: a multi-valued `tags` prop with array semantics, `page_title`, `utm_term`, `utm_content`, `utm_id`, `hour_of_day`, `weekday`, `os_version`, `browser_version`, device brand, `viewport_width`, viewport height and pixel scroll depth, `orientation`.
  - Missing metrics: an engagement-rate session metric, and a distinct count of a categorical prop (`PAGG` lacks it).
  - Missing range modes: a minute-level window (last 5/10/15/30 min) and an intraday "so far" compare cutoff.
  - Missing count model: a session count in Journeys.
- Calibration: the sample magnitudes disagree with the engine on almost every page. Pages ≈20× larger, overview ≈6× smaller, Store orders ≈1.8× larger, video plays ≈9× larger. Only referrer/v16 is at engine scale. The Phase 4 bridge must re-derive the dashboard numbers from the engine (Decision 7), not keep the hand-typed values.
- The count model is unaligned: user-journey counts sessions while the report builder counts users (see the bridge note at `user-journey/v8.html:424`).

## Excluded pages

- The exploratory `events-*` packs not in Store/Video/Media (decision 3), kept on disk by rule:
  - events-advertising, events-ai, events-api, events-audio, events-auth, events-community
  - events-content (candidate Media pack; not tied to Media in PRD-Business-Media or events-media/v4)
  - events-education, events-exchange, events-gallery, events-gaming, events-marketplace, events-mobile
  - events-navforms, events-saas, events-search, events-security, events-subscription, events-support, events-travel, events-vod
- `ads-dashboard/v5`: the Pack 7 Advertising dashboard. It is not in scope and is built on ad revenue, eCPM and RPM, which is not Shahin event data.
- Setup pages, not dashboards: `events-start`, `events-settings`.
- Out of scope, not event data:
  - SEO pages (seo-*, ai-visibility): Search Console and LLM data.
  - core-web-vitals, performance-dashboard, real-user-experience: CWV/RUM metrics.
  - Billing: subscription, payment-*, services-usage, gift-subscription, enterprise-plan.
  - Admin and settings pages: admin, enterprise-admin, audit-log, project-settings.
- Also excluded:
  - kiosk-mode: a display configuration.
  - session-replay*: recordings, not cards.
  - users-list and user-profile: people pages.
  - The legacy monoliths at the wireframes root.
