/* ═════════ Template catalog — shared by the report builder (rb-amp-templates.js) and the ready-made dashboards gallery
   (events-start v8). PM 2026-11-03: v8 is the single template gallery; both pages read the same templates, role bindings, usage,
   copies and the demo's seeded customer template from here, so the two can never drift. Pure data and helpers: no DOM, no shell;
   the page passes in its own event lookup (RB from rb-engine-v12.js + rb-data-defs.js) where one is needed. ═════════ */
(function(){
'use strict';
/* ── the catalog ── a role id is written «@role» inside a chart's state and replaced by the bound event when it renders or is saved */
var TR=function(ev, o){ o=o||{}; return Object.assign({ events:[{ id:ev, filters:[], groupBy:o.gb||'' }].concat((o.more||[]).map(function(x){ return { id:x, filters:[], groupBy:'' }; })), measure:o.m||'uniques', viz:o.viz||'line', interval:o.iv||'auto' }, o.extra||{}); };
var FU=function(evs){ return { events:evs.map(function(x){ return { id:x, filters:[], groupBy:'' }; }), funnel:{ count:'uniques' } }; };
var RT=function(a, b){ return { events:[{ id:a, filters:[], groupBy:'' },{ id:b, filters:[], groupBy:'' }] }; };
/* ── PM 2026-10-25, TG-6: each business-type template carries its fixed page's full card set ──
   Ported from the fixed pages' own engine specs (events-ecommerce/v5, video-dashboard/v36, events-media/v5; exchange from
   events-exchange/v11's funnel and KPI cards), with each role's event written «@role». A card the engine can't express is not
   rebuilt by hand: the template view names it with the reason the fixed page's rb-bridge button gives. Ranges are fixed per card
   (the fixed pages follow their filter bar). An event or property the project doesn't send shows the no-data line. */
var E=function(id, o){ return Object.assign({ id:id, filters:[], groupBy:'' }, o||{}); };
var TT=function(evs, o){ return Object.assign({ events:evs, measure:'totals', viz:'line', interval:'auto' }, o||{}); };
var PSUM=function(evs, o){ return TT(evs, Object.assign({ measure:'prop', prop:'order_value', pagg:'sum' }, o||{})); };
var FX=function(evs, f, o){ return TT(evs, Object.assign({ measure:'formula', formula:f }, o||{})); };
var FN2=function(evs, f, gs){ var a={ events:evs, funnel:Object.assign({ count:'uniques' }, f||{}) }; if(gs) a.groupSeg=gs; return a; };
var PF=function(p, v){ return [{ prop:p, op:'in', vals:[v] }]; };
var C=function(fa, en, type, range, amp){ return { fa:fa, en:en, type:type, range:range, amp:amp }; };
var NETF=function(o){ return TT([E('@buy'),E('refund_issued')], Object.assign({ measure:'formula', formula:'$:PROPSUM(A)-PROPSUM(B)' }, o||{})); };
var STORE_X=[
  C('درآمد خالص امروز (خرید منهای استرداد)','Net revenue today (purchases minus refunds)','trend','today', NETF({ interval:'hour', viz:'kpi' })),
  C('خریدهای موفق امروز','Successful orders today','trend','today', TT([E('@buy')],{ interval:'hour', viz:'kpi' })),
  C('نرخ تبدیل خرید (نشست تا خرید)','Purchase CVR (session to purchase)','funnel','30d', FN2([E('session_start'),E('@buy')],{ hold:'_session' })),
  C('درآمد خالص (خرید منهای استرداد)','Net revenue (purchases minus refunds)','trend','30d', NETF({ viz:'kpi' })),
  C('میانگین ارزش سفارش','Average order value','trend','30d', TT([E('@buy')],{ measure:'prop', prop:'order_value', pagg:'avg', viz:'kpi' })),
  C('تعداد سفارش','Orders','trend','30d', TT([E('@buy')],{ viz:'kpi' })),
  C('رهاسازی سبد (سبد تا خرید)','Cart abandonment (cart to purchase)','funnel','30d', FN2([E('@cart'),E('@buy')],{ hold:'_session' })),
  C('تلاش پرداخت، ناموفق و در انتظار','Payment attempts, failures and holds','trend','30d', TT([E('payment_info_submitted'),E('purchase_failed'),E('order_on_hold')])),
  C('سفارش در انتظار پرداخت','Orders on hold','trend','30d', TT([E('order_on_hold')],{ viz:'kpi' })),
  C('سفارش‌های ناتمام به تفکیک درگاه','Unfinished orders by gateway','trend','30d', TT([E('order_on_hold',{ groupBy:'payment_gateway' }),E('purchase_failed',{ groupBy:'payment_gateway' })],{ viz:'table' })),
  C('تلاش و شکست به تفکیک درگاه','Attempts and failures by gateway','trend','30d', TT([E('payment_info_submitted',{ groupBy:'payment_gateway' }),E('purchase_failed',{ groupBy:'payment_gateway' })],{ viz:'table' })),
  C('حذف و بازگشت اقلام سبد','Cart removals and restores','trend','30d', TT([E('remove_from_cart'),E('restore_cart_item')],{ viz:'bar' })),
  C('روند سفارش‌های در انتظار و تاییدشده','Orders on hold and confirmed — trend','trend','30d', TT([E('order_on_hold'),E('order_on_hold_confirmed')],{ viz:'bar' })),
  C('نرخ تبدیل به تفکیک دستگاه','CVR by device','funnel','30d', FN2([E('session_start'),E('@buy')],{ hold:'_session' },'device_type')),
  C('عملکرد محصول','Product performance','trend','30d', TT([E('@view',{ groupBy:'product_name' }),E('@cart',{ groupBy:'product_name' }),E('@buy',{ groupBy:'product_name' })],{ viz:'table' })),
  C('دیدگاه‌ها به تفکیک امتیاز','Reviews by rating','trend','30d', TT([E('review_submitted',{ groupBy:'rating' })],{ viz:'bar' })),
  C('دانلود محصول دیجیتال','Digital product downloads','trend','30d', TT([E('product_downloaded')])),
  C('روند درآمد ناخالص و استرداد','Gross revenue and refunds — trend','trend','30d', PSUM([E('@buy'),E('refund_issued')],{ viz:'bar', interval:'day' })),
  C('قیف کامل بازدید تا خرید','Full funnel, page view to purchase','funnel','30d', FN2(['page_view','item_list_viewed','@view','@cart','cart_viewed','@checkout','shipping_info_submitted','payment_info_submitted','@buy'].map(function(x){ return E(x); }))),
  C('درآمد به تفکیک روش پرداخت','Revenue by payment method','trend','30d', PSUM([E('@buy',{ groupBy:'payment_method' })],{ viz:'bar' })),
  C('قیف پرداخت','Checkout funnel','funnel','30d', FN2([E('@checkout'),E('shipping_info_submitted'),E('payment_info_submitted'),E('@buy')])),
  C('خرید اول در برابر تکراری','First vs repeat purchases','trend','30d', TT([E('@buy',{ groupBy:'is_first_purchase' })],{ viz:'bar' })),
  C('پرتکرارترین عبارت‌های جستجو','Top search terms','trend','30d', TT([E('search_submitted',{ groupBy:'search_term' })],{ viz:'bar' })),
  C('درآمد به تفکیک کانال','Revenue by channel','trend','30d', PSUM([E('@buy',{ groupBy:'channel' })],{ viz:'bar' })),
  C('نشست‌ها به تفکیک کانال','Sessions by channel','trend','30d', TT([E('session_start',{ groupBy:'channel' })],{ viz:'bar' })),
  C('خریدها به تفکیک روز و ساعت','Purchases by weekday and hour','trend','30d', TT([E('@buy',{ groupBy:'weekday' })],{ viz:'table', groupSeg:'hour_of_day' })),
  C('کد تخفیف تا خرید','Coupon to purchase','funnel','30d', FN2([E('coupon_applied'),E('@buy')], null, 'coupon_code')),
  C('سرنوشت کدهای تخفیف','Coupon outcomes','trend','30d', TT([E('coupon_applied'),E('coupon_denied'),E('coupon_removed')],{ viz:'bar' }))];
var STORE_MISS=[['کاربران آنلاین','Online users','کاربران ۵ دقیقه اخیر به بازه دقیقه‌ای نیاز دارند که گزارش‌ساز ندارد؛ کوتاه‌ترین بازه «امروز، ساعتی» است.','Users in the last 5 minutes need a minute-level range the report builder doesn’t have; its shortest is “today, by hour”.'],
  ['نرخ بازیابی سبد رهاشده','Cart Recovery Rate','این متریک به یکی شدن هویت خریدار نیاز دارد؛ تا شاهین هویت کاربران را یکی نکند، در گزارش‌ساز ساخته نمی‌شود.','This metric needs buyer identity stitching; it can’t be built in the report builder until identity ships.']];
var WATCHF='$:TOTALS(A)*10/TOTALS(B)';   /* watch seconds per play: heartbeats × the 10-second interval ÷ plays */
var RATE='%:TOTALS(B)/TOTALS(A)';
var VIDEO_X=[
  C('ویدیوهای دیده‌شده','Videos viewed','trend','30d', TT([E('@play')],{ measure:'prop', prop:'video_title', pagg:'distinct', viz:'kpi' })),
  C('نرخ نمایش به پخش','Impression-to-play rate','trend','30d', FX([E('video_impression'),E('@play')], RATE, { viz:'kpi' })),
  C('سهم ویدیو از زمان حضور','Video share of time on site','mex','30d', { mex:{ metrics:[{ kind:'hybrid', inputs:[{ L:'A', ev:'video_heartbeat', meas:'totals' }], sin:[{ L:'S', m:'ts_sum' }], expr:'%:A*10/S' }] } }),
  C('میانگین زمان تماشا برای هر پخش','Average watch time per play','trend','30d', FX([E('video_heartbeat'),E('@play')], WATCHF, { viz:'kpi' })),
  C('روند زمان تماشا','Watch time trend','trend','30d', FX([E('video_heartbeat'),E('@play')], WATCHF, { interval:'day' })),
  C('نحوه شروع پخش','Playback source','trend','30d', TT([E('@play',{ groupBy:'play_trigger' })],{ viz:'pie' })),
  C('قیف اتمام پخش','Completion funnel','funnel','30d', FN2([E('@play'),E('video_progress',{ filters:PF('percent','25%') }),E('video_progress',{ filters:PF('percent','50%') }),E('video_progress',{ filters:PF('percent','75%') }),E('@done')])),
  C('اتمام و نشست به تفکیک کانال','Completions and sessions by channel','trend','30d', TT([E('session_start',{ groupBy:'channel' }),E('@done',{ groupBy:'channel' })],{ viz:'table' })),
  C('نرخ توقف (گیر بیش از ۳ ثانیه)','Stall rate (stalls over 3s)','trend','30d', FX([E('@play'),E('video_buffered',{ filters:PF('buffer_duration','Over 3s') })], RATE, { viz:'kpi' })),
  C('نرخ خطای پخش','Playback error rate','trend','30d', FX([E('@play'),E('video_error')], RATE, { viz:'kpi' })),
  C('کیفیت تماشا و دانلود','Watch and download quality','trend','30d', TT([E('video_heartbeat',{ groupBy:'quality' }),E('video_downloaded',{ groupBy:'quality' })],{ viz:'bar' })),
  C('کاهش کیفیت انطباقی','Adaptive quality drops','trend','30d', TT([E('video_quality_changed',{ groupBy:'quality_shift' })],{ viz:'bar' })),
  C('بینندگان به تفکیک دستگاه','Viewers by device','trend','30d', TT([E('@play',{ groupBy:'device_type' })],{ measure:'uniques', viz:'pie' })),
  C('نرخ اتمام آگهی','Ad completion rate','trend','30d', FX([E('@adStart'),E('@adDone')], RATE, { viz:'kpi' })),
  C('نرخ رد آگهی','Ad skip rate','trend','30d', FX([E('@adStart'),E('ads_video_skipped')], RATE, { viz:'kpi' })),
  C('ریزش در میانه آگهی','Left during the ad','trend','30d', FX([E('@adStart'),E('@adDone'),E('ads_video_skipped')],'%:(TOTALS(A)-TOTALS(B)-TOTALS(C))/TOTALS(A)',{ viz:'kpi' })),
  C('نرخ کلیک دکمه ویدیو','Video CTA click rate','trend','30d', FX([E('@play'),E('video_cta_clicked')], RATE, { viz:'kpi' })),
  C('عملکرد آگهی به تفکیک جایگاه','Ad performance by position','trend','30d', TT([E('@adStart',{ groupBy:'ad_position' }),E('@adDone',{ groupBy:'ad_position' }),E('ads_video_skipped',{ groupBy:'ad_position' }),E('ads_video_clicked',{ groupBy:'ad_position' })],{ viz:'table' })),
  C('ویدیوها','Videos','trend','30d', TT([E('@play',{ groupBy:'video_title' }),E('@done',{ groupBy:'video_title' }),E('video_buffered',{ groupBy:'video_title' })],{ viz:'table', rows:16 })),
  C('زمان شروع پخش','Startup time','trend','30d', TT([E('@play',{ groupBy:'startup_time' })],{ viz:'bar' })),
  C('نمایش تا شروع پخش','Impression to play','funnel','30d', FN2([E('video_impression'),E('@play')])),
  C('مدت گیرها','Rebuffer durations','trend','30d', TT([E('video_buffered',{ groupBy:'buffer_duration' })],{ viz:'bar' }))];
var GSC_WHY=['این کارت از داده سرچ کنسول گوگل می‌آید، نه ایونت‌های سایت؛ در گزارش‌ساز ساخته نمی‌شود.','This card comes from Google Search Console, not site events; it can’t be built in the report builder.'];
var VIDEO_MISS=[['قیف کشف ارگانیک','Organic discovery funnel'],['سلامت ایندکس و اسکیما','Index and schema health'],['کوئری‌های منجر به تماشا','Queries driving plays']].map(function(x){ return x.concat(GSC_WHY); });
var AV=function(o){ o=o||{}; return E('page_view',{ filters:PF('entity_module','Article').concat(o.filters||[]), groupBy:o.groupBy||'' }); };   /* an article view = a page view whose page is an article */
var MEDIA_X=[
  C('بازدید مقاله‌ها','Article views','trend','7d', TT([AV()],{ viz:'kpi' })),
  C('خواننده بازگشتی','Returning readers','trend','7d', FX([AV(), AV({ filters:PF('is_new_user','Returning') })],'%:UNIQUES(B)/UNIQUES(A)',{ viz:'kpi' })),
  C('صفحه در نشست','Pages per session','trend','7d', FX([E('page_view'),E('session_start')],'$:TOTALS(A)/TOTALS(B)',{ viz:'kpi' })),
  C('سهم موبایل','Mobile share','trend','7d', FX([E('page_view'),E('page_view',{ filters:PF('device_type','Mobile') })], RATE, { viz:'kpi' })),
  C('بازدید بر حسب ساعت روز','Views by hour of day','trend','7d', TT([E('page_view',{ groupBy:'hour_of_day' })],{ viz:'bar' })),
  C('نشست‌های تک‌مقاله‌ای','Single-article sessions','funnel','7d', FN2([AV(),AV()],{ hold:'_session', head:'drop' })),
  C('بازدید بر حسب عمر مقاله','Views by article age','trend','7d', TT([AV({ groupBy:'article_age' })],{ viz:'bar' })),
  C('سهم بازدید بر اساس تازگی مقاله','Views by article freshness','trend','7d', TT([AV({ groupBy:'article_age' })],{ viz:'pie' })),
  C('قیف سفر خواننده','Reader journey funnel','funnel','7d', FN2([AV(),AV()])),
  C('منابع ورود خوانندگان','Reader acquisition','trend','7d', TT([AV({ groupBy:'referrer_type' })])),
  C('سهم سکشن‌ها از بازدید','Section share of views','trend','7d', TT([AV({ groupBy:'breadcrumb_1_name' })],{ viz:'bar' })),
  C('پراشتراک‌ترین مقاله‌ها','Most shared articles','trend','7d', TT([E('share',{ groupBy:'article_title' })],{ viz:'bar' })),
  C('جستجوهای داخلی پرتکرار','Top site searches','trend','7d', TT([E('search_submitted',{ groupBy:'search_term' })],{ viz:'bar' })),
  C('بازدید مقاله‌ها به تفکیک عنوان','Article views by title','trend','7d', TT([AV({ groupBy:'article_title' })],{ viz:'bar', rows:19 }))];
var MEDIA_MISS=[['نبض تحریریه','Newsroom pulse','این بند داده لحظه‌ای است و از بازه انتخابی پیروی نمی‌کند؛ برای جزئیات نمای لحظه‌ای کامل را ببینید.','This band is live data and doesn’t follow the date range; see the full realtime view.'],
  ['انتشار امروز','Published today','این عدد از سامانه مدیریت محتوای سایت می‌آید، نه ایونت‌ها؛ در گزارش‌ساز ساخته نمی‌شود.','This number comes from the site’s content management system, not events; it can’t be built in the report builder.'],
  ['نشانه «بدون مقاله تازه» کنار جستجوها','The “no fresh article” mark beside searches','این نشانه جستجوها را با فهرست مقاله‌های سامانه مدیریت محتوا مقایسه می‌کند؛ در گزارش‌ساز ساخته نمی‌شود.','This mark compares searches with the content system’s article list; it can’t be built in the report builder.']];
var EXCH_X=[
  C('قیف فعال‌سازی صرافی','Exchange activation funnel','funnel','30d', FN2([E('@signup'),E('login'),E('@kyc'),E('@deposit'),E('@trade')])),
  C('ثبت‌نام','Sign-ups','trend','30d', TT([E('@signup')],{ measure:'uniques', viz:'kpi' })),
  C('ورود کرده','Logged in','trend','30d', TT([E('login')],{ measure:'uniques', viz:'kpi' })),
  C('تایید احراز هویت','KYC approved','trend','30d', TT([E('@kyc')],{ measure:'uniques', viz:'kpi' })),
  C('از ثبت‌نام تا اولین واریز','Sign-up to first deposit','funnel','30d', FN2([E('@signup'),E('@kyc'),E('@deposit')])),
  C('تبدیل به معامله‌گر','Conversion to trader','funnel','30d', FN2([E('@signup'),E('@trade')]))];
var TPL=[
  /* ── business type (Amplitude «Industry», Mixpanel «Industry-Specific Boards») ── */
  { id:'store', grp:'industry', icon:'storefront', fa:'فروشگاه آنلاین', en:'Online store',
    dFa:'از دیدن محصول تا خرید: خریداران روزانه، قیف خرید، منبع خریداران و بازگشت به خرید.', dEn:'From product view to purchase: daily buyers, the purchase funnel, where buyers come from and repeat purchase.',
    roles:[{ id:'view', fa:'دیدن محصول', en:'Product viewed', dFa:'وقتی کاربر صفحهٔ یک محصول را می‌بیند.', dEn:'When a user opens a product page.', prefer:['item_viewed'] },
      { id:'cart', fa:'افزودن به سبد', en:'Added to cart', dFa:'وقتی کاربر محصولی را به سبد اضافه می‌کند.', dEn:'When a user adds a product to the cart.', prefer:['add_to_cart'] },
      { id:'checkout', fa:'شروع پرداخت', en:'Checkout started', dFa:'وقتی کاربر وارد مرحلهٔ پرداخت می‌شود.', dEn:'When a user starts checkout.', prefer:['begin_checkout'] },
      { id:'buy', fa:'خرید', en:'Purchase', dFa:'لحظهٔ ارزش فروشگاه: سفارشی که پرداختش موفق بوده.', dEn:'The store’s value moment: an order paid successfully.', prefer:['purchase'] }],
    cards:[{ k:'text', fa:'<h3>فروشگاه در یک نگاه</h3>خریداران هر روز، جایی که مسیر خرید می‌شکند و کانال‌هایی که خریدار می‌آورند. عددها پیرو بازهٔ هر کارت‌اند.', en:'<h3>The store at a glance</h3>Buyers each day, where the purchase path breaks and the channels that bring buyers. Each card keeps its own range.' },
      { fa:'خریداران روزانه', en:'Daily buyers', type:'trend', range:'30d', amp:TR('@buy',{ iv:'day' }) },
      { fa:'قیف خرید', en:'Purchase funnel', type:'funnel', range:'30d', amp:FU(['@view','@cart','@checkout','@buy']) },
      { fa:'خریداران به تفکیک منبع ورود', en:'Buyers by traffic source', type:'trend', range:'30d', amp:TR('@buy',{ gb:'referrer_type' }) },
      { fa:'بازگشت به خرید', en:'Repeat purchase', type:'retention', range:'3m', amp:RT('@buy','@buy') }].concat(STORE_X), miss:STORE_MISS },
  { id:'video', grp:'industry', icon:'video-camera', fa:'ویدیو و پخش', en:'Video & streaming',
    /* PM 2026-10-25, TG-7: stays under «نوع کسب‌وکار»; the description says it suits any site that plays video */
    dFa:'بینندگان، تماشا تا پایان، اتمام آگهی و پخش به تفکیک دستگاه؛ برای هر سایتی که ویدیو پخش می‌کند مناسب است.', dEn:'Viewers, watching to the end, ad completion and plays by device; suits any site that plays video.',
    roles:[{ id:'play', fa:'شروع پخش', en:'Playback started', dFa:'وقتی پخش یک ویدیو واقعاً شروع می‌شود.', dEn:'When a video actually starts playing.', prefer:['video_started'] },
      { id:'done', fa:'تماشای کامل', en:'Watched to end', dFa:'لحظهٔ ارزش ویدیو: بیننده تا انتهای ویدیو مانده.', dEn:'The video’s value moment: the viewer stayed to the end.', prefer:['video_completed'] },
      { id:'adStart', fa:'شروع آگهی', en:'Ad started', dFa:'وقتی آگهی ویدیویی شروع به پخش می‌کند.', dEn:'When a video ad starts playing.', prefer:['ads_video_started'] },
      { id:'adDone', fa:'تماشای کامل آگهی', en:'Ad completed', dFa:'وقتی آگهی تا پایان پخش می‌شود.', dEn:'When an ad plays to the end.', prefer:['ads_video_completed'] }],
    cards:[{ k:'text', fa:'<h3>سلامت ویدیو</h3>چند نفر تماشا می‌کنند، چند نفر تا پایان می‌مانند و آگهی‌ها چقدر کامل دیده می‌شوند.', en:'<h3>Video health</h3>How many people watch, how many stay to the end and how often ads are seen through.' },
      { fa:'بینندگان روزانه', en:'Daily viewers', type:'trend', range:'30d', amp:TR('@play',{ iv:'day' }) },
      { fa:'تماشا تا پایان', en:'Watch to the end', type:'funnel', range:'30d', amp:FU(['@play','@done']) },
      { fa:'اتمام آگهی', en:'Ad completion', type:'trend', range:'30d', amp:TR('@adStart',{ more:['@adDone'], m:'totals' }) },
      { fa:'پخش به تفکیک دستگاه', en:'Plays by device', type:'trend', range:'30d', amp:TR('@play',{ gb:'device_type', m:'totals' }) }].concat(VIDEO_X), miss:VIDEO_MISS },
  { id:'media', grp:'industry', icon:'newspaper', fa:'رسانه و خبر', en:'News & media',
    dFa:'بازدید مقاله به تفکیک سکشن، خواندن تا پایان، خوانندگان بازگشتی و قیف اشتراک.', dEn:'Article views by section, reading to the end, returning readers and the subscription funnel.',
    roles:[{ id:'read', fa:'شروع خواندن مقاله', en:'Article read started', dFa:'وقتی خواننده متن مقاله را شروع می‌کند.', dEn:'When a reader starts an article’s text.', prefer:['article_read_started'] },
      { id:'readEnd', fa:'خواندن تا پایان', en:'Article read completed', dFa:'لحظهٔ ارزش خبر: خواننده به انتهای مقاله رسیده.', dEn:'The newsroom’s value moment: the reader reached the end.', prefer:['article_read_completed'] },
      { id:'sub', fa:'شروع اشتراک', en:'Subscription started', dFa:'وقتی خواننده اشتراک می‌خرد.', dEn:'When a reader buys a subscription.', prefer:['subscription_started'] }],
    cards:[{ k:'text', fa:'<h3>نبض تحریریه</h3>کدام سکشن خوانده می‌شود، چند خواننده تا پایان می‌مانند و چه کسی برمی‌گردد.', en:'<h3>Newsroom pulse</h3>Which sections get read, how many readers stay to the end and who comes back.' },
      { fa:'بازدید صفحه به تفکیک سکشن', en:'Page views by section', type:'trend', range:'7d', amp:TR('page_view',{ gb:'breadcrumb_1_name', m:'totals' }) },
      { fa:'خواندن تا پایان', en:'Read to the end', type:'trend', range:'7d', amp:TR('@read',{ more:['@readEnd'], m:'totals' }) },
      { fa:'خوانندگان جدید و بازگشتی', en:'New and returning readers', type:'trend', range:'30d', amp:TR('page_view',{ gb:'is_new_user' }) },
      { fa:'از بازدید تا اشتراک', en:'Visit to subscription', type:'funnel', range:'30d', amp:FU(['page_view','@readEnd','@sub']) }].concat(MEDIA_X), miss:MEDIA_MISS },
  /* Decision-Log 20 (PM 2026-10-23): crypto exchange ships as a Shahin template. Content from PRD-Business-Exchange §2–§6. No demo
     project is an exchange and the registry has no exchange events yet, so every role waits for an event and shows the track() call
     from REG below (level 2). first_deposit / first_trade are not events (PRD §1): the funnel's first deposit and first trade are
     the funnel steps on deposit and trade. */
  { id:'exchange', grp:'industry', icon:'coins', fa:'صرافی رمزارز', en:'Crypto exchange',
    dFa:'از ثبت‌نام تا اولین معامله: ثبت‌نام‌ها، قیف فعال‌شدن معامله‌گر، معامله‌گران فعال، منبع معامله‌گران و بازگشت به معامله.', dEn:'From sign-up to first trade: sign-ups, the trader activation funnel, active traders, where traders come from and returning to trade.',
    roles:[{ id:'signup', fa:'ثبت‌نام', en:'Sign-up', dFa:'وقتی کاربر حساب صرافی می‌سازد.', dEn:'When a user creates an exchange account.', prefer:['sign_up'] },
      { id:'kyc', fa:'تأیید احراز هویت', en:'KYC approved', dFa:'وقتی مدارک کاربر تأیید می‌شود و می‌تواند واریز کند.', dEn:'When the user’s documents are approved and they can deposit.', prefer:['kyc_approved'] },
      { id:'deposit', fa:'واریز', en:'Deposit', dFa:'وقتی واریز تومانی یا رمزارزی به حساب می‌نشیند.', dEn:'When a toman or crypto deposit lands in the account.', prefer:['deposit'] },
      { id:'trade', fa:'معامله', en:'Trade', dFa:'لحظهٔ ارزش صرافی: سفارشی که انجام شده.', dEn:'The exchange’s value moment: an order that was filled.', prefer:['trade'] }],
    cards:[{ k:'text', fa:'<h3>صرافی در یک نگاه</h3>چند نفر ثبت‌نام می‌کنند، چند نفر تا اولین معامله می‌رسند و کدام کانال معامله‌گر واقعی می‌آورد، نه فقط ثبت‌نام.', en:'<h3>The exchange at a glance</h3>How many people sign up, how many reach a first trade, and which channel brings real traders, not just sign-ups.' },
      { fa:'ثبت‌نام‌های روزانه', en:'Daily sign-ups', type:'trend', range:'30d', amp:TR('@signup',{ iv:'day' }) },
      { fa:'از ثبت‌نام تا اولین معامله', en:'Sign-up to first trade', type:'funnel', range:'30d', amp:FU(['@signup','@kyc','@deposit','@trade']) },
      { fa:'معامله‌گران فعال', en:'Active traders', type:'trend', range:'30d', amp:TR('@trade',{ iv:'day' }) },
      { fa:'معامله‌گران به تفکیک منبع ورود', en:'Traders by traffic source', type:'trend', range:'30d', amp:TR('@trade',{ gb:'referrer_type' }) },
      { fa:'بازگشت به معامله', en:'Returning to trade', type:'retention', range:'3m', amp:RT('@trade','@trade') }].concat(EXCH_X) },
  /* ── use case (Amplitude «Use Case», Mixpanel «Essential Boards») ── */
  { id:'kpis', grp:'usecase', icon:'gauge', fa:'شاخص‌های پایهٔ سایت', en:'Website KPIs',
    dFa:'کاربران، بازدید صفحه، نشست به تفکیک منبع و دستگاه؛ بدون هیچ تنظیمی.', dEn:'Users, page views, sessions by source and device; no setup needed.', roles:[],
    cards:[{ k:'text', fa:'<h3>شاخص‌های پایه</h3>همهٔ این کارت‌ها از ایونت‌هایی ساخته شده‌اند که کد شاهین خودش جمع می‌کند.', en:'<h3>Core KPIs</h3>Every card here uses events the Shahin snippet collects on its own.' },
      { fa:'کاربران روزانه', en:'Daily users', type:'trend', range:'30d', amp:TR('page_view',{ iv:'day' }) },
      { fa:'بازدید صفحه', en:'Page views', type:'trend', range:'30d', amp:TR('page_view',{ m:'totals' }) },
      { fa:'نشست به تفکیک منبع ورود', en:'Sessions by traffic source', type:'trend', range:'30d', amp:TR('session_start',{ gb:'referrer_type', m:'totals' }) },
      { fa:'کاربران به تفکیک دستگاه', en:'Users by device', type:'trend', range:'30d', amp:TR('page_view',{ gb:'device_type' }) }] },
  { id:'acq', grp:'usecase', icon:'compass', fa:'جذب ترافیک', en:'Traffic acquisition',
    dFa:'کاربران از کدام منبع و کمپین می‌آیند و کدام منبع به هدف شما می‌رسد.', dEn:'Which sources and campaigns bring users, and which source reaches your goal.',
    roles:[{ id:'goal', fa:'هدف', en:'Goal', dFa:'کاری که می‌خواهید کاربر انجام دهد؛ مثلاً خرید، اشتراک یا ثبت فرم.', dEn:'What you want users to do, e.g. purchase, subscribe or submit a form.', prefer:['purchase','subscription_started','form_submitted'] }],
    cards:[{ fa:'کاربران به تفکیک منبع ورود', en:'Users by traffic source', type:'trend', range:'30d', amp:TR('page_view',{ gb:'referrer_type' }) },
      { fa:'کاربران به تفکیک منبع کمپین', en:'Users by UTM source', type:'trend', range:'30d', amp:TR('page_view',{ gb:'utm_source' }) },
      { fa:'رسیدن به هدف به تفکیک منبع ورود', en:'Goal by traffic source', type:'trend', range:'30d', amp:TR('@goal',{ gb:'referrer_type' }) },
      { fa:'از نشست تا هدف', en:'Session to goal', type:'funnel', range:'30d', amp:FU(['session_start','@goal']) }] },
  { id:'funnel', grp:'usecase', icon:'funnel', fa:'تحلیل قیف', en:'Funnel analysis',
    dFa:'تبدیل از یک قدم کلیدی به هدف، روند هدف و مسیرهایی که به هدف می‌رسند.', dEn:'Conversion from a key step to the goal, the goal’s trend and the paths that lead to it.',
    roles:[{ id:'step', fa:'قدم کلیدی', en:'Key step', dFa:'قدمی که کاربر را به هدف نزدیک می‌کند؛ مثلاً افزودن به سبد یا شروع پخش.', dEn:'A step that brings the user closer to the goal, e.g. add to cart or start a video.', prefer:['add_to_cart','video_started','article_read_started','form_started'] },
      { id:'goal', fa:'هدف', en:'Goal', dFa:'پایان قیف؛ کاری که می‌خواهید کاربر انجام دهد.', dEn:'The end of the funnel; what you want users to do.', prefer:['purchase','video_completed','article_read_completed','form_submitted'] }],
    cards:[{ fa:'قیف تا هدف', en:'Funnel to goal', type:'funnel', range:'30d', amp:FU(['session_start','@step','@goal']) },
      { fa:'رسیدن به هدف', en:'Users reaching the goal', type:'trend', range:'30d', amp:TR('@goal',{ iv:'day' }) },
      { fa:'قدم کلیدی به تفکیک دستگاه', en:'Key step by device', type:'trend', range:'30d', amp:TR('@step',{ gb:'device_type' }) },
      { fa:'بازگشت بعد از هدف', en:'Return after the goal', type:'retention', range:'3m', amp:RT('@goal','page_view') }] },
  { id:'activity', grp:'usecase', icon:'pulse', fa:'فعالیت کاربران', en:'User activity',
    dFa:'کاربران فعال روزانه، جدید در برابر بازگشتی، بازگشت هفتگی و چسبندگی.', dEn:'Daily active users, new vs returning, weekly return and stickiness.', roles:[],
    cards:[{ fa:'کاربران فعال روزانه', en:'Daily active users', type:'trend', range:'30d', amp:TR('page_view',{ iv:'day' }) },
      { fa:'کاربران جدید و بازگشتی', en:'New and returning users', type:'trend', range:'30d', amp:TR('page_view',{ gb:'is_new_user' }) },
      { fa:'بازگشت کاربران', en:'User return', type:'retention', range:'3m', amp:RT('page_view','page_view') },
      { fa:'چسبندگی', en:'Stickiness', type:'stick', range:'30d', amp:{ events:[], s8:{ stick:{ ev:'page_view', filters:[], per:'week' } } } }] },
  { id:'engage', grp:'usecase', icon:'timer', fa:'تعامل در نشست', en:'Session engagement',
    dFa:'نشست‌های هر روز، نشست برای هر کاربر، عمق اسکرول و نشست به تفکیک دستگاه.', dEn:'Sessions per day, sessions per user, scroll depth and sessions by device.', roles:[],
    cards:[{ fa:'نشست‌های روزانه', en:'Daily sessions', type:'trend', range:'30d', amp:TR('session_start',{ m:'totals', iv:'day' }) },
      { fa:'میانگین نشست برای هر کاربر', en:'Sessions per user', type:'trend', range:'30d', amp:TR('session_start',{ m:'avg' }) },
      { fa:'رسیدن به عمق اسکرول', en:'Scroll depth reached', type:'trend', range:'30d', amp:TR('scroll_depth_reached',{ m:'totals' }) },
      { fa:'نشست به تفکیک دستگاه', en:'Sessions by device', type:'trend', range:'30d', amp:TR('session_start',{ gb:'device_type', m:'totals' }) }] },
  { id:'adopt', grp:'usecase', icon:'rocket-launch', fa:'پذیرش یک قابلیت', en:'Feature adoption',
    dFa:'چند نفر از یک قابلیت استفاده می‌کنند، چند بار، برمی‌گردند و به ارزش می‌رسند.', dEn:'How many people use a feature, how often, whether they come back and reach value.',
    roles:[{ id:'feat', fa:'استفاده از قابلیت', en:'Feature used', dFa:'ایونتی که دولوپر شما برای این قابلیت ساخته؛ مثلاً استفاده از کد تخفیف.', dEn:'The event your developer sends for this feature, e.g. a discount code applied.', prefer:['discount_code_applied','podcast_played','support_chat_opened','search_submitted'] },
      { id:'value', fa:'لحظهٔ ارزش', en:'Value moment', dFa:'وقتی کاربر از قابلیت به نتیجه رسیده؛ مثلاً خرید یا اشتراک.', dEn:'When the feature pays off for the user, e.g. a purchase or a subscription.', prefer:['purchase','subscription_started','form_submitted'] }],
    cards:[{ k:'text', fa:'<h3>پذیرش قابلیت</h3>کشف، تکرار و رسیدن به ارزش؛ سه پرسشی که هر قابلیت تازه باید جواب بدهد.', en:'<h3>Feature adoption</h3>Discovery, repeat use and reaching value: three questions every new feature has to answer.' },
      { fa:'کاربران قابلیت', en:'Feature users', type:'trend', range:'30d', amp:TR('@feat',{ iv:'day' }) },
      { fa:'درصد کاربران فعال', en:'Share of active users', type:'trend', range:'30d', amp:TR('@feat',{ m:'active' }) },
      { fa:'از قابلیت تا ارزش', en:'Feature to value', type:'funnel', range:'30d', amp:FU(['@feat','@value']) },
      { fa:'بازگشت به قابلیت', en:'Return to the feature', type:'retention', range:'3m', amp:RT('@feat','@feat') }] },
  /* Amplitude's prebuilt «Retention» view (Product Analytics hub; research 15 §10.7, gap audit 49a B4): the same questions as a board
     every project can copy — how many new users come back, whether that is improving, and who comes back (up to three breakdowns). */
  { id:'retention', grp:'usecase', icon:'arrows-clockwise', fa:'بازگشت کاربران', en:'User retention',
    dFa:'چند نفر از کاربران جدید برمی‌گردند، این عدد در طول زمان بهتر می‌شود یا نه، و چه کسانی بیشتر برمی‌گردند.', dEn:'How many new users come back, whether that is improving over time, and who comes back most.', roles:[],
    cards:[{ k:'text', fa:'<h3>بازگشت کاربران</h3>سه پرسش: چند نفر برمی‌گردند، روندش رو به بهبود است یا نه، و کدام گروه‌ها بیشتر برمی‌گردند.', en:'<h3>User retention</h3>Three questions: how many come back, whether it is improving, and which groups come back most.' },
      { fa:'بازگشت کاربران جدید', en:'New user retention', type:'retention', range:'3m', amp:RT('_new_user','_any_active') },
      { fa:'بازگشت در طول زمان', en:'Retention over time', type:'retention', range:'3m', amp:Object.assign(RT('_new_user','_any_active'), { ret:{ shown:'time' } }) },
      { fa:'بازگشت به تفکیک دستگاه', en:'Retention by device', type:'retention', range:'3m', amp:Object.assign(RT('_new_user','_any_active'), { groupSeg:'device_type' }) },
      { fa:'بازگشت به تفکیک منبع ورود', en:'Retention by traffic source', type:'retention', range:'3m', amp:Object.assign(RT('_new_user','_any_active'), { groupSeg:'referrer_type' }) },
      { fa:'هر چند روز یک‌بار برمی‌گردند', en:'How often they come back', type:'retention', range:'30d', amp:Object.assign(RT('_new_user','_any_active'), { ret:{ meas:'usage' } }) }] },
  { id:'content', grp:'usecase', icon:'article', fa:'عملکرد محتوا', en:'Content performance',
    dFa:'پربازدیدترین صفحه‌ها، اشتراک‌گذاری، عمق اسکرول و آنچه کاربران جستجو می‌کنند.', dEn:'Top pages, shares, scroll depth and what users search for.', roles:[],
    cards:[{ fa:'بازدید به تفکیک صفحه', en:'Views by page', type:'trend', range:'7d', amp:TR('page_view',{ gb:'page_path', m:'totals' }) },
      { fa:'اشتراک‌گذاری', en:'Shares', type:'trend', range:'7d', amp:TR('share',{ m:'totals', iv:'day' }) },
      { fa:'رسیدن به عمق اسکرول', en:'Scroll depth reached', type:'trend', range:'7d', amp:TR('scroll_depth_reached') },
      { fa:'عبارت‌های جستجو', en:'Search terms', type:'trend', range:'7d', amp:TR('search_submitted',{ gb:'search_term', m:'totals' }) }] },
  /* ── experts (Amplitude «Community ▸ Expert»), PM 2026-10-24: sample templates in the demo so the team sees what the section is for.
     Authors are shown by expertise, never a person's name, with a «نمونه» badge; production waits for real authors. ── */
  { id:'x_growth', grp:'expert', sample:true, icon:'rocket-launch', author:['متخصص رشد محصول','Product growth specialist'], fa:'شاخص‌های رشد محصول', en:'Product growth metrics',
    dFa:'سه پرسش رشد در یک داشبورد: کاربر تازه می‌آید، برمی‌گردد و به لحظهٔ ارزش می‌رسد؟', dEn:'Three growth questions on one dashboard: do new users arrive, come back and reach the value moment?',
    roles:[{ id:'value', fa:'لحظهٔ ارزش', en:'Value moment', dFa:'کاری که نشان می‌دهد کاربر از محصول نتیجه گرفته؛ مثلاً خرید، اشتراک یا ثبت فرم.', dEn:'The action that shows a user got value; e.g. a purchase, a subscription or a form sent.', prefer:['purchase','subscription_started','form_submitted'] }],
    cards:[{ k:'text', fa:'<h3>چطور این داشبورد را بخوانید</h3>اول جذب، بعد بازگشت، بعد ارزش. اگر کاربر تازه زیاد است ولی بازگشت کم، مشکل در تجربهٔ اول است نه در جذب.', en:'<h3>How to read this dashboard</h3>Acquisition first, then return, then value. Many new users but little return means the first experience is the problem, not acquisition.' },
      { fa:'کاربران فعال روزانه', en:'Daily active users', type:'trend', range:'30d', amp:TR('page_view',{ iv:'day' }) },
      { fa:'کاربران تازه و بازگشتی', en:'New and returning users', type:'trend', range:'30d', amp:TR('page_view',{ gb:'is_new_user' }) },
      { fa:'بازگشت هفتگی', en:'Weekly return', type:'retention', range:'3m', amp:RT('page_view','page_view') },
      { fa:'از بازدید تا لحظهٔ ارزش', en:'Visit to value moment', type:'funnel', range:'30d', amp:FU(['page_view','@value']) }] },
  { id:'x_newsseo', grp:'expert', sample:true, icon:'newspaper', author:['متخصص سئوی خبری','News SEO specialist'], fa:'سئو و جذب خوانندهٔ خبری', en:'News SEO and reader acquisition',
    dFa:'خواننده از کجا می‌آید، چه چیزی جستجو می‌کند و چند نفر خبر را تا پایان می‌خوانند.', dEn:'Where readers come from, what they search for and how many read to the end.',
    roles:[{ id:'readEnd', fa:'خواندن تا پایان', en:'Read to the end', dFa:'خواننده به انتهای مقاله رسیده.', dEn:'The reader reached the end of the article.', prefer:['article_read_completed','scroll_depth_reached'] }],
    cards:[{ k:'text', fa:'<h3>نگاه سئو</h3>سهم جستجو در ورود، و اینکه خوانندهٔ جستجو تا پایان می‌ماند یا نه؛ کلیک بدون خواندن یعنی تیتر بیش از متن قول داده.', en:'<h3>The SEO view</h3>Search’s share of arrivals, and whether search readers stay to the end; clicks without reading mean the headline promised more than the story.' },
      { fa:'بازدید به تفکیک منبع ورود', en:'Views by traffic source', type:'trend', range:'30d', amp:TR('page_view',{ gb:'referrer_type', m:'totals' }) },
      { fa:'خوانندگان تازه و بازگشتی', en:'New and returning readers', type:'trend', range:'30d', amp:TR('page_view',{ gb:'is_new_user' }) },
      { fa:'از بازدید تا خواندن کامل', en:'Visit to full read', type:'funnel', range:'30d', amp:FU(['page_view','@readEnd']) },
      { fa:'عبارت‌های جستجوی داخل سایت', en:'On-site search terms', type:'trend', range:'7d', amp:TR('search_submitted',{ gb:'search_term', m:'totals' }) }] },
  { id:'x_ecomret', grp:'expert', sample:true, icon:'storefront', author:['متخصص بازاریابی تجارت الکترونیک','E-commerce marketing specialist'], fa:'بازگشت مشتری فروشگاه', en:'Store customer return',
    dFa:'خریدار دوباره می‌خرد؟ کدام کانال خریدار وفادار می‌آورد و هر خریدار چند بار می‌خرد.', dEn:'Do buyers buy again? Which channel brings loyal buyers, and how often does each buyer buy?',
    roles:[{ id:'buy', fa:'خرید', en:'Purchase', dFa:'سفارشی که پرداختش موفق بوده.', dEn:'An order paid successfully.', prefer:['purchase'] }],
    cards:[{ k:'text', fa:'<h3>وفاداری، نه فقط فروش</h3>خرید دوم از خرید اول مهم‌تر است؛ کانالی که خریدار یک‌باره می‌آورد را با کانالی که خریدار برگشتی می‌آورد مقایسه کنید.', en:'<h3>Loyalty, not just sales</h3>The second purchase matters more than the first; compare channels that bring one-time buyers with those that bring returning ones.' },
      { fa:'خریداران روزانه', en:'Daily buyers', type:'trend', range:'30d', amp:TR('@buy',{ iv:'day' }) },
      { fa:'بازگشت به خرید', en:'Repeat purchase', type:'retention', range:'3m', amp:RT('@buy','@buy') },
      { fa:'خریداران به تفکیک منبع ورود', en:'Buyers by traffic source', type:'trend', range:'30d', amp:TR('@buy',{ gb:'referrer_type' }) },
      { fa:'میانگین خرید هر خریدار', en:'Purchases per buyer', type:'trend', range:'30d', amp:TR('@buy',{ m:'avg' }) }] }
];
/* PM 2026-11-11 (events-start v10): platform templates under the online store, like Amplitude's Shopify / WooCommerce templates.
   Each is the store template (same roles and cards) for one platform, listed here so the builder's gallery and the ready-made
   dashboards page show the same templates; Portal adds the cards of its own event, order_expired (only the Portal–Shahin
   connection sends it: orders whose payment window closed unpaid — portal-demo analytics/ecommerce «سفارش‌های منقضی»). */
(function(){
  var st=TPL.filter(function(t){ return t.id==='store'; })[0];
  function plat(o){ var t=JSON.parse(JSON.stringify(st)); Object.keys(o).forEach(function(k){ t[k]=o[k]; }); return t; }
  var woo=plat({ id:'store_woo', plat:'woo', fa:'فروشگاه ووکامرس', en:'WooCommerce store',
    dFa:'قالب فروشگاهی برای سایت‌های ووکامرس: ایونت‌های خرید، سبد و جستجو را افزونه شاهین خودکار می‌فرستد؛ دولوپر شما کاری نمی‌کند.',
    dEn:'The store template for WooCommerce sites: the Shahin plugin sends the purchase, cart and search events automatically; your developer does nothing.' });
  var portal=plat({ id:'store_portal', plat:'portal', fa:'فروشگاه پرتال', en:'Portal store',
    dFa:'قالب فروشگاهی برای فروشگاه‌های پرتال: ایونت‌ها از اتصال پرتال به شاهین می‌رسند و سفارش‌هایی را هم نشان می‌دهد که فرصت پرداختشان تمام شد.',
    dEn:'The store template for Portal shops: events arrive from the Portal–Shahin connection, and it also shows the orders whose payment window ran out.' });
  portal.cards=portal.cards.slice(0,1).concat([
    { k:'text', fa:'<h3>فرصت پرداخت</h3>سفارشی که فرصت پرداختش در پرتال پیش از پرداخت تمام شود، فروشی است که تا مرحله آخر آمد و از دست رفت.', en:'<h3>Payment window</h3>An order whose Portal payment window closes before it is paid is a sale that reached the last step and was lost.' },
    { fa:'نرخ انقضای سفارش (از شروع پرداخت)', en:'Order expiry rate (of checkouts)', type:'trend', range:'30d', amp:FX([E('@checkout'),E('order_expired')], RATE, { viz:'kpi' }) },
    { fa:'سفارش‌های منقضی‌شده', en:'Expired orders', type:'trend', range:'30d', amp:TT([E('order_expired')],{ viz:'bar', interval:'day' }) },
    { fa:'سفارش‌های منقضی به تفکیک درگاه', en:'Expired orders by gateway', type:'trend', range:'30d', amp:TT([E('order_expired',{ groupBy:'payment_gateway' })],{ viz:'bar' }) }
  ], portal.cards.slice(1));
  TPL.splice(1, 0, woo, portal);
})();
var GRP={ industry:['نوع کسب‌وکار','Business type'], usecase:['کاربرد','Use case'], expert:['متخصصان','Experts'] };

/* registry events a template needs that no demo project sends (pack «exchange» in Tech-Specs/Events/registry-seed.v1.json): only for the track() call */
var REG={ sign_up:{ props:['method','app_surface'] }, kyc_approved:{ props:['kyc_level','status'] }, deposit:{ props:['coin','network'] }, trade:{ props:['base_asset','side'] },
  /* PM 2026-11-11: Portal's own event (store_portal); the Portal connection sends it server-side */
  order_expired:{ props:['payment_gateway','order_value'] } };
function typeLbl(type){ return { trend:['روند','Trend'], funnel:['قیف','Funnel'], retention:['ریتنشن','Retention'], stick:['چسبندگی','Stickiness'], mex:['کاوشگر متریک','Metric Explorer'] }[type]||[type,type]; }
function tpl(id){ return TPL.filter(function(t){ return t.id===id; })[0]; }
function charts(t){ return t.cards.filter(function(c){ return c.k!=='text'; }); }
function uses(c, rid){ return JSON.stringify(c.amp||{}).indexOf('"@'+rid+'"')>-1; }
function fill(o, b){ if(typeof o==='string') return o.charAt(0)==='@'&&b.hasOwnProperty(o.slice(1))?b[o.slice(1)]:o;
  if(Array.isArray(o)) return o.map(function(x){ return fill(x, b); });
  if(o&&typeof o==='object'){ var r={}; Object.keys(o).forEach(function(k){ r[k]=fill(o[k], b); }); return r; }
  return o; }
/* the track() call a developer adds for a role's registry event; «e» is the project's own event (RB.evById), else the REG entry */
function track(id, e){ e=e||REG[id]; return 'shahin.track(\''+id+'\''+(e&&e.props&&e.props.length?', {\n  '+e.props.slice(0,2).map(function(p){ return p+': …'; }).join(',\n  ')+'\n}':'')+');'; }
/* level 1: each role takes the first registry or pack event the project sends; a manual pick (TG-10) wins while the project still
   sends it (or when it is an explicit empty pick). isSent(id) and okIds (every event the project sends) come from the page's RB. */
function bind(t, isSent, okIds, mine){
  var b={}, auto={}; mine=mine||{};
  t.roles.forEach(function(r){ var hit=r.prefer.filter(isSent)[0]; b[r.id]=hit||''; auto[r.id]=!!hit; });
  t.roles.forEach(function(r){ if(!mine.hasOwnProperty(r.id)) return; var v=mine[r.id]; if(v===''||okIds.indexOf(v)>-1){ b[r.id]=v; auto[r.id]=false; } });
  return { b:b, auto:auto }; }
/* PM 2026-10-25, TG-10: a manual pick persists for this user, in this project and this template (localStorage); it never changes what
   colleagues see */
function pickKey(p){ return 'shahin-tpl-picks:me:p'+(p||0); }
function picks(p){ try{ return JSON.parse(localStorage.getItem(pickKey(p))||'{}')||{}; }catch(e){ return {}; } }
function savePick(p, tid, rid, evId){ try{ var all=picks(p); (all[tid]=all[tid]||{})[rid]=evId||''; localStorage.setItem(pickKey(p), JSON.stringify(all)); }catch(e){} }
/* PM 2026-10-25, TG-15: usage is counted per project and template; «آخرین استفاده» is the last save by anyone in this project.
   Kept in localStorage so a save from either page counts on both; «last» comes back in hours ago, as the shell's ago() reads it. */
var UKEY='shahin-tpl-used';
function usedAll(){ try{ var o=JSON.parse(localStorage.getItem(UKEY)||'{}'); return o&&typeof o==='object'?o:{}; }catch(e){ return {}; } }
function used(p, tid){ var u=usedAll()[(p||0)+':'+tid]; return u?{ n:u.n||0, last:u.at?Math.max(0, Math.floor((Date.now()-u.at)/36e5)):null }:{ n:0, last:null }; }
function bump(p, tid){ try{ var o=usedAll(), k=(p||0)+':'+tid, u=o[k]||{ n:0 }; o[k]={ n:(u.n||0)+1, at:Date.now() }; localStorage.setItem(UKEY, JSON.stringify(o)); }catch(e){} }
/* PM 2026-10-28, TG-14: copies of a customer template into another project, stored per target project and rebuilt there on load */
function xKey(p){ return 'shahin-tpl-copies-p'+p; }
function readCopies(p){ try{ var a=JSON.parse(localStorage.getItem(xKey(p))||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function writeCopies(p, a){ try{ localStorage.setItem(xKey(p), JSON.stringify(a.slice(-20))); return true; }catch(e){ return false; } }
/* the demo's seeded customer template per project with data, so «این پروژه» isn't empty: the marketing lead's campaign report.
   Its goal is the first of CAMPAIGN_GOALS the project sends; a project that sends none gets no seed. */
var CAMPAIGN_GOALS=['purchase','subscription_started','form_submitted'];
function campaign(p, goal){
  return { board:{ id:'tplc'+p, fa:'گزارش کمپین [نام کمپین]', en:'Campaign report [campaign name]', space:'mkt', folder:'mkt-camp', owner:'mk', descFa:'کاربران، منبع و تبدیل یک کمپین.', descEn:'Users, sources and conversion for one campaign.',
      cards:[{ k:'text', fa:'<h3>کمپین [نام کمپین]</h3>هر دوشنبه با تیم مارکتینگ مرور شود.', en:'<h3>Campaign [campaign name]</h3>Reviewed with the marketing team every Monday.' },
        { fa:'کاربران کمپین به تفکیک منبع ورود', en:'Campaign users by traffic source', type:'trend', range:'30d', amp:TR('page_view',{ gb:'referrer_type' }) },
        { fa:'رسیدن به هدف', en:'Users reaching the goal', type:'trend', range:'30d', amp:TR(goal,{ iv:'day' }) },
        { fa:'از نشست تا هدف', en:'Session to goal', type:'funnel', range:'30d', amp:FU(['session_start',goal]) },
        { fa:'کاربران کمپین به تفکیک دستگاه', en:'Campaign users by device', type:'trend', range:'30d', amp:TR('page_view',{ gb:'device_type' }) }] },
    updated:24*5, views:48,
    tpl:{ instr:'کمپین را در ردیف «نام کمپین» انتخاب کنید و نامش را در ردیف متن بنویسید. اگر هدف شما چیز دیگری است، ایونت هدف را عوض کنید.', events:[goal], props:['utm_campaign'], texts:[{ fa:'[نام کمپین]', en:'[campaign name]' }], pub:true, by:'mk', created:24*5, used:3, last:26 } }; }

window.RBTplCatalog={ TPL:TPL, GRP:GRP, REG:REG, TR:TR, FU:FU, RT:RT, tpl:tpl, charts:charts, uses:uses, fill:fill, track:track, typeLbl:typeLbl,
  bind:bind, picks:picks, savePick:savePick, used:used, bump:bump, readCopies:readCopies, writeCopies:writeCopies, CAMPAIGN_GOALS:CAMPAIGN_GOALS, campaign:campaign };
})();
