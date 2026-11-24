/* ═════════ report-builder engine v1 — shared data model + three reports ═════════ */
(function(){
'use strict';

/* ── i18n / theme helpers (same conventions as video-dashboard) ── */
function L(){ return document.documentElement.lang || localStorage.getItem('shahin-lang') || 'fa'; }
function faN(n){ return Number(n).toLocaleString(L()==='fa'?'fa-IR':'en-US'); }
function pc0(v){ return faN(Math.round(v))+(L()==='fa'?'٪':'%'); }
function pc1(v){ return Number(v).toLocaleString(L()==='fa'?'fa-IR':'en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+(L()==='fa'?'٪':'%'); }
function T(f,e){ return L()==='fa'?f:e; }
function tok(n){ return getComputedStyle(document.body).getPropertyValue(n).trim(); }
function thm(){ return {
  text:tok('--sh-text'), t2:tok('--sh-text-2'), muted:tok('--sh-muted'), m2:tok('--sh-muted-2'),
  border:tok('--sh-border'), surf:tok('--sh-surface'), neutral:tok('--sh-neutral-bg'),
  brand:tok('--sh-brand'), good:tok('--sh-good'), warn:tok('--sh-warn'), bad:tok('--sh-bad'),
  c1:tok('--sh-c1'), c2:tok('--sh-c2'), c3:tok('--sh-c3'), c4:tok('--sh-c4'), c5:tok('--sh-c5'), c6:tok('--sh-c6'),
  font:getComputedStyle(document.body).fontFamily }; }
function tipStyle(TH){ return { backgroundColor:TH.surf, borderColor:TH.border, confine:true,
  textStyle:{color:TH.text,fontSize:12,fontFamily:TH.font},
  extraCssText:'direction:'+(L()==='fa'?'rtl':'ltr')+';text-align:start' }; }
function hex2rgb(h){ h=h.replace('#',''); if(h.length===3)h=h.replace(/./g,function(c){return c+c;});
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
function mix(a,b,k){ try{ var A=hex2rgb(a),B=hex2rgb(b);
  return 'rgb('+A.map(function(v,i){return Math.round(v*k+B[i]*(1-k));}).join(',')+')'; }catch(_){ return a; } }
function mmss(min){
  if (min<1) return T(faN(Math.round(min*60))+' ثانیه', Math.round(min*60)+' sec');
  if (min<90) return T(faN(Math.round(min))+' دقیقه', Math.round(min)+' min');
  return T(faN((min/60).toFixed(1).replace('.0',''))+' ساعت', (min/60).toFixed(1).replace('.0','')+' h');
}

/* deterministic jitter so sample numbers never change between renders */
function jit(seed){ var x=Math.sin(seed*12.9898)*43758.5453; return x-Math.floor(x); }
/* ── phase 4: projects (the topbar switcher, shared by every page) — each project is its own site with its own profile.
   0 Chakavak = Store (the original data, untouched), 1 Pelikan = video-first, 2 Bamdad = news publisher, 3 Sargapeh = new, no data.
   ?project=N (from a dashboard bridge) wins and is written back, so the builder and the card it came from agree. */
var PROJECT=(function(){ var q=null; try{ q=new URLSearchParams(location.search).get('project'); }catch(e){}
  if(q!=null && /^[0-3]$/.test(q)){ try{ localStorage.setItem('shahin-nav-project', q); }catch(e){} return +q; }
  try{ var v=JSON.parse(localStorage.getItem('shahin-nav-project')); return v>=0&&v<=3?v:0; }catch(e){ return 0; } })();
var SALT=PROJECT?'#p'+PROJECT:'';   /* other projects get their own curves; Chakavak's seeds stay exactly as they were */
function hstr(s){ if(SALT) s=String(s)+SALT; var h=0; for(var i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))>>>0; } return h%997; }

/* ── event catalog — auto + packs + the customs born via track() ── */
var EVENTS = [
  /* auto-collected + canonical (shared events live here once) */
  { id:'page_view',              fa:'بازدید صفحه',            en:'Page view',            grp:'auto',   w:41200, props:[] },
  { id:'session_start',          fa:'شروع نشست',              en:'Session start',        grp:'auto',   w:16800, props:['channel'] },
  { id:'search_submitted',       fa:'جستجو',                  en:'Search',               grp:'auto',   w:1770,  props:['search_term'] },
  { id:'search_no_results',      fa:'جستجوی بی‌نتیجه',        en:'Search, no results',   grp:'auto',   w:240,   props:['search_term'] },
  { id:'share',                  fa:'اشتراک‌گذاری',           en:'Share',                grp:'auto',   w:1860,  props:[] },
  { id:'scroll_depth_reached',   fa:'عمق اسکرول',             en:'Scroll depth',         grp:'auto',   w:8800,  props:[] },
  { id:'form_started',           fa:'شروع فرم',               en:'Form started',         grp:'auto',   w:940,   props:[] },
  { id:'form_submitted',         fa:'ثبت فرم',                en:'Form submitted',       grp:'auto',   w:610,   props:[] },
  { id:'file_download',          fa:'دانلود فایل',            en:'File download',        grp:'auto',   w:330,   props:[] },
  /* video pack — the full 24-event catalog (weekly volumes from the settings demo) */
  { id:'video_started',          fa:'شروع پخش',               en:'Playback started',     grp:'video',  w:28440, props:['media_type','video_title','play_trigger','is_replay','startup_time','content_category','device_brand','os_version','browser_version','video_duration_sec'] },
  { id:'video_progress',         fa:'عبور از نقاط ۲۵/۵۰/۷۵٪', en:'Milestone passed',     grp:'video',  w:61020, props:['media_type','percent','video_title','content_category'] },
  { id:'video_completed',        fa:'تماشای کامل',            en:'Watched to end',       grp:'video',  w:9310,  props:['media_type','video_title','channel','content_category'] },
  { id:'video_heartbeat',        fa:'پینگ حین پخش',           en:'Playback heartbeat',   grp:'video',  w:302500,props:['media_type','video_title','quality'] },
  { id:'video_paused',           fa:'توقف پخش',               en:'Paused',               grp:'video',  w:18220, props:['media_type'] },
  { id:'video_resumed',          fa:'ادامهٔ پخش',             en:'Resumed',              grp:'video',  w:14105, props:['media_type'] },
  { id:'video_seeked',           fa:'جابه‌جایی پخش',          en:'Seeked',               grp:'video',  w:11830, props:['media_type','seek_direction','seek_position','video_title'] },
  /* stale:1 = it has history but nothing arrived in the last 7 days, so the events page and the ready-made dashboards both show «بدون داده اخیر» (PM, #480 answer 4) */
  { id:'video_buffered',         fa:'گیر شبکه (بافر)',        en:'Rebuffered',           grp:'video',  w:4270,  props:['media_type','buffer_duration','video_title'], stale:1 },
  { id:'video_error',            fa:'خطای پخش',               en:'Playback error',       grp:'video',  w:890,   props:['media_type','video_title'] },
  { id:'video_rate_changed',     fa:'تغییر سرعت پخش',         en:'Rate changed',         grp:'video',  w:120,   props:['media_type'] },
  { id:'video_fullscreen_toggled',fa:'تمام‌صفحه',             en:'Fullscreen toggled',   grp:'video',  w:7660,  props:['media_type'] },
  { id:'video_next_autoplayed',  fa:'پخش خودکار بعدی',        en:'Next autoplayed',      grp:'video',  w:95,    props:['media_type'], stale:1 },
  { id:'video_interrupted',      fa:'قطع پخش',                en:'Interrupted',          grp:'video',  w:210,   props:['media_type'] },
  { id:'ads_video_started',       fa:'شروع آگهی',              en:'Ad started',           grp:'video',  w:21540, props:['media_type','ad_position'] },
  { id:'ads_video_completed',     fa:'تماشای کامل آگهی',       en:'Ad completed',         grp:'video',  w:13880, props:['media_type','ad_position'] },
  { id:'ads_video_skipped',       fa:'رد کردن آگهی',           en:'Ad skipped',           grp:'video',  w:6030,   props:['media_type','ad_position'] },
  { id:'ads_video_clicked',       fa:'کلیک روی آگهی',          en:'Ad clicked',           grp:'video',  w:380,   props:['media_type','ad_position'] },
  { id:'captions_toggled',       fa:'زیرنویس',                en:'Captions toggled',     grp:'video',  w:2110,  props:['media_type'] },
  { id:'audio_track_changed',    fa:'تغییر ترک صوتی',         en:'Audio track changed',  grp:'video',  w:75,    props:['media_type'] },
  { id:'recommendation_clicked', fa:'کلیک ویدیوی پیشنهادی',   en:'Recommendation clicked',grp:'video', w:6540,  props:['media_type'] },
  { id:'subscription_started',   fa:'شروع خرید اشتراک',       en:'Subscription started', grp:'video',  w:342,   props:[], uf:0.97, rep:0.02 },
  /* e-commerce pack — the full catalog */
  { id:'item_viewed',            fa:'مشاهدهٔ محصول',          en:'Item viewed',          grp:'ecom',   w:5200,  props:['product_name','product_category'] },
  { id:'item_list_viewed',       fa:'مشاهدهٔ فهرست محصولات',  en:'Item list viewed',     grp:'ecom',   w:3400,  props:[] },
  { id:'item_list_filtered',     fa:'فیلتر فهرست محصولات',    en:'Item list filtered',   grp:'ecom',   w:780,   props:[] },
  { id:'list_item_clicked',      fa:'کلیک آیتم فهرست',        en:'List item clicked',    grp:'ecom',   w:2100,  props:['product_name','product_category'] },
  { id:'add_to_cart',            fa:'افزودن به سبد',          en:'Added to cart',        grp:'ecom',   w:960,   props:['product_name','product_category'] },
  { id:'remove_from_cart',       fa:'حذف از سبد',             en:'Removed from cart',    grp:'ecom',   w:210,   props:['product_name','product_category'] },
  { id:'cart_viewed',            fa:'مشاهدهٔ سبد',            en:'Cart viewed',          grp:'ecom',   w:1430,  props:[] },
  { id:'add_to_wishlist',        fa:'افزودن به علاقه‌مندی',   en:'Added to wishlist',    grp:'ecom',   w:340,   props:[] },
  { id:'remove_from_wishlist',   fa:'حذف از علاقه‌مندی',      en:'Removed from wishlist',grp:'ecom',   w:90,    props:[] },
  { id:'begin_checkout',         fa:'شروع پرداخت',            en:'Checkout started',     grp:'ecom',   w:415,   props:[] },
  { id:'shipping_info_submitted',fa:'ثبت اطلاعات ارسال',      en:'Shipping info',        grp:'ecom',   w:350,   props:[] },
  { id:'payment_info_submitted', fa:'ثبت اطلاعات پرداخت',     en:'Payment info',         grp:'ecom',   w:336,   props:['payment_method','payment_gateway'] },
  { id:'coupon_applied',         fa:'اعمال موفق کد تخفیف',    en:'Coupon applied',       grp:'ecom',   w:260,   props:['coupon_code'] },
  { id:'coupon_denied',          fa:'رد شدن کد تخفیف',        en:'Coupon denied',        grp:'ecom',   w:88,    props:['coupon_code'] },
  { id:'purchase',               fa:'خرید',                   en:'Purchase',             grp:'ecom',   w:232,   uf:0.93, rep:0.08, props:['payment_method','order_value','payment_gateway','product_name','product_category','coupon_code','is_first_purchase','hour_of_day','weekday','channel'] },
  { id:'purchase_failed',        fa:'خرید ناموفق',            en:'Purchase failed',      grp:'ecom',   w:41,    props:['payment_method','payment_gateway'], uf:0.9, rep:0.15 },
  { id:'refund_issued',          fa:'بازگشت وجه',             en:'Refund issued',        grp:'ecom',   w:26,    props:['order_value'], uf:0.95, rep:0.05 },
  { id:'order_cancelled',        fa:'لغو سفارش',              en:'Order cancelled',      grp:'ecom',   w:19,    props:['order_value'], uf:0.95, rep:0.05 },
  /* phase 4a (Decision 7): the Store dashboard's WooCommerce events — `late` keeps them out of every "all events" pool
     (any-event, journeys, engagement matrix, news lists) so adding them moves no existing number */
  { id:'order_on_hold',          fa:'سفارش در انتظار پرداخت', en:'Order on hold',        grp:'ecom',   w:40,    props:['payment_gateway','order_value'], late:true, uf:0.92, rep:0.1 },
  { id:'order_on_hold_confirmed', fa:'تأیید سفارش در انتظار',  en:'On-hold order confirmed', grp:'ecom', w:27,  props:['payment_gateway','order_value'], late:true, uf:0.93, rep:0.08 },
  { id:'restore_cart_item',      fa:'بازگرداندن به سبد',      en:'Cart item restored',   grp:'ecom',   w:58,    props:['product_name','product_category'], late:true },
  { id:'review_submitted',       fa:'ثبت نظر محصول',          en:'Review submitted',     grp:'ecom',   w:19,    props:['rating','product_name'], late:true, uf:0.96, rep:0.05 },
  { id:'product_downloaded',     fa:'دانلود محصول دیجیتال',   en:'Product downloaded',   grp:'ecom',   w:47,    props:['product_name'], late:true },
  { id:'coupon_removed',         fa:'حذف کد تخفیف',           en:'Coupon removed',       grp:'ecom',   w:31,    props:['coupon_code'], late:true },
  { id:'promotion_viewed',       fa:'نمایش پروموشن',          en:'Promotion viewed',     grp:'ecom',   w:1900,  props:[] },
  { id:'promotion_clicked',      fa:'کلیک پروموشن',           en:'Promotion clicked',    grp:'ecom',   w:310,   props:[] },
  /* phase 4a-2: the video dashboard's events (late: kept out of every all-events pool, so nothing existing moves) */
  { id:'video_impression',       fa:'نمایش ویدیو',            en:'Video impression',     grp:'video',  w:74000, props:['video_title','media_type'], late:true },
  { id:'video_quality_changed',  fa:'تغییر کیفیت پخش',        en:'Quality changed',      grp:'video',  w:2300,  props:['quality','quality_shift','video_title'], late:true },
  { id:'video_cta_clicked',      fa:'کلیک دکمهٔ ویدیو',       en:'Video CTA clicked',    grp:'video',  w:570,   props:['video_title'], late:true },
  { id:'video_downloaded',       fa:'دانلود ویدیو',           en:'Video downloaded',     grp:'video',  w:280,   props:['video_title','quality'], late:true },
  { id:'video_muted',            fa:'بی‌صدا کردن',             en:'Muted',                grp:'video',  w:1400,  props:['video_title'], late:true },
  { id:'video_intro_skipped',    fa:'رد کردن تیتراژ',         en:'Intro skipped',        grp:'video',  w:1700,  props:['video_title'], late:true },
  /* phase 4a-2: the media pack (the news-publisher project); absent elsewhere (weight 0) */
  { id:'article_read_started',   fa:'شروع خواندن مقاله',      en:'Article read started', grp:'media',  w:0,     props:['article_title','article_age','author'], late:true },
  { id:'article_read_depth',     fa:'عمق خواندن مقاله',       en:'Article read depth',   grp:'media',  w:0,     props:['depth_percent','article_title'], late:true },
  { id:'article_read_completed', fa:'خواندن مقاله تا پایان',  en:'Article read completed',grp:'media',  w:0,     props:['article_title','article_age','author'], late:true },
  { id:'article_engagement_time',fa:'زمان درگیری با مقاله',   en:'Article engagement time',grp:'media', w:0,     props:['active_time_sec','article_title'], late:true },
  /* customs — born from the customer's own track() calls */
  { id:'discount_code_applied',  fa:'استفاده از کد تخفیف',    en:'Discount code applied', grp:'custom', w:292,  props:['code','amount'] },
  { id:'podcast_played',         fa:'پخش پادکست',             en:'Podcast played',       grp:'custom', w:610,   props:[] },
  { id:'support_chat_opened',    fa:'باز کردن گفتگوی پشتیبانی', en:'Support chat opened', grp:'custom', w:148,  props:[] },
  /* 8c: Shahin's proposed exposure event for experiments run in another tool (the site sends it when it shows a variant) */
  { id:'experiment_viewed',      fa:'دیدن آزمایش',            en:'Experiment viewed',    grp:'custom', w:18400, props:['experiment_key','variant'] }
];
var GRP = {
  auto:   { fa:'جمع‌آوری خودکار', en:'Auto-collected' },
  /* PM 2026-11-01: no «پک» in product copy; template events are Shahin's official gallery templates (fixed here 2026-11-04) */
  video:  { fa:'قالب ویدیو',      en:'Video template' },
  ecom:   { fa:'قالب فروشگاه',    en:'Store template' },
  media:  { fa:'قالب محتوا',      en:'Content template' },
  custom: { fa:'ایونت‌های اختصاصی', en:'Custom events' },
  virtual:{ fa:'ایونت‌های ترکیبی (ساخت شما)', en:'Combined events (yours)' },
  /* visual labeling (2026-10-24): events defined by clicking an element on the site, over autocaptured clicks (rb-data-defs.js) */
  labeled:{ fa:'ایونت‌های برچسبی', en:'Labeled events' }
};
/* virtual/combined events — defined in the UI from existing events (Mixpanel's
   "Custom Event" mechanism): no new data, just a saved definition that behaves
   like a single event in every report. */
var VIRTUALS = [
  { id:'video_engagement', fa:'تعامل رسانه‌ای', en:'Media engagement', comps:['video_started','podcast_played'] }
];
function addVirtual(fa, comps){
  var id=fa.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_')||('combined_'+(VIRTUALS.length+1));
  if(!/^[a-z]/.test(id)) id='combined_'+id;
  /* v12: a non-Latin name (e.g. Persian) leaves no usable id — number it instead */
  if(!/[a-z0-9]{2,}/.test(id.replace(/^combined_/,'')) || VIRTUALS.some(function(v){ return v.id===id; })) id='combined_'+(VIRTUALS.length+1);
  VIRTUALS.push({ id:id, fa:fa, en:fa, comps:comps });
  return id;
}
/* v8: the custom-events table lets a combined event be deleted again. Mutates VIRTUALS in
   place rather than reassigning, because the array itself is exported by reference and
   callers (selectors, the events table) hold on to it. */
function removeVirtual(id){
  for(var i=0;i<VIRTUALS.length;i++){
    if(VIRTUALS[i].id===id){ VIRTUALS.splice(i,1); return true; }
  }
  return false;
}
/* auto-properties every event carries + per-event customs */
var PROP_GROUPS = [
  ['page', 'صفحه و موجودیت', 'Page & entity'],
  ['ref',  'منبع ورود', 'Traffic source'],
  ['utm',  'کمپین (UTM)', 'Campaign (UTM)'],
  ['dev',  'دستگاه و مرورگر', 'Device & browser'],
  ['geo',  'جغرافیا و شبکه', 'Geo & network'],
  ['ses',  'نشست و کاربر', 'Session & user']
];
/* the full auto-property catalog (mirrors the real Records fields shown in the
   Auto-properties tab). Every event carries all of these; each list keeps
   at most 5 values incl. «سایر» so the Top-5+Other invariant always holds.
   Numeric properties (amount, perf_*) are deliberately absent — breakdown is
   categorical-only in phase 1; numeric bucketing is a later enhancement. */
/* average value per sum-able numeric property (هزار تومان) — bucket-midpoint based */
var SUM_AVG = { amount:340, order_value:533 };   /* phase 4a: the Store dashboard's AOV (533K T) */
var GLOBAL_PROPS = ['page_path','entity_module','breadcrumb_1_name','page_lang','load_time',
  'referrer_type','referrer_domain',
  'utm_source','utm_medium','utm_campaign',
  'device_type','browser','os',
  'country','city','isp_name',
  'is_new_user','is_engaged'];
var PROPS = {
  /* event-own properties */
  media_type:    { grp:'own', fa:'نوع رسانه', en:'Media type', vals:[['ویدیو','Video',0.81],['صوت','Audio',0.19]] },
  payment_method:{ grp:'own', fa:'روش پرداخت', en:'Payment method', vals:[['درگاه آنلاین','Online gateway',0.69],['کیف پول فروشگاه','Wallet',0.06],['در محل','On delivery',0.14],['اقساطی (BNPL)','BNPL',0.11]] },
  code:          { grp:'own', fa:'کد تخفیف', en:'Discount code', vals:[['SUMMER50','SUMMER50',0.46],['NOWRUZ','NOWRUZ',0.28],['VIP10','VIP10',0.14],['سایر','Other',0.12]] },
  amount:        { grp:'own', num:true, fa:'مبلغ', en:'Amount', vals:[['<۱۰۰ هزار','<100k',0.27],['۱۰۰–۳۰۰ هزار','100–300k',0.34],['۳۰۰–۷۰۰ هزار','300–700k',0.24],['>۷۰۰ هزار','>700k',0.15]] },
  experiment_key:{ grp:'own', fa:'کلید آزمایش', en:'Experiment key', vals:[['paywall_copy_v2','paywall_copy_v2',0.55],['related_layout','related_layout',0.45]] },
  variant:       { grp:'own', fa:'واریانت', en:'Variant', vals:[['control','control',0.4],['treatment','treatment',0.4],['treatment_b','treatment_b',0.2]] },
  order_value:   { grp:'own', num:true, fa:'مبلغ سفارش', en:'Order value', vals:[['<۳۰۰ هزار','<300k',0.38],['۳۰۰–۷۰۰ هزار','300–700k',0.33],['۷۰۰ هزار–۱٫۵ میلیون','700k–1.5M',0.20],['>۱٫۵ میلیون','>1.5M',0.09]] },
  /* phase 4a: Store item, payment and order properties (WooCommerce) */
  product_name:  { grp:'own', fa:'نام محصول', en:'Product name', vals:[['گوشی A54','Phone A54',0.16],['اسپیکر بلوتوثی X200','BT speaker X200',0.08],['کتانی رانینگ سری‌۳','Running sneaker S3',0.075],['هدفون انسی مدل P','ANC headphone P',0.066],['ساعت هوشمند لایت','Smartwatch Lite',0.064],['عطر لوکس ۱۰۰ می‌لی','Luxury perfume 100ml',0.055],['شارژر دیواری ۶۵ وات','65W wall charger',0.051],['کیف چرم رویال','Royal leather bag',0.037],['سایر','Other',0.412]],
    /* per event (the v5 per-SKU story): views spread, carts and buys concentrate on a few products */
    ev:{ add_to_cart:[0.18,0.024,0.034,0.071,0.043,0.02,0.055,0.027,0.546], remove_from_cart:[0.16,0.05,0.06,0.07,0.06,0.03,0.05,0.03,0.49], purchase:[0.37,0.01,0.013,0.145,0.018,0.018,0.127,0.055,0.244] } },
  product_category:{ grp:'own', fa:'دستهٔ محصول', en:'Product category', vals:[['دیجیتال','Digital',0.43],['مد و پوشاک','Fashion',0.24],['خانه و آشپزخانه','Home & kitchen',0.14],['زیبایی','Beauty',0.09],['سایر','Other',0.10]] },
  payment_gateway:{ grp:'own', fa:'درگاه پرداخت', en:'Payment gateway', vals:[['زرین‌پال','Zarinpal',0.33],['آی‌دی‌پی','IDPay',0.13],['ترب‌پی (اقساطی)','TorobPay (BNPL)',0.11],['درگاه بانکی','Bank gateway',0.12],['اسنپ‌پی (اقساطی)','SnappPay (BNPL)',0.09],['دیجی‌پی (اقساطی)','Digipay (BNPL)',0.05],['تارا (اقساطی)','Tara (BNPL)',0.03],['پرداخت در محل','Cash on delivery',0.14]],
    /* per event: failures and holds lean to the bank gateway and IDPay, cash on delivery almost never fails */
    ev:{ purchase_failed:[0.17,0.17,0.12,0.26,0.07,0.05,0.04,0.01], order_on_hold:[0.27,0.17,0.11,0.21,0.09,0.06,0.03,0.06] } },
  coupon_code:   { grp:'own', fa:'کد تخفیف', en:'Coupon code', vals:[['SARA20','SARA20',0.22],['OFF-BAHAR','OFF-BAHAR',0.17],['WELCOME10','WELCOME10',0.24],['MOHSEN15','MOHSEN15',0.13],['VIP25','VIP25',0.08],['سایر','Other',0.16]] },
  search_term:   { grp:'own', fa:'عبارت جستجو', en:'Search term', vals:[['گوشی A54','Phone A54',0.243],['اسپیکر بلوتوثی','Bluetooth speaker',0.161],['عطر لوکس','Luxury perfume',0.127],['هدفون','Headphone',0.107],['کیف چرم دست‌دوز','Handmade leather bag',0.084],['کتانی رانینگ','Running sneaker',0.078],['شارژر تسلا','Tesla charger',0.055],['ساعت هوشمند','Smartwatch',0.05],['سایر','Other',0.095]],
    /* per event: the searches that find nothing are mostly two terms the store doesn't stock */
    ev:{ search_no_results:[0.02,0.03,0.02,0.02,0.45,0.02,0.30,0.02,0.12] } },
  rating:        { grp:'own', fa:'امتیاز', en:'Rating', vals:[['۵ ستاره','5 stars',0.52],['۴ ستاره','4 stars',0.24],['۳ ستاره','3 stars',0.11],['۲ ستاره','2 stars',0.06],['۱ ستاره','1 star',0.07]] },
  is_first_purchase:{ grp:'own', fa:'اولین خرید / خرید تکراری', en:'First vs repeat purchase', vals:[['اولین خرید','First purchase',0.68],['خرید تکراری','Repeat purchase',0.32]] },
  hour_of_day:   { grp:'own', fa:'ساعت روز', en:'Hour of day', vals:[['۰–۲','0–2',0.03],['۲–۴','2–4',0.01],['۴–۶','4–6',0.01],['۶–۸','6–8',0.03],['۸–۱۰','8–10',0.06],['۱۰–۱۲','10–12',0.08],['۱۲–۱۴','12–14',0.09],['۱۴–۱۶','14–16',0.10],['۱۶–۱۸','16–18',0.11],['۱۸–۲۰','18–20',0.13],['۲۰–۲۲','20–22',0.17],['۲۲–۲۴','22–24',0.18]] },
  weekday:       { grp:'own', fa:'روز هفته', en:'Weekday', vals:[['شنبه','Sat',0.16],['یکشنبه','Sun',0.15],['دوشنبه','Mon',0.15],['سه‌شنبه','Tue',0.14],['چهارشنبه','Wed',0.14],['پنجشنبه','Thu',0.13],['جمعه','Fri',0.13]] },
  channel:       { grp:'own', fa:'کانال ورود', en:'Channel', vals:[['اینستاگرام','Instagram',0.38],['گوگل/ارگانیک','Google/Organic',0.20],['تلگرام','Telegram',0.19],['دیجی‌کالا','Digikala',0.14],['مستقیم','Direct',0.09]],
    ev:{ purchase:[0.26,0.46,0.09,0.09,0.10] } },   /* phase 4a-1b: Instagram brings traffic, organic brings revenue */
  /* phase 4a-2: video properties (on the video events) */
  video_title:   { grp:'own', fa:'عنوان ویدیو', en:'Video title', card:140, vals:[['گزارش ویژه — بودجه ۱۴۰۵','Special report — 1405 budget',0.12],['آموزش تحلیل تکنیکال — قسمت ۳','Technical analysis tutorial — Ep. 3',0.08],['خلاصه بازی پرسپولیس — استقلال','Match highlights: Persepolis vs Esteghlal',0.07],['مستند کوتاه: زاینده‌رود','Short documentary: Zayandeh-Rud',0.06],['ویدیوی معرفی محصول','Product intro video',0.055],['۱۰ ترفند آشپزی خانگی','10 home cooking hacks',0.05],['کنسرت آنلاین شب یلدا','Yalda night online concert',0.045],['مستند حیات وحش ایران','Iran wildlife documentary',0.04],['آموزش نصب پنل خورشیدی','Solar panel install tutorial',0.035],['گزارش بازار ارز — هفته دوم','FX market report — week 2',0.03],['وی‌لاگ سفر به کیش','Kish island travel vlog',0.028],['ریمیکس موسیقی سنتی','Traditional music remix',0.025],['آموزش زبان — درس ۱۲','Language course — lesson 12',0.022],['خلاصه فوتبال — لیگ برتر','Football highlights — Premier League',0.02],['تریلر فیلم کوتاه','Short film trailer',0.018],['سایر','Other',0.322]],
    /* per event: completion, buffering and replays differ by video (the per-video table) */
    ev:{ video_completed:[0.13,0.07,0.08,0.07,0.04,0.06,0.05,0.05,0.04,0.025,0.03,0.025,0.025,0.02,0.02,0.305], video_buffered:[0.10,0.09,0.11,0.05,0.04,0.04,0.07,0.04,0.03,0.03,0.03,0.03,0.02,0.03,0.02,0.32] } },
  video_duration_sec:{ grp:'own', num:true, fa:'مدت ویدیو', en:'Video duration', vals:[['زیر ۲ دقیقه','<2 min',0.31],['۲ تا ۵ دقیقه','2–5 min',0.34],['۵ تا ۱۵ دقیقه','5–15 min',0.25],['بیش از ۱۵ دقیقه','>15 min',0.10]] },
  play_trigger:  { grp:'own', fa:'نحوهٔ شروع پخش', en:'Play trigger', vals:[['کلیک کاربر','Manual',0.61],['پخش خودکار','Autoplay',0.24],['ویدیوی پیشنهادی','Suggested',0.15]] },
  quality:       { grp:'own', fa:'کیفیت', en:'Quality', vals:[['۱۰۸۰p','1080p',0.18],['۷۲۰p','720p',0.41],['۴۸۰p','480p',0.27],['۳۶۰p و کمتر','360p or less',0.14]], ev:{ video_downloaded:[0.52,0.33,0.13,0.02] } },
  ad_position:   { grp:'own', fa:'جایگاه آگهی', en:'Ad position', vals:[['پیش از پخش','Pre-roll',0.58],['میان پخش','Mid-roll',0.31],['پس از پخش','Post-roll',0.11]],
    ev:{ ads_video_skipped:[0.66,0.22,0.12], ads_video_completed:[0.52,0.36,0.12] } },
  percent:       { grp:'own', fa:'درصد پیشرفت', en:'Progress percent', vals:[['۲۵٪','25%',0.34],['۵۰٪','50%',0.27],['۷۵٪','75%',0.22],['۹۰٪','90%',0.17]] },
  is_replay:     { grp:'own', fa:'تماشای دوباره', en:'Replay', vals:[['اولین تماشا','First watch',0.92],['تماشای دوباره','Replay',0.08]] },
  startup_time:  { grp:'own', fa:'زمان شروع پخش', en:'Startup time', vals:[['زیر ۱ ثانیه','Under 1s',0.46],['۱–۲ ثانیه','1–2s',0.31],['۲–۵ ثانیه','2–5s',0.17],['بیش از ۵ ثانیه','Over 5s',0.06]] },
  buffer_duration:{ grp:'own', fa:'مدت گیر', en:'Rebuffer duration', vals:[['زیر ۱ ثانیه','Under 1s',0.52],['۱–۳ ثانیه','1–3s',0.31],['بیش از ۳ ثانیه','Over 3s',0.17]] },
  seek_position: { grp:'own', fa:'نقطهٔ جابه‌جایی', en:'Seek position', vals:[['۰–۵٪','0–5%',0.1069],['۵–۱۰٪','5–10%',0.0818],['۱۰–۱۵٪','10–15%',0.0566],['۱۵–۲۰٪','15–20%',0.0377],['۲۰–۲۵٪','20–25%',0.0252],['۲۵–۳۰٪','25–30%',0.0314],['۳۰–۳۵٪','30–35%',0.0440],['۳۵–۴۰٪','35–40%',0.0881],['۴۰–۴۵٪','40–45%',0.1195],['۴۵–۵۰٪','45–50%',0.0755],['۵۰–۵۵٪','50–55%',0.0377],['۵۵–۶۰٪','55–60%',0.0277],['۶۰–۶۵٪','60–65%',0.0226],['۶۵–۷۰٪','65–70%',0.0252],['۷۰–۷۵٪','70–75%',0.0352],['۷۵–۸۰٪','75–80%',0.0440],['۸۰–۸۵٪','80–85%',0.0503],['۸۵–۹۰٪','85–90%',0.0403],['۹۰–۹۵٪','90–95%',0.0314],['۹۵–۱۰۰٪','95–100%',0.0189]] },
  seek_direction:{ grp:'own', fa:'جهت جابه‌جایی', en:'Seek direction', vals:[['جلو','Forward',0.71],['عقب','Back',0.29]] },
  content_category:{ grp:'own', fa:'دستهٔ محتوا', en:'Content category', vals:[['آموزشی','Education',0.26],['سرگرمی','Entertainment',0.41],['خبری','News',0.33]] },
  quality_shift: { grp:'own', fa:'تغییر کیفیت', en:'Quality shift', vals:[['1080p → 720p','1080p → 720p',0.35],['720p → 480p','720p → 480p',0.23],['480p → 360p','480p → 360p',0.17],['1080p → 480p','1080p → 480p',0.11],['سایر','Other',0.14]] },
  device_brand:  { grp:'own', fa:'برند دستگاه', en:'Device brand', vals:[['Apple','Apple',0.27],['Samsung','Samsung',0.23],['Xiaomi','Xiaomi',0.15],['Huawei','Huawei',0.07],['سایر','Other',0.28]] },
  os_version:    { grp:'own', fa:'نسخهٔ سیستم‌عامل', en:'OS version', vals:[['Windows 11','Windows 11',0.40],['Windows 10','Windows 10',0.10],['Android 14','Android 14',0.16],['Android 13','Android 13',0.09],['iOS 17','iOS 17',0.12],['سایر','Other',0.13]] },
  browser_version:{ grp:'own', fa:'نسخهٔ مرورگر', en:'Browser version', vals:[['Chrome 124','Chrome 124',0.37],['Chrome 123','Chrome 123',0.17],['Safari 17','Safari 17',0.14],['Safari 16','Safari 16',0.04],['Firefox','Firefox',0.07],['سایر','Other',0.21]] },
  /* phase 4a-2: article properties (media pack) */
  /* phase 4c-2: content tags — multi-value (one view counts under each of its tags); values per project (Bamdad) */
  tags:          { grp:'own', fa:'برچسب', en:'Tags', multi:true, vals:[] },
  article_title: { grp:'own', fa:'عنوان مقاله', en:'Article title', vals:[['جزئیات بودجهٔ سال آینده','Next year’s budget, in detail',0.06],['نتیجهٔ دربی و واکنش‌ها','Derby result and reactions',0.05],['قیمت دلار امروز','Today’s dollar rate',0.05],['مذاکرات هسته‌ای','Nuclear talks',0.04],['افزایش حقوق کارمندان','Public-sector pay rise',0.04],['پیش‌بینی هوای هفته','This week’s weather',0.03],['کنکور ۱۴۰۵','University entrance exam',0.03],['فیلم پرفروش اکران','Box-office hit',0.02],['سایر','Other',0.68]] },
  article_age:   { grp:'own', fa:'عمر مقاله', en:'Article age', vals:[['کمتر از ۲ ساعت','Under 2 hours',0.31],['۲ تا ۲۴ ساعت','2–24 hours',0.30],['۱ تا ۷ روز','1–7 days',0.24],['قدیمی‌تر','Older',0.15]] },
  author:        { grp:'own', fa:'نویسنده', en:'Author', vals:[['سارا محمدی','Sara Mohammadi',0.18],['علی رضایی','Ali Rezaei',0.15],['مریم احمدی','Maryam Ahmadi',0.12],['دبیر سرویس','Desk editor',0.31],['سایر','Other',0.24]] },
  depth_percent: { grp:'own', fa:'درصد عمق', en:'Depth percent', vals:[['۲۵٪','25%',0.36],['۵۰٪','50%',0.28],['۷۵٪','75%',0.21],['۱۰۰٪','100%',0.15]] },
  active_time_sec:{ grp:'own', num:true, fa:'زمان فعال (ثانیه)', en:'Active time (s)', vals:[['زیر ۱۵ ثانیه','<15s',0.29],['۱۵–۶۰ ثانیه','15–60s',0.38],['۱–۳ دقیقه','1–3 min',0.24],['بیش از ۳ دقیقه','>3 min',0.09]] },
  /* page & entity */
  page_path:     { grp:'page', fa:'مسیر صفحه', en:'Page path', vals:[['/product/*','/product/*',0.38],['/','/',0.21],['/category/*','/category/*',0.17],['/checkout','/checkout',0.09],['سایر','Other',0.15]] },
  entity_module: { grp:'page', fa:'ماژول موجودیت', en:'Entity module', vals:[['محصول','Product',0.46],['دسته‌بندی','Category',0.22],['بلاگ','Blog',0.14],['لندینگ','Landing',0.10],['سایر','Other',0.08]] },
  breadcrumb_1_name:{ grp:'page', fa:'دستهٔ سطح ۱ (بردکرامب)', en:'Level-1 category (breadcrumb)', vals:[['دیجیتال','Digital',0.31],['مد و پوشاک','Fashion',0.26],['خانه و آشپزخانه','Home & kitchen',0.18],['سوپرمارکت','Grocery',0.13],['سایر','Other',0.12]] },
  page_lang:     { grp:'page', fa:'زبان صفحه', en:'Page language', vals:[['فارسی','fa',0.95],['انگلیسی','en',0.05]] },
  load_time:     { grp:'page', num:true, fa:'زمان بارگذاری صفحه', en:'Page load time', vals:[['<۱ ثانیه','<1s',0.24],['۱–۳ ثانیه','1–3s',0.43],['۳–۸ ثانیه','3–8s',0.24],['>۸ ثانیه','>8s',0.09]] },
  /* traffic source */
  referrer_type: { grp:'ref', fa:'نوع ورودی', en:'Referrer type', vals:[['ارگانیک','Organic',0.41],['مستقیم','Direct',0.27],['شبکهٔ اجتماعی','Social',0.19],['ایمیل','Mail',0.07],['سایر','Other',0.06]] },
  referrer_domain:{ grp:'ref', fa:'دامنهٔ ارجاع', en:'Referrer domain', vals:[['google.com','google.com',0.44],['instagram.com','instagram.com',0.19],['t.me','t.me',0.13],['bing.com','bing.com',0.06],['سایر','Other',0.18]] },
  /* campaign */
  utm_source:    { grp:'utm', fa:'منبع کمپین', en:'UTM source', vals:[['بدون کمپین','No campaign',0.52],['instagram','instagram',0.17],['telegram','telegram',0.12],['google','google',0.11],['newsletter','newsletter',0.08]] },
  utm_medium:    { grp:'utm', fa:'مدیوم کمپین', en:'UTM medium', vals:[['بدون کمپین','No campaign',0.52],['cpc','cpc',0.18],['social','social',0.15],['email','email',0.09],['سایر','Other',0.06]] },
  utm_campaign:  { grp:'utm', fa:'نام کمپین', en:'UTM campaign', vals:[['بدون کمپین','No campaign',0.52],['تخفیف تابستان','Summer sale',0.21],['بازگشت به مدرسه','Back to school',0.12],['خبرنامه','Newsletter',0.08],['سایر','Other',0.07]] },
  /* device & browser */
  device_type:   { grp:'dev', fa:'نوع دستگاه', en:'Device type', vals:[['موبایل','Mobile',0.58],['دسکتاپ','Desktop',0.34],['تبلت','Tablet',0.08]],
    ev:{ purchase:[0.40,0.52,0.08], begin_checkout:[0.48,0.44,0.08], payment_info_submitted:[0.44,0.48,0.08] } },   /* phase 4a-1b: buying leans to desktop */
  browser:       { grp:'dev', fa:'مرورگر', en:'Browser', vals:[['Chrome','Chrome',0.64],['Safari','Safari',0.12],['Samsung Internet','Samsung Internet',0.09],['Firefox','Firefox',0.06],['سایر','Other',0.09]] },
  os:            { grp:'dev', fa:'سیستم‌عامل', en:'OS', vals:[['Android','Android',0.58],['Windows','Windows',0.22],['iOS','iOS',0.12],['سایر','Other',0.08]] },
  /* geo & network */
  country:       { grp:'geo', fa:'کشور', en:'Country', vals:[['ایران','Iran',0.92],['سایر','Other',0.08]] },
  city:          { grp:'geo', fa:'شهر', en:'City', vals:[['تهران','Tehran',0.41],['مشهد','Mashhad',0.12],['اصفهان','Isfahan',0.10],['شیراز','Shiraz',0.07],['سایر','Other',0.30]] },
  isp_name:      { grp:'geo', fa:'اپراتور / ISP', en:'ISP', vals:[['ایرانسل','Irancell',0.28],['همراه اول','Hamrah-e-Aval',0.26],['مخابرات','TCI',0.21],['شاتل','Shatel',0.09],['سایر','Other',0.16]] },
  /* session & user */
  is_new_user:   { grp:'ses', fa:'کاربر جدید / بازگشتی', en:'New vs returning', vals:[['بازگشتی','Returning',0.66],['جدید','New',0.34]] },
  is_engaged:    { grp:'ses', fa:'نشست فعال / غیرفعال', en:'Engaged vs not', vals:[['نشست فعال','Engaged',0.58],['نشست غیرفعال','Not engaged',0.42]] }
};
function evById(id){
  for(var i=0;i<EVENTS.length;i++){ if(EVENTS[i].id===id) return EVENTS[i]; }
  for(var j=0;j<VIRTUALS.length;j++){
    if(VIRTUALS[j].id===id){
      var v=VIRTUALS[j], w=0;
      v.comps.forEach(function(c){ var e=evById(c); if(e&&!e.comps) w+=e.w*compFactor(v, c, e); });   /* lexicon b: a part's own filters */
      return { id:v.id, fa:v.fa, en:v.en, grp:'virtual', comps:v.comps, compF:v.compF||null, w:Math.round(w), props:[] };
    }
  }
  return null;
}
function evName(ev){ return ev.id; } /* code name stays latin everywhere */
function evLabel(ev){ return ev.id+' · '+T(ev.fa,ev.en); }
function propsFor(ev){ return ev.props.concat(GLOBAL_PROPS); }
/* identity batch c: «کاربران» counts people — an identified person's devices count once (shares per project; ~1.48 devices each) */
var ID_SHARE={ 0:0.2, 1:0.2, 2:0.2, 3:0 }, DEV_PER_PERSON=1.48;   /* one shared demo share for every project with data (PM, 2026-10-25, D10); production is 0 until identify ships */
var USER_DEF=['یک کاربر یعنی یک آدم: دستگاه‌های کسی که سایت شما با ⁦identify()⁩ شناخته یک بار شمرده می‌شوند و کاربر ناشناس هر دستگاهش جداست؛ ایونت‌های سمت سرور و بدون کوکی حساب نمی‌شوند.','A user is a person: the devices of someone your site identified with ⁦identify()⁩ count once, and an anonymous user is one per device; server-sent and cookieless events are not counted.'];
/* account-level reporting: «سازمان‌ها» counts organizations a site sends with group() — the share of people in one and the average
   members per organization (demo values per project) */
var ORG={ 0:{ share:0.06, members:14 }, 1:{ share:0.09, members:11 }, 2:{ share:0.04, members:18 }, 3:{ share:0, members:1 } };
function personK(){ var k=1-(ID_SHARE[PROJECT]||0)*(1-1/DEV_PER_PERSON); if(Q.unit==='org'){ var o=ORG[PROJECT]||ORG[0]; return k*o.share/o.members; } return k; }
function uf(ev){ return (ev&&ev.uf!=null?ev.uf:0.56+0.14*jit(hstr(ev.id)))*personK(); } /* uniques/events factor; transactional events override it (phase 4a): a buyer rarely buys twice the same day */

/* ── date ranges (canonical .sh-daterange presets; demo clock: Jul 27, 2026 / 5 Mordad 1405) ── */
var DEMO_NOW = new Date(2026,6,27);
var DEMO_HOUR = 14, DEMO_MIN = 32;   /* phase 4c: the demo clock's time of day — «today so far» and the minute windows end here */
var DEMO_CUSTOM_END = new Date(2026,6,5); /* the legacy "custom" value: 1–14 Tir (Jun 22 – Jul 5), kept for saved reports */
/* PM 2026-10-25, RB-12: the custom range is picked on a Jalali calendar (rb-shell.js RBShell.datePicker). A picked range is the value
   'cYYYY-MM-DD_YYYY-MM-DD' (Gregorian days, start and end included) and «از تاریخ» is 'sYYYY-MM-DD'; both keep mode 'custom' / 'since'
   for the layers that branch on it, and every range carries R.start and R.end (Date). A day is the UTC day (03:30 to 03:30 Tehran). */
var DAYMS=86400000;
function ymd(d){ return d.getFullYear()+'-'+(d.getMonth()<9?'0':'')+(d.getMonth()+1)+'-'+(d.getDate()<10?'0':'')+d.getDate(); }
function pday(y,m,d){ return new Date(+y,+m-1,+d); }
function dayDiff(a,b){ return Math.round((b.getTime()-a.getTime())/DAYMS); }
function jParts(d){ var o={}; try{ new Intl.DateTimeFormat('fa-IR-u-ca-persian',{ day:'numeric', month:'long', year:'numeric' }).formatToParts(d).forEach(function(p){ o[p.type]=p.value; }); }catch(e){} return o; }
function enDay(d, yr){ try{ return new Intl.DateTimeFormat('en-US', yr?{ month:'short', day:'numeric', year:'numeric' }:{ month:'short', day:'numeric' }).format(d); }catch(e){ return ymd(d); } }
function jLabel(a,b){ var A=jParts(a), B=jParts(b), yr=A.year!==B.year||B.year!==jParts(DEMO_NOW).year;
  if(!b||dayDiff(a,b)===0) return { fa:A.day+' '+A.month+(yr?' '+A.year:''), en:enDay(a, yr) };
  var fa=A.month===B.month&&A.year===B.year?A.day+' تا '+B.day+' '+B.month+(yr?' '+B.year:''):A.day+' '+A.month+(A.year!==B.year?' '+A.year:'')+' تا '+B.day+' '+B.month+(yr?' '+B.year:'');
  var gy=a.getFullYear()!==b.getFullYear(); return { fa:fa, en:enDay(a, gy)+' – '+enDay(b, gy||b.getFullYear()!==DEMO_NOW.getFullYear()) }; }
function customRange(a,b){ if(b<a){ var t=a; a=b; b=t; } if(b>DEMO_NOW) b=DEMO_NOW; if(a>DEMO_NOW) a=DEMO_NOW; var l=jLabel(a,b); return { range:'c'+ymd(a)+'_'+ymd(b), fa:l.fa, en:l.en, start:a, end:b, days:dayDiff(a,b)+1 }; }
function sinceRange(a){ if(a>DEMO_NOW) a=DEMO_NOW; var l=jLabel(a,a); return { range:'s'+ymd(a), fa:'از '+l.fa, en:'since '+l.en, start:a, end:DEMO_NOW, days:dayDiff(a,DEMO_NOW)+1 }; }
function pickedRange(m){
  var c=/^c(\d{4})-(\d{2})-(\d{2})_(\d{4})-(\d{2})-(\d{2})$/.exec(m), x;
  if(c){ x=customRange(pday(c[1],c[2],c[3]), pday(c[4],c[5],c[6])); var nd=Math.max(1,Math.min(366,x.days));
    return nd===1?{ mode:'custom', points:24, unit:'hour', days:1, start:x.start, end:x.end, fa:x.fa, en:x.en }
      :{ mode:'custom', points:nd<=60?nd:Math.max(2,Math.round(nd/7)), unit:nd<=60?'day':'week', days:nd, start:x.start, end:x.end, fa:x.fa, en:x.en }; }
  var sn=/^s(\d{4})-(\d{2})-(\d{2})$/.exec(m);
  if(sn){ x=sinceRange(pday(sn[1],sn[2],sn[3])); var sd=Math.max(2,Math.min(366,x.days));
    return { mode:'since', points:sd<=60?sd:Math.max(2,Math.round(sd/7)), unit:sd<=60?'day':'week', days:sd, start:x.start, end:x.end, fa:x.fa, en:x.en }; }
  return null; }
function rangeInfo(){
  var m=Q.range;
  if(m===7||m==='7') m='7d';
  if(m===30||m==='30') m='30d';
  var R;
  switch(m){
    case '30d':   R={ mode:'30d', points:30, unit:'day', days:30,  fa:'۳۰ روز اخیر', en:'last 30 days' }; break;
    case '3m':    R={ mode:'3m', points:13, unit:'week', days:91,  fa:'۳ ماه اخیر', en:'last 3 months' }; break;
    case '6m':    R={ mode:'6m', points:26, unit:'week', days:182, fa:'۶ ماه اخیر', en:'last 6 months' }; break;
    case '12m':   R={ mode:'12m', points:12, unit:'month', days:365,fa:'۱۲ ماه اخیر', en:'last 12 months' }; break;
    case 'custom':R={ mode:'custom', points:14, unit:'day', days:14, start:new Date(2026,5,22), end:DEMO_CUSTOM_END, fa:'۱ تا ۱۴ تیر', en:'Jun 22 – Jul 5' }; break;   /* legacy value of saved reports */
    /* v12 (Amplitude date picker): today / yesterday by the hour, 60 and 90 days, last N days, since a date */
    case 'today':     R={ mode:'today', points:24, unit:'hour', days:1, fa:'امروز', en:'Today' }; break;
    case 'yesterday': R={ mode:'yesterday', points:24, unit:'hour', days:1, fa:'دیروز', en:'Yesterday' }; break;
    /* phase 4c (realtime): today up to the demo clock's hour, and the last N minutes by the minute */
    case 'today_sofar': R={ mode:'today_sofar', points:DEMO_HOUR+1, unit:'hour', days:(DEMO_HOUR+1)/24, fa:'امروز تا این ساعت', en:'Today so far' }; break;
    case 'm5': case 'm10': case 'm15': case 'm30': var mn=+m.slice(1); R={ mode:m, points:mn, unit:'minute', days:mn/1440, fa:faN(mn)+' دقیقهٔ اخیر', en:'last '+mn+' minutes' }; break;
    case '60d':   R={ mode:'60d', points:60, unit:'day', days:60, fa:'۶۰ روز اخیر', en:'last 60 days' }; break;
    case '90d':   R={ mode:'90d', points:13, unit:'week', days:91, fa:'۹۰ روز اخیر', en:'last 90 days' }; break;
    default:
      if(/^n\d+$/.test(m)){ var nd=Math.max(2,Math.min(365,+m.slice(1))); R={ mode:m, points:nd<=60?nd:Math.round(nd/7), unit:nd<=60?'day':'week', days:nd, fa:faN(nd)+' روز اخیر', en:'last '+nd+' days' }; break; }
      if(m==='since'){ R={ mode:'since', points:37, unit:'day', days:37, fa:'از ۱ تیر', en:'since Jun 22' }; break; }
      R=pickedRange(String(m||''));   /* PM 2026-10-25, RB-12: a range picked on the Jalali calendar */
      if(R) break;
      R={ mode:'7d', points:7, unit:'day', days:7,   fa:'۷ روز اخیر', en:'last 7 days' };
  }
  /* PM 2026-10-25, RB-12: every range says where it ends, so axes and dates follow a picked range */
  if(!R.end) R.end=R.mode==='yesterday'?new Date(DEMO_NOW.getTime()-DAYMS):DEMO_NOW;
  if(!R.start) R.start=new Date(R.end.getTime()-Math.max(0,Math.round(R.days)-1)*DAYMS);
  /* trend-only granularity override (Mixpanel's Day/Week/Month control).
     DAU/WAU/MAU force their own unit. Guardrails mirror Mixpanel's:
     daily is not offered beyond 30-day ranges. */
  if(Q.type==='trend'){
    var g=Q.trend.activeUnit ? {dau:'day',wau:'week',mau:'month'}[Q.trend.activeUnit]
                             : (Q.trend.gran&&Q.trend.gran!=='auto'?Q.trend.gran:'');
    if(g && g!==R.unit && granAllowed(R.mode).indexOf(g)>-1){
      R.unit=g;
      R.points=g==='hour'?R.days*24 : g==='day'?R.days : g==='week'?Math.max(2,Math.round(R.days/7)) : g==='quarter'?Math.max(2,Math.round(R.days/91)) : Math.max(2,Math.round(R.days/30.44));
    }
  }
  return R;
}
/* which granularities each range supports (Mixpanel date-range guardrails) */
function granAllowed(mode){
  switch(mode){
    case '7d': return ['hour','day'];
    case '30d': case 'custom': return ['day','week'];
    case '3m': case '6m': return ['week','month'];
    case '12m': return ['week','month','quarter'];
    case 'today': case 'yesterday': case 'today_sofar': return ['hour'];
    case 'm5': case 'm10': case 'm15': case 'm30': return ['minute'];
    case '60d': case '90d': case 'since': return ['day','week'];
    default: return /^n\d+$/.test(mode)?(+mode.slice(1)<=31?['hour','day','week'].slice(1):['day','week','month']):['hour','day'];
  }
}
function axisLabels(){
  var R=rangeInfo(), fa=[], en=[], i;
  var end = R.end || (R.mode==='custom' ? DEMO_CUSTOM_END : R.mode==='yesterday' ? new Date(DEMO_NOW.getTime()-86400000) : DEMO_NOW);   /* RB-12 */
  if(R.unit==='minute'){ for(i=R.points-1;i>=0;i--){ var tm=DEMO_HOUR*60+DEMO_MIN-i, h2=Math.floor(tm/60), mi=tm%60;
      en.push((h2<10?'0':'')+h2+':'+(mi<10?'0':'')+mi); fa.push(faN(h2)+':'+(mi<10?'۰':'')+faN(mi)); } return { fa:fa, en:en }; }
  if(R.unit==='hour'){ for(i=0;i<R.points;i++){ var hh=(i<10?'0':'')+i+':00'; fa.push(faN(i)+':۰۰'); en.push(hh); } return { fa:fa, en:en }; }
  var step = R.unit==='day'?1 : R.unit==='week'?7 : R.unit==='quarter'?91.3 : 30.44;
  var fFa = new Intl.DateTimeFormat('fa-IR-u-ca-persian', R.unit==='month'?{month:'long'}:{day:'numeric',month:'long'});
  var fEn = new Intl.DateTimeFormat('en-US', R.unit==='month'?{month:'short'}:{month:'short',day:'numeric'});
  for(i=R.points-1;i>=0;i--){
    var d=new Date(end.getTime() - Math.round(i*step)*86400000);
    fa.push(fFa.format(d)); en.push(fEn.format(d));
  }
  return { fa:fa, en:en };
}
/* range-aware series: daily points keep the weekday curve; weekly/monthly points
   get a mild seasonal wobble + growth toward the present */
function seriesR(ev, unique){ var a=seriesR0(ev, unique);
  /* lexicon b: a merged event carries its sources' own series (day ranges get it inside series()) */
  if(ev && ev.mergeFrom && rangeInfo().unit!=='day') ev.mergeFrom.forEach(function(m){ var b=seriesR0(m, unique); a=a.map(function(x,i){ return x+(b[i]||0); }); });
  if(unique && ev && ev.rep!=null && a) a.rep=ev.rep; return a; }
function seriesR0(ev, unique){
  var R=rangeInfo();
  if(R.unit==='day') return series(ev, R.points, unique);
  var hc=[.3,.2,.15,.12,.12,.18,.35,.6,.85,1,1.05,1.1,1.15,1.1,1.05,1.05,1.1,1.2,1.35,1.5,1.55,1.4,1,.6];
  /* phase 4c: the last N minutes, at the demo clock's hour; indexed by minutes ago so a 5-minute window is the tail of the 30 */
  if(R.unit==='minute'){ var fm=(unique?0.97:1)*filterFactor(ev), om=[];   /* within one minute almost every page view is a different person */
    for(var k=R.points-1;k>=0;k--) om.push(Math.round(ev.w/7/1440*hc[DEMO_HOUR]*(0.85+0.3*jit(hstr(ev.id+'min')+k))*fm));
    return om; }
  if(R.unit==='hour'){ /* a day by the hour: night trough, evening peak; «today so far» is the first hours of today */
    var fh=(unique?uf(ev)*0.8:1)*filterFactor(ev), oh=[], sd=R.mode==='today_sofar'?'today':R.mode;
    for(var j=0;j<R.points;j++) oh.push(Math.round(ev.w/7/24*hc[j%24]*(0.9+0.2*jit(hstr(ev.id+sd)+j))*fh));
    return oh;
  }
  var per = ev.w * (R.unit==='week'?1:R.unit==='quarter'?13:4.345);
  var f=(unique?uf(ev):1)*filterFactor(ev), out=[], i;
  for(i=0;i<R.points;i++){
    var season=0.85+0.3*jit(hstr(ev.id+R.mode)+i);
    var growth=0.78+0.44*(i/(R.points-1||1));
    out.push(Math.round(per*season*growth*f));
  }
  return out;
}
function rangeTotal(ev, unique){ return sum(seriesR(ev, unique)); }

/* ── legacy daily axis (kept for the frozen v1/v2/v3 pages) ── */
function dayLabels(n){
  var fa=[], en=[], i, off, d;
  var faD='۰۱۲۳۴۵۶۷۸۹';
  function fd(x){ return String(x).replace(/[0-9]/g,function(c){ return faD[+c]; }); }
  for(i=n-1;i>=0;i--){
    off=i; /* days before today */
    if (off<=4){ d=5-off; fa.push(fd(d)+' مرداد'); en.push('Aug '+(d+21>31?d-10:d)); en[en.length-1]='Jul '+(27-off); }
    else { d=31-(off-5); fa.push(fd(d)+' تیر'); en.push(27-off>=1?('Jul '+(27-off)):('Jun '+(30+27-off))); }
  }
  return { fa:fa, en:en };
}
function series(ev, n, unique){
  if(ev.comps){ /* a combined event = the sum of its components (lexicon b: each scaled by its own filters) */
    var acc=null;
    ev.comps.forEach(function(c){
      var ce=evById(c), cf=compFactor(ev, c, ce), sc=series(ce, n, unique).map(function(x){ return Math.round(x*cf); });
      acc=acc?acc.map(function(x,i2){ return x+sc[i2]; }):sc;
    });
    return acc;
  }
  var wd=[0.86,0.94,1.04,1.10,1.18,0.72,0.76], out=[], i, base=ev.w/7, f=(unique?uf(ev):1)*filterFactor(ev);
  for(i=0;i<n;i++){
    var v=base*wd[i%7]*(0.9+0.2*jit(hstr(ev.id)+i))*f;
    out.push(Math.round(v));
  }
  if(ev.mergeFrom) ev.mergeFrom.forEach(function(m){ var sm=series(m, n, unique); out=out.map(function(x,i2){ return x+(sm[i2]||0); }); });   /* lexicon b: merged sources */
  return out;
}
function sum(a){ return a.reduce(function(x,y){return x+y;},0); }
/* v12: unique users over a whole period are NOT the sum of each day's unique users — the same
   person comes back on several days. One estimate, used everywhere a period total of users is
   shown (builder headline, table total, bar-over-range, board tiles, cohorts), so the numbers
   always reconcile. Never below the busiest single bucket, never above the plain sum. */
/* repeat strength: how often the same person comes back across buckets (0.9 = readers, who return daily).
   phase 4a: an event may carry its own (`rep`, e.g. purchase 0.08); its unique series carry it as `.rep`, so every
   path that keeps the array gets the same number; a path that rebuilds the array falls back to 0.9, as before. */
function periodUniques(buckets, rep){
  if(!buckets || !buckets.length) return 0;
  var tot=sum(buckets), mx=Math.max.apply(null,buckets), n=buckets.length, r=rep!=null?rep:(buckets.rep!=null?buckets.rep:0.9);
  if(n===1) return tot;
  return Math.round(Math.min(tot, Math.max(mx, tot/(1+r*Math.log(n)))));
}

/* ── query state ── */
var Q = {
  type:'trend', range:'7d', unit:'users',
  /* count: events|uniques|sessions|freq|sum · activeUnit (uniques advanced): ''|dau|wau|mau
     freqAgg: avg|median|p90|min|max · sumAgg: sum|avg|median|p90|min|max|distinct · perUser: sum per user
     kind: line|stackline|column|stackcol (time) · hbar|stackhbar|pie|table|metric (aggregate) · 'bar'=legacy column
     fn: linear|rolling|cumulative · gran: auto|day|week|month */
  trend:{ events:['discount_code_applied'], breakdown:'code', breakdown2:'', count:'events', sumProp:'', compare:false, compareMode:'prev', kind:'line',
          activeUnit:'', freqAgg:'avg', sumAgg:'sum', perUser:false, fn:'linear', gran:'auto' },
  funnel:{ steps:['cart_viewed','discount_code_applied','purchase'], win:'7d', count:'uniques', exclude:'', hold:'', breakdown:'' },
  ret:{ birth:'discount_code_applied', ret:'purchase', gran:'week', crit:'oa', breakdown:'' },
  flows:{ anchor:'discount_code_applied', dir:'after', depth:3 },
  /* property filters — up to 3 conditions with operators, combined with and/or */
  filters:[], filterLogic:'and'
};
function propSetShare(pid){ return 0.7+0.25*jit(hstr(pid+'set')); }
/* phase 4a-1b: a property value can weigh differently on one event (P.ev[eventId] = shares in vals order) —
   e.g. purchases lean to desktop, failures to one gateway; breakdowns and filters both read it, so they agree */
/* phase 4a-2b: conditional shares — P.given[otherProp][value] replaces the shares when the query pins otherProp to one value
   (a breakdown of one article's views by source is that article's own mix, not the site's) */
function sharesFor(prop, evId, cond){ var P=PROPS[prop]; if(!P) return null;
  var g=P.given&&cond?Object.keys(P.given).map(function(gp){ return cond[gp]!=null&&P.given[gp][cond[gp]]; }).filter(Boolean)[0]:null;
  var o=g||(P.ev&&evId&&P.ev[evId]); return o?P.vals.map(function(v,i){ return [v[0],v[1],o[i]!=null?o[i]:v[2]]; }):P.vals; }
/* lexicon b: a combined event's part may carry its own property filters (rb-data-defs.js) */
function compFactor(v, c, e){ var fs=(v&&v.compF&&v.compF[c])||[]; var f=1; fs.forEach(function(x){ if(x&&x.prop) f*=oneFilterFactor(x, e); }); return f; }
function oneFilterFactor(f, ev){
  /* lexicon b: a renamed value keeps its old key as an alias, so saved filters still match */
  var AL=PROPS[f.prop]&&PROPS[f.prop].alias; if(AL&&f.vals) f={ prop:f.prop, op:f.op, text:f.text, vals:f.vals.map(function(x){ return AL[x]||x; }) };
  if(f.op==='set')     return propSetShare(f.prop);
  if(f.op==='not_set') return 1-propSetShare(f.prop);
  if(f.op==='contains') return f.text ? 0.08+0.3*jit(hstr(f.prop+f.text)) : 1;
  if(f.op==='not_contains') return f.text ? 1-(0.08+0.3*jit(hstr(f.prop+f.text))) : 1;
  /* v12 builder operators: starts with, numeric comparisons */
  if(f.op==='starts_with') return f.text ? 0.05+0.25*jit(hstr(f.prop+'^'+f.text)) : 1;
  if(/^(lt|lte|gt|gte|eq)$/.test(f.op)){ var x=+f.text; if(isNaN(x)) return 1;
    var q=0.15+0.7*jit(hstr(f.prop+'#'+Math.round(x))); return f.op==='eq'?Math.min(0.2,q*0.2):(f.op==='lt'||f.op==='lte')?q:1-q; }
  if(!f.vals || !f.vals.length) return 1;
  /* phase 4c-2: a multi-value property — «in» several values is their union (independence), not their sum */
  if(PROPS[f.prop] && PROPS[f.prop].multi){ var kn={}, miss=1; sharesFor(f.prop, ev&&ev.id).forEach(function(v){ kn[v[1]]=v[2]; });
    f.vals.forEach(function(v){ miss*=1-Math.min(1, (v in kn)?kn[v]:0.02); });
    return Math.min(1, Math.max(0.02, f.op==='not_in'?miss:1-miss)); }
  var sh=0, known={};
  if(!PROPS[f.prop]){ /* props outside the catalog (e.g. tags) — deterministic share per value */
    f.vals.forEach(function(v){ sh+=0.06+0.14*jit(hstr(f.prop+v)); });
    if(f.op==='not_in') sh=1-sh;
    return Math.min(1, Math.max(0.02, sh));
  }
  sharesFor(f.prop, ev&&ev.id).forEach(function(v){ known[v[1]]=v[2]; });
  f.vals.forEach(function(v){ sh += (v in known) ? known[v] : 0.03+0.09*jit(hstr(f.prop+v)); });
  if(f.op==='not_in') sh=1-sh;
  return Math.min(1, Math.max(0.02, sh));
}
function filterFactor(ev){
  var fs=Q.filters.filter(function(f){ return f.prop; });
  if(!fs.length) return 1;
  var f;
  if(Q.filterLogic==='or'){ var inv=1; fs.forEach(function(x){ inv*=(1-oneFilterFactor(x, ev)); }); f=1-inv; }
  else { f=1; fs.forEach(function(x){ f*=oneFilterFactor(x, ev); }); }
  return Math.min(1, Math.max(0.02, f));
}
function filterLabel(){
  var fs=Q.filters.filter(function(f){ return f.prop; });
  if(!fs.length) return '';
  var parts=fs.map(function(f){
    var P=PROPS[f.prop]||{ fa:f.fa||f.prop, en:f.en||f.prop, vals:[] };
    if(f.op==='set')     return T(P.fa+': ثبت شده', P.en+' is set');
    if(f.op==='not_set') return T(P.fa+': ثبت نشده', P.en+' not set');
    if(f.op==='contains') return f.text ? T(P.fa+' شامل «'+f.text+'»', P.en+' contains “'+f.text+'”') : T(P.fa,P.en);
    if(f.op==='not_contains') return f.text ? T(P.fa+' فاقد «'+f.text+'»', P.en+' not containing “'+f.text+'”') : T(P.fa,P.en);
    var names=P.vals.filter(function(v){ return f.vals.indexOf(v[1])!==-1; })
                    .map(function(v){ return T(v[0],v[1]); });
    f.vals.forEach(function(v){ /* values the user typed herself */
      if(!P.vals.some(function(pv){ return pv[1]===v; })) names.push(v);
    });
    if(!names.length) return T(P.fa,P.en);
    return T(P.fa+(f.op==='not_in'?' ≠ ':' = ')+names.join('، '), P.en+(f.op==='not_in'?' ≠ ':' = ')+names.join(', '));
  });
  return T('فیلتر: ','Filter: ')+parts.join(T(Q.filterLogic==='or'?' یا ':' و ', Q.filterLogic==='or'?' or ':' and '));
}

/* saved reports — pre-seeded samples + user saves (in-memory demo) */
var SAVED = [
  { fa:'روند کد تخفیف به تفکیک کد', en:'Discount-code trend by code', type:'trend',
    q:{ trend:{ events:['discount_code_applied'], breakdown:'code', count:'events', kind:'line' } } },
  { fa:'قیف خرید فروشگاه', en:'Store purchase funnel', type:'funnel',
    q:{ funnel:{ steps:['cart_viewed','begin_checkout','payment_info_submitted','purchase'], win:'7d', count:'uniques', exclude:'', hold:'' } } },
  { fa:'بازگشت به خرید پس از کد تخفیف', en:'Repurchase after discount code', type:'retention',
    q:{ range:'90d', ret:{ birth:'discount_code_applied', ret:'purchase', gran:'week', crit:'oa' } } }
];

/* ── chart annotations (Mixpanel's Annotations) — project-level, date-pinned notes ── */
var ANNOT=[ { p:0.55, fa:'شروع کمپین تابستانه', en:'Summer campaign starts' } ];
var ANNOT_ON=true;
function addAnnotation(p, fa, en){ ANNOT.push({ p:Math.min(1,Math.max(0,p)), fa:fa, en:en||fa }); }

/* ── ECharts plumbing ── */
var CH={};
function ch(id){
  var el=document.getElementById(id); if(!el||!window.echarts) return null;
  if(!el.offsetWidth) return null;
  var inst=echarts.getInstanceByDom(el);
  if(!inst){ inst=echarts.init(el); CH[id]=inst; }
  return inst;
}

/* ═════════ TREND ═════════ */
function sumPropOf(ev){ /* first sum-able numeric own-prop of the event */
  var hit=''; (ev.props||[]).forEach(function(p){ if(!hit&&SUM_AVG[p]) hit=p; }); return hit;
}
function sumMode(){ return Q.trend.count==='sum' && Q.trend.events.length===1 && !!sumPropOf(evById(Q.trend.events[0])); }
/* the measurement's human label (Mixpanel's "Measuring" wording) */
function measureLabel(){
  var m=Q.trend.count;
  if(m==='uniques'){
    if(Q.trend.activeUnit==='dau') return ['کاربران فعال روزانه (DAU)','Daily Active Users'];
    if(Q.trend.activeUnit==='wau') return ['کاربران فعال هفتگی (WAU)','Weekly Active Users'];
    if(Q.trend.activeUnit==='mau') return ['کاربران فعال ماهانه (MAU)','Monthly Active Users'];
    return ['کاربران','Users'];   /* B3: «کاربران یکتا» is banned wording (UX writing A-4) */
  }
  if(m==='sessions') return ['کل نشست‌ها','Total sessions'];
  if(m==='freq'){
    var fl={avg:['میانگین','Average'],median:['میانه','Median'],p90:['صدک ۹۰','P90'],min:['کمینه','Min'],max:['بیشینه','Max']}[Q.trend.freqAgg||'avg'];
    return ['تکرار بر کاربر — '+fl[0],'Frequency per user — '+fl[1]];
  }
  if(m==='sum'){
    var sp=sumPropOf(evById(Q.trend.events[0]||'')||{props:[]});
    var pn=sp&&PROPS[sp]?[PROPS[sp].fa,PROPS[sp].en]:['ویژگی','property'];
    var al={sum:['مجموع','Sum'],avg:['میانگین','Average'],median:['میانه','Median'],p90:['صدک ۹۰','P90'],min:['کمینه','Min'],max:['بیشینه','Max'],distinct:['تعداد یکتا','Distinct count']}[Q.trend.sumAgg||'sum'];
    return [al[0]+' '+pn[0]+(Q.trend.perUser?' بر کاربر':''), al[1]+' of '+pn[1]+(Q.trend.perUser?' per user':'')];
  }
  return ['کل رویدادها','Total events'];
}
function trendData(){
  var n=rangeInfo().points, m=Q.trend.count, uniq=(m==='uniques'), out=[], i;
  if (Q.trend.events.length===1 && Q.trend.breakdown){
    var ev=evById(Q.trend.events[0]);
    var tot=seriesR(ev, uniq);
    var pv=PROPS[Q.trend.breakdown].vals, acc=new Array(n).fill(0);
    for(i=0;i<pv.length;i++){
      var isLast=i===pv.length-1, s=[];
      for(var d=0;d<n;d++){
        if(isLast){ s.push(Math.max(0,tot[d]-acc[d])); }
        else {
          var v=Math.round(tot[d]*pv[i][2]*(0.92+0.16*jit(hstr(ev.id+Q.trend.breakdown)+i*31+d)));
          acc[d]+=v; s.push(v);
        }
      }
      out.push({ fa:pv[i][0], en:pv[i][1], id:ev.id, data:s });
    }
  } else {
    Q.trend.events.forEach(function(id){
      var ev=evById(id);
      out.push({ fa:ev.fa, en:ev.en, id:ev.id, data:seriesR(ev,uniq), code:true });
    });
  }
  /* measurement transforms (Mixpanel's Measuring menu) — all deterministic */
  if(m==='sessions'){
    out.forEach(function(sr){
      sr.data=sr.data.map(function(v,i2){ return Math.round(v*(0.78+0.14*jit(hstr(sr.id+'sess')+i2))); });
    });
  }
  if(m==='freq'){
    var fAdj={avg:1, median:0.86, p90:2.0, min:0.35, max:3.4}[Q.trend.freqAgg||'avg'];
    out.forEach(function(sr){
      var base=1/Math.max(0.2, uf(evById(sr.id)));
      sr.data=sr.data.map(function(v,i2){
        return Math.max(1, Math.round(base*fAdj*(0.88+0.24*jit(hstr(sr.id+'freq')+i2))*10)/10);
      });
    });
  }
  if(sumMode()){
    /* the per-unit value is NOT constant: basket size swings day to day
       (weekends larger) — so the money curve has its own shape, distinct from
       the count curve, exactly as real data would behave */
    var sp=sumPropOf(evById(Q.trend.events[0])), avg=SUM_AVG[sp];
    var basket=[0.86,0.9,0.97,1.02,1.18,1.38,1.27];
    var agg=Q.trend.sumAgg||'sum';
    var aAdj={sum:1, avg:1, median:0.88, p90:1.9, min:0.3, max:3.2, distinct:1}[agg];
    var perCount=(agg!=='sum'&&agg!=='distinct');   /* value-of-property functions drop the count factor */
    out.forEach(function(sr){
      sr.data=sr.data.map(function(v,i2){
        var unit=avg*basket[i2%7]*(0.82+0.36*jit(hstr(sp)+i2));
        var val= agg==='distinct' ? v*0.37 : (perCount ? unit*aAdj : v*unit*aAdj);
        if(Q.trend.perUser) val=val/Math.max(1.05, 1/Math.max(0.2,uf(evById(sr.id))));
        return Math.round(val);
      });
    });
  }
  return out;
}
function renderTrend(){
  var empty=!Q.trend.events.length;
  document.getElementById('trEmpty').classList.toggle('show', empty);
  document.getElementById('ecTrend').style.display=empty?'none':'';
  var tbl=document.getElementById('trTable');
  var profCard=byId('trProfCard');
  if(empty){
    setText('kTrTotal','—'); setText('kTrUniq','—'); setText('kTrAvg','—'); setText('kTrSess','—'); setText('kTrRet','—'); tbl.innerHTML='';
    ['kTrTotalD','kTrUniqD','kTrRetD','kTrSessD','kTrAvgD'].forEach(function(i){ var el=byId(i); if(el){ el.textContent='—'; el.className='sh-delta'; } });
    var av0=byId('trAggView'); if(av0) av0.style.display='none';
    if(profCard) profCard.style.display='none';
    return;
  }

  var S=trendData(), TH=thm(), R=rangeInfo(), n=R.points, dl=axisLabels();
  var axis=L()==='fa'?dl.fa:dl.en;
  var colors=[TH.c1,TH.c2,TH.c3,TH.c4,TH.c5,TH.c6];
  var uniq=Q.trend.count==='uniques', isSum=sumMode();
  var totalAll=0; S.forEach(function(s){ totalAll+=sum(s.data); });
  /* previous-period comparison — single event, no breakdown (kept readable) */
  var cmpOK=Q.trend.compare && Q.trend.events.length===1 && !Q.trend.breakdown;
  if(cmpOK){
    var base=S[0].data, ly=Q.trend.compareMode==='lastyear';
    S.push({ fa:ly?'سال گذشته':'دورهٔ قبل', en:ly?'Same period last year':'Previous period', id:'__prev', prev:true,
      data:base.map(function(v,i2){ return Math.round(v*((ly?0.62:0.78)+0.28*jit(hstr((ly?'ly':'prev')+Q.trend.events[0])+i2))); }) });
  }

  /* KPIs — totals + uniques stay comparable regardless of count mode */
  var evTotal=0, uqTotal=0;
  Q.trend.events.forEach(function(id){ var e=evById(id); evTotal+=rangeTotal(e,false); uqTotal+=rangeTotal(e,true); });
  if(isSum){
    var sumTotal=0; S.forEach(function(sr){ if(!sr.prev) sumTotal+=sum(sr.data); });
    setText('kTrTotal', faN(sumTotal));
    setText('kTrTotalSub', T('هزار تومان · '+R.fa,'k Toman · '+R.en));
    setText('kTrAvg', faN(Math.round(sumTotal/R.days)));
    setText('kTrAvgSub', T('هزار تومان در روز','k Toman per day'));
  } else {
    setText('kTrTotal', faN(evTotal));
    setText('kTrTotalSub', T(R.fa,R.en));
    setText('kTrAvg', faN(Math.round(evTotal/R.days)));
  }
  if(cmpOK){
    var prevTotal=sum(S[S.length-1].data), curTotal=sum(S[0].data);
    var dlt=prevTotal?Math.round((curTotal-prevTotal)/prevTotal*100):0;
    setText('kTrTotalSub', T((isSum?'هزار تومان · ':'')+(Q.trend.compareMode==='lastyear'?'سال گذشته: ':'دورهٔ قبل: ')+faN(prevTotal)+' ('+(dlt>=0?'+':'−')+faN(Math.abs(dlt))+'٪)',
                             (isSum?'k Toman · ':'')+'previous: '+prevTotal+' ('+(dlt>=0?'+':'−')+Math.abs(dlt)+'%)'));
  }
  setText('kTrUniq', faN(uqTotal));
  var sessTotal=0, retTotal=0;
  Q.trend.events.forEach(function(id){
    var e=evById(id), pf=evProfile(e), uqE=rangeTotal(e,true);
    sessTotal+=pf.sessions;
    retTotal+=Math.round(uqE*(1-pf.newShare/100));
  });
  setText('kTrSess', faN(sessTotal));
  setText('kTrSessSub', T('دارای ایونت‌های انتخابی','containing the selected events'));
  setText('kTrRet', faN(retTotal));
  setText('kTrRetSub', uqTotal?pc0(Math.round(retTotal/uqTotal*100))+' '+T('از کاربران','of users'):'');
  setText('kTrUniqSub', T('هر کاربر یک‌بار','each user once'));
  if(!isSum && !cmpOK) setText('kTrAvgSub', T('رویداد در روز','events per day'));
  /* delta chips vs the previous equal period — same deterministic family as the table's Δ column */
  (function(){
    function setDelta(id,d){
      var el=byId(id); if(!el) return;
      if(d===null||!isFinite(d)){ el.textContent='—'; el.className='sh-delta'; return; }
      el.className='sh-delta '+(d>=0?'up':'down');
      el.textContent=(d>=0?'+':'−')+pc1(Math.abs(d));
    }
    var pEv=0,pUq=0,pSess=0,pRet=0;
    Q.trend.events.forEach(function(id){
      var e=evById(id), pf=evProfile(e), uqE=rangeTotal(e,true);
      pEv +=Math.round(rangeTotal(e,false)*(0.78+0.28*jit(hstr(id+'kprev'))));
      pUq +=Math.round(uqE*(0.80+0.24*jit(hstr(id+'uprev'))));
      pSess+=Math.round(pf.sessions*(0.80+0.26*jit(hstr(id+'sprev'))));
      pRet +=Math.round(uqE*(1-pf.newShare/100)*(0.82+0.24*jit(hstr(id+'rprev'))));
    });
    var dEv=pEv?(evTotal-pEv)/pEv*100:null;
    setDelta('kTrTotalD', dEv);
    setDelta('kTrAvgD',   dEv); /* same range length → same ratio */
    setDelta('kTrUniqD',  pUq?(uqTotal-pUq)/pUq*100:null);
    setDelta('kTrSessD',  pSess?(sessTotal-pSess)/pSess*100:null);
    setDelta('kTrRetD',   pRet?(retTotal-pRet)/pRet*100:null);
  })();
  var noteTxt;
  if(Q.trend.events.length===1 && Q.trend.breakdown){
    noteTxt=T('تفکیک: '+PROPS[Q.trend.breakdown].fa+' — جمع سری‌ها = کل','Broken down by '+PROPS[Q.trend.breakdown].en+' — series sum to the total');
    if(Q.trend.breakdown2) noteTxt+=T(' · تفکیک دوم ('+PROPS[Q.trend.breakdown2].fa+') در جدول جزئیات',' · second breakdown ('+PROPS[Q.trend.breakdown2].en+') in the details table');
  } else { var mlb=measureLabel(); noteTxt=T('اندازه‌گیری: '+mlb[0],'Measuring: '+mlb[1]); }
  if(Q.trend.fn==='rolling') noteTxt+=T(' · میانگین متحرک',' · rolling average');
  if(Q.trend.fn==='cumulative') noteTxt+=T(' · تجمعی',' · cumulative');
  var Rg=rangeInfo();
  noteTxt+=T(' · دانه‌بندی: '+({day:'روزانه',week:'هفتگی',month:'ماهانه'}[Rg.unit]),
             ' · granularity: '+Rg.unit);
  if(cmpOK) noteTxt+=T(' · خط‌چین = '+(Q.trend.compareMode==='lastyear'?'سال گذشته':'دورهٔ قبل'),
                       ' · dashed = '+(Q.trend.compareMode==='lastyear'?'last year':'previous period'));
  if(filterLabel()) noteTxt+=' · '+filterLabel();
  setText('trNote', noteTxt);

  /* ── data function (Mixpanel's Linear / Rolling / Cumulative) — chart-only copies ── */
  var FN=Q.trend.fn||'linear';
  var chartS=S.map(function(s){ return Object.assign({}, s, { data:s.data.slice() }); });
  if(FN==='rolling'){
    var w=R.unit==='day'?7:3;
    chartS.forEach(function(s){
      s.data=s.data.map(function(v,i2,arr){
        var a=Math.max(0,i2-w+1), acc=0;
        for(var k=a;k<=i2;k++) acc+=arr[k];
        return Math.round(acc/(i2-a+1));
      });
    });
  }
  if(FN==='cumulative'){
    chartS.forEach(function(s){
      var acc=0; s.data=s.data.map(function(v){ acc+=v; return acc; });
    });
  }

  /* ── visualization kind (Mixpanel's viz picker) ── */
  var K=Q.trend.kind||'line';
  if(K==='bar') K='column';                      /* legacy alias (frozen v1) */
  var timeKind={line:1,stackline:1,column:1,stackcol:1}[K];
  var aggView=byId('trAggView');
  var ecEl=document.getElementById('ecTrend');
  var isDomKind=(K==='table'||K==='metric');
  ecEl.style.display=isDomKind?'none':'';
  if(aggView) aggView.style.display=isDomKind?'':'none';

  if(K==='metric' && aggView){
    /* Mixpanel's Metric tile: one big number for the whole range */
    var ml=measureLabel();
    aggView.innerHTML='<div class="rb-metricview"><div class="v">'+faN(totalAll)+'</div>'+
      '<div class="l">'+T(ml[0],ml[1])+'</div><div class="s">'+T(R.fa,R.en)+(filterLabel()?' · '+filterLabel():'')+'</div></div>';
  } else if(K==='table' && aggView){
    /* Mixpanel's Table viz: segments × periods with an overall column */
    var Sr=chartS.filter(function(s){ return !s.prev; });
    var th='<thead><tr><th>'+T('سری','Series')+'</th><th>'+T('کل بازه','Overall')+'</th>';
    axis.forEach(function(a){ th+='<th>'+a+'</th>'; });
    th+='</tr></thead><tbody>';
    Sr.forEach(function(s,i){
      th+='<tr><td><span class="rb-tblleg" style="background:'+colors[i%colors.length]+'"></span>'+(s.code?'<span class="en">'+s.id+'</span>':T(s.fa,s.en))+'</td>'+
        '<td style="font-weight:800">'+faN(sum(S[i].data))+'</td>';
      s.data.forEach(function(v){ th+='<td>'+faN(v)+'</td>'; });
      th+='</tr>';
    });
    aggView.innerHTML='<div class="rb-tblwrap"><table class="sh-table rb-viztable">'+th+'</tbody></table></div>';
  } else {
    var inst=ch('ecTrend'); if(!inst) return;
    var Sreal2=chartS.filter(function(s){ return !s.prev; });
    var opt;
    if(K==='pie'){
      opt={ animationDuration:350, color:colors,
        tooltip:Object.assign(tipStyle(TH),{trigger:'item'}),
        legend:{show:true, bottom:0, icon:'roundRect', itemWidth:11, itemHeight:11,
          textStyle:{color:TH.t2,fontSize:11,fontFamily:TH.font}},
        series:[{ type:'pie', radius:['42%','68%'], center:['50%','44%'],
          label:{color:TH.t2,fontSize:11,fontFamily:TH.font,formatter:function(p){ return p.name+'\n'+pc0(p.percent); }},
          itemStyle:{borderColor:TH.bg,borderWidth:2},
          data:Sreal2.map(function(s){ return { name:s.code?s.id:T(s.fa,s.en), value:sum(S.filter(function(x){return !x.prev;})[Sreal2.indexOf(s)].data) }; }) }] };
    } else if(K==='hbar'||K==='stackhbar'){
      /* Mixpanel's Bar viz: whole-range totals as horizontal bars */
      var items=Sreal2.map(function(s,i){ return { name:s.code?s.id:T(s.fa,s.en), v:sum(S.filter(function(x){return !x.prev;})[i].data), c:colors[i%colors.length] }; });
      items.sort(function(a,b){ return b.v-a.v; });
      opt={ animationDuration:350,
        tooltip:Object.assign(tipStyle(TH),{trigger:'axis',axisPointer:{type:'shadow'}}),
        grid:{left:26,right:56,top:8,bottom:8,containLabel:true},
        xAxis:{type:'value', axisLabel:{color:TH.m2,fontSize:10,fontFamily:TH.font,formatter:function(v){return faN(v);}},
          splitLine:{lineStyle:{color:TH.border}}, position:'top'},
        yAxis:{type:'category', inverse:true, data:items.map(function(x){return x.name;}),
          axisLabel:{color:TH.t2,fontSize:11,fontFamily:TH.font}, axisLine:{lineStyle:{color:TH.border}}, axisTick:{show:false}},
        series:[{ type:'bar', barMaxWidth:20, data:items.map(function(x){ return { value:x.v, itemStyle:{color:x.c,borderRadius:[0,4,4,0]} }; }),
          label:{show:true, position:'right', color:TH.t2, fontSize:10.5, fontFamily:TH.font, formatter:function(p){ return faN(p.value); }} }] };
    } else {
      var stacked=(K==='stackline'||K==='stackcol');
      var baseType=(K==='stackline'||K==='line')?'line':'bar';
      /* annotations (Mixpanel's chart annotations) — vertical markers on dates */
      var marks=(ANNOT||[]).map(function(a){
        return { xAxis:Math.min(n-1,Math.max(0,Math.round(a.p*(n-1)))), label:{show:false}, ann:a };
      });
      opt={ animationDuration:350, color:colors,
        grid:{left:26,right:26,top:14,bottom:34,containLabel:true},
        legend:{show:chartS.length>1, bottom:0, icon:'roundRect', itemWidth:11, itemHeight:11,
          textStyle:{color:TH.t2,fontSize:11,fontFamily:TH.font},
          data:chartS.map(function(s){ return (s.code&&!s.prev)?s.id:T(s.fa,s.en); })},
        tooltip:Object.assign(tipStyle(TH),{trigger:'axis'}),
        xAxis:{type:'category', data:axis, boundaryGap:baseType==='bar', inverse:L()==='fa',
          axisLabel:{color:TH.m2,fontSize:10,fontFamily:TH.font,interval:n>16?Math.ceil(n/9):(n>7?4:0)},
          axisLine:{lineStyle:{color:TH.border}}, axisTick:{show:false}},
        yAxis:{type:'value', position:L()==='fa'?'right':'left',
          axisLabel:{color:TH.m2,fontSize:10,fontFamily:TH.font,formatter:function(v){return faN(v);}},
          splitLine:{lineStyle:{color:TH.border}}},
        series:chartS.map(function(s,i){
          if(s.prev) return { name:T(s.fa,s.en), type:'line', smooth:0.25, symbolSize:0, data:s.data,
            lineStyle:{width:2,type:'dashed',color:TH.m2}, itemStyle:{color:TH.m2} };
          var sr={
            name:s.code?s.id:T(s.fa,s.en), type:baseType,
            stack:stacked?'all':((baseType==='bar'&&chartS.length>1&&Q.trend.breakdown&&Q.trend.events.length===1)?'all':null),
            smooth:0.25, symbolSize:5, data:s.data,
            lineStyle:{width:2}, itemStyle:{borderRadius:baseType==='bar'?[3,3,0,0]:0},
            areaStyle:(K==='stackline')?{opacity:0.22}:null };
          if(i===0 && marks.length && ANNOT_ON) sr.markLine={ silent:false, symbol:'none',
            lineStyle:{color:TH.m2, type:'dashed', width:1.5},
            label:{show:true, position:'end', rotate:0, distance:6, color:TH.m2, fontSize:10, fontFamily:TH.font,
              formatter:function(p){ var a=ANNOT[p.dataIndex]; return a?T(a.fa,a.en):''; }},
            data:marks.map(function(mk){ return { xAxis:mk.xAxis }; }) };
          return sr;
        }) };
    }
    inst.setOption(opt, true);
  }

  /* details table — with an optional second, hierarchical breakdown (Mixpanel's
     grouped-table pattern: the chart stays on breakdown 1, the table nests both) */
  var bd2=(Q.trend.events.length===1&&Q.trend.breakdown&&Q.trend.breakdown2)?Q.trend.breakdown2:'';
  var h='<thead><tr><th>'+(Q.trend.events.length===1&&Q.trend.breakdown?T(PROPS[Q.trend.breakdown].fa,PROPS[Q.trend.breakdown].en)+(bd2?' ← '+T(PROPS[bd2].fa,PROPS[bd2].en):''):T('ایونت','Event'))+'</th>'+
    '<th>'+T('مجموع بازه','Range total')+'</th><th>'+T('کاربران','Users')+'</th>'+
    '<th>'+T('بر کاربر','Per user')+'</th><th>'+T('Δ دورهٔ قبل','Δ vs previous')+'</th>'+
    (bd2?'<th>'+T('سهم از والد','Share of parent')+'</th>':'')+
    '<th>'+T('سهم از کل','Share of total')+'</th></tr></thead><tbody>';
  var Sreal=S.filter(function(sr){ return !sr.prev; });
  var shareAcc=0;
  Sreal.forEach(function(s,i){
    var tot=sum(s.data);
    var share=totalAll?Math.round(tot/totalAll*100):0;
    if(i===Sreal.length-1&&totalAll) share=100-shareAcc; else shareAcc+=share;
    var uq2=Math.round(tot*(uniq?1:uf(evById(s.id))));
    var prevT=Math.round(tot*(0.78+0.28*jit(hstr((s.code?s.id:s.fa)+'prev'))));
    var dlt2=prevT?Math.round((tot-prevT)/prevT*100):0;
    var profCols=bd2?7:6;
    h+='<tr'+(bd2?' style="font-weight:800"':'')+(s.code?' class="rb-evrow'+(evProfOpen===s.id?' open':'')+'" data-evprof="'+s.id+'"':'')+'><td>'+
      (s.code?'<span class="en">'+s.id+'</span> <span class="rb-profhint">'+T(evProfOpen===s.id?'بستن پروفایل':'پروفایل ایونت ▾', evProfOpen===s.id?'Close profile':'Event profile ▾')+'</span>':T(s.fa,s.en))+'</td>'+
      '<td>'+faN(tot)+'</td>'+
      '<td>'+faN(uq2)+'</td>'+
      '<td>'+(uq2?(Math.round(tot/uq2*10)/10).toLocaleString(L()==='fa'?'fa-IR':'en-US'):'—')+'</td>'+
      '<td><span class="'+(dlt2>=0?'rb-keep':'rb-drop')+'">'+(dlt2>=0?'+':'−')+pc0(Math.abs(dlt2))+'</span></td>'+
      (bd2?'<td>—</td>':'')+
      '<td>'+pc0(share)+'</td></tr>';
    if(s.code && evProfOpen===s.id) h+=evProfRow(evById(s.id), profCols);
    if(bd2){
      var pv2=PROPS[bd2].vals, acc2=0, cAcc=0;
      pv2.forEach(function(v2,j){
        var isLast=j===pv2.length-1;
        var c;
        if(isLast) c=tot-cAcc;
        else { c=Math.round(tot*v2[2]*(0.9+0.2*jit(hstr(s.fa+bd2)+j*17))); cAcc+=c; }
        var pShare=tot?Math.round(c/tot*100):0;
        if(isLast) pShare=100-acc2; else acc2+=pShare;
        var cu=Math.round(c*(uniq?1:uf(evById(s.id))));
        h+='<tr><td style="padding-inline-start:26px;color:var(--sh-text-2)">'+T(v2[0],v2[1])+'</td>'+
          '<td>'+faN(c)+'</td>'+
          '<td>'+faN(cu)+'</td>'+
          '<td>'+(cu?(Math.round(c/cu*10)/10).toLocaleString(L()==='fa'?'fa-IR':'en-US'):'—')+'</td>'+
          '<td>—</td>'+
          '<td>'+pc0(pShare)+'</td>'+
          '<td>'+pc0(totalAll?Math.round(c/totalAll*100):0)+'</td></tr>';
      });
    }
  });
  tbl.innerHTML=h+'</tbody>';
  /* standing profile card — no clicks needed when one event is selected */
  if(profCard){
    var single1=Q.trend.events.length===1;
    profCard.style.display=single1?'':'none';
    if(single1){
      var pev=evById(Q.trend.events[0]);
      setText('trProfName', pev.id);
      byId('trProfBody').innerHTML=profTilesHtml(pev);
    }
  }
  tbl.querySelectorAll('[data-evprof]').forEach(function(row){
    row.addEventListener('click', function(){
      var id=row.getAttribute('data-evprof');
      evProfOpen = evProfOpen===id ? '' : id;
      renderTrend();
    });
  });
}

/* ═════════ FUNNEL ═════════ */
var PAIR_RATES = {
  'cart_viewed>discount_code_applied':0.21,
  'discount_code_applied>purchase':0.74,
  'cart_viewed>begin_checkout':0.29,
  'begin_checkout>payment_info_submitted':0.81,
  'payment_info_submitted>purchase':0.69,
  'video_started>video_completed':0.34,
  'cart_viewed>purchase':0.16
};
function pairRate(a,b){
  var k=a+'>'+b;
  if (PAIR_RATES[k]) return PAIR_RATES[k];
  return 0.18+0.45*jit(hstr(k));
}
function winFactor(){ return { session:0.62, '1d':0.78, '7d':1.0, '30d':1.1 }[Q.funnel.win]; }
function funnelData(){
  /* the builder's default events (_new_user, _any_active …) aren't in the legacy catalog: the legacy mirror skips them instead of throwing */
  var steps=Q.funnel.steps.filter(function(id){ return id && evById(id); });
  if (steps.length<2) return null;
  var first=evById(steps[0]);
  var enter=rangeTotal(first,true);
  if (Q.funnel.count==='totals')   enter=Math.round(enter*1.34);
  if (Q.funnel.count==='sessions') enter=Math.round(enter*1.17);
  var counts=[enter], times=[], i;
  for(i=1;i<steps.length;i++){
    var r=pairRate(steps[i-1],steps[i])*winFactor();
    if (Q.funnel.exclude) r*=0.91;
    if (Q.funnel.hold)    r*=0.82;
    r=Math.min(r,0.95);
    counts.push(Math.round(counts[i-1]*r));
    times.push(3+jit(hstr(steps[i-1]+steps[i]))*55); /* median minutes per transition */
  }
  return { steps:steps, counts:counts, times:times, enter:enter };
}
function renderFunnel(){
  var F=funnelData();
  var empty=!F;
  document.getElementById('fuEmpty').classList.toggle('show', empty);
  document.getElementById('ecFunnel').style.display=empty?'none':'';
  var tbl=document.getElementById('fuTable');
  if(empty){ setText('kFuRate','—'); setText('kFuDrop','—'); setText('kFuTime','—'); tbl.innerHTML='';
    setText('kFuRateSub',''); setText('kFuDropSub',''); setText('kFuTimeSub',''); setText('fuNote',''); return; }

  var TH=thm(), n=F.steps.length;
  var overall=F.counts[n-1]/F.counts[0]*100;
  var unitFa={uniques:'کاربر یکتا',totals:'ورود',sessions:'نشست'}[Q.funnel.count];
  var unitEn={uniques:'unique users',totals:'entries',sessions:'sessions'}[Q.funnel.count];
  setText('kFuRate', pc1(overall));
  setText('kFuRateSub', T('از '+faN(F.counts[0])+' '+unitFa+' واردشده به قدم ۱','of '+F.counts[0]+' '+unitEn+' entering step 1'));

  var worst=0, worstIdx=0;
  for(var i=1;i<n;i++){ var d=1-F.counts[i]/F.counts[i-1]; if(d>worst){ worst=d; worstIdx=i; } }
  setText('kFuDrop', '−'+pc0(worst*100));
  setText('kFuDropSub', F.steps[worstIdx-1]+' ← '+F.steps[worstIdx]);
  var tt=0; F.times.forEach(function(t){ tt+=t; });
  setText('kFuTime', mmss(tt));
  setText('kFuTimeSub', T('کل مسیر، فقط تبدیل‌شده‌ها','whole path, converters only'));
  var winFa={session:'در همان نشست','1d':'پنجرهٔ ۱ روزه','7d':'پنجرهٔ ۷ روزه','30d':'پنجرهٔ ۳۰ روزه'}[Q.funnel.win];
  var winEn={session:'same session','1d':'1-day window','7d':'7-day window','30d':'30-day window'}[Q.funnel.win];
  var noteFa=winFa+' · شمارش: '+unitFa, noteEn=winEn+' · counting: '+unitEn;
  if (Q.funnel.exclude){ noteFa+=' · بدون '+Q.funnel.exclude; noteEn+=' · excluding '+Q.funnel.exclude; }
  if (Q.funnel.hold){ noteFa+=' · '+PROPS[Q.funnel.hold].fa+' ثابت'; noteEn+=' · '+PROPS[Q.funnel.hold].en+' held constant'; }
  setText('fuNote', T(noteFa,noteEn)+(filterLabel()?' · '+filterLabel():''));

  /* horizontal bars — value axis from zero, % of previous labelled on each bar */
  var rtl=L()==='fa';
  var cats=[], data=[];
  for(i=0;i<n;i++){
    var stepFa=faN(i+1)+'. '+F.steps[i];
    cats.push(stepFa);
    var kept=i===0?null:F.counts[i]/F.counts[i-1]*100;
    data.push({ value:F.counts[i],
      itemStyle:{ color: i===n-1?TH.brand:mix(TH.brand,TH.neutral,0.35+0.5*(1-i/(n-1||1))), borderRadius:4 },
      label:{ show:true, position:rtl?'left':'right', color:TH.t2, fontFamily:TH.font, fontSize:11,
        formatter: faN(F.counts[i])+(kept===null?'':' · '+pc0(kept)) } });
  }
  cats.reverse(); data.reverse();
  var inst=ch('ecFunnel'); if(!inst) return;
  inst.setOption({
    animationDuration:350,
    grid:{left:rtl?90:10,right:rtl?10:90,top:6,bottom:6,containLabel:true},
    tooltip:Object.assign(tipStyle(TH),{trigger:'item',formatter:function(p){
      var idx=n-1-p.dataIndex;
      var ofFirst=F.counts[idx]/F.counts[0]*100;
      return '<b>'+F.steps[idx]+'</b><br>'+
        T(faN(F.counts[idx])+' '+unitFa,F.counts[idx]+' '+unitEn)+'<br>'+
        T('سهم از قدم ۱: ','Of step 1: ')+pc1(ofFirst);
    }}),
    xAxis:{type:'value', min:0, inverse:rtl,
      axisLabel:{show:false}, splitLine:{show:false}},
    yAxis:{type:'category', data:cats, position:rtl?'right':'left',
      axisLine:{show:false}, axisTick:{show:false},
      axisLabel:{color:TH.t2,fontSize:11,fontFamily:TH.font,
        rich:{}, formatter:function(v){ return v; }}},
    series:[{ type:'bar', data:data, barWidth:'62%' }]
  }, true);

  /* step table — exact numbers + share of step 1 + median time from previous */
  var h='<thead><tr><th>'+T('قدم','Step')+'</th><th>'+T('رسیدند','Reached')+'</th>'+
    '<th>'+T('از قدم قبل','From previous')+'</th><th>'+T('از قدم ۱','Of step 1')+'</th>'+
    '<th>'+T('میانهٔ زمان از قدم قبل','Median time from previous')+'</th></tr></thead><tbody>';
  for(i=0;i<n;i++){
    var keptP=i===0?null:F.counts[i]/F.counts[i-1]*100;
    h+='<tr><td><span class="en">'+faN(i+1)+'. '+F.steps[i]+'</span></td>'+
      '<td>'+faN(F.counts[i])+'</td>'+
      '<td>'+(keptP===null?'—':'<span class="'+(keptP>=50?'rb-keep':'rb-drop')+'">'+pc0(keptP)+'</span>')+'</td>'+
      '<td>'+pc0(F.counts[i]/F.counts[0]*100)+'</td>'+
      '<td>'+(i===0?'—':mmss(F.times[i-1]))+'</td></tr>';
  }
  tbl.innerHTML=h+'</tbody>';

  /* segment comparison (funnel breakdown) — overall conversion per property value */
  var segCard=byId('fuSegCard');
  if(segCard){
    var bd=Q.funnel.breakdown;
    segCard.style.display=bd?'':'none';
    if(bd){
      var segTbl=byId('fuSegTable'), P=PROPS[bd];
      var hh='<thead><tr><th>'+T(P.fa,P.en)+'</th><th>'+T('وارد قدم ۱','Entered step 1')+'</th>'+
        '<th>'+T('تبدیل‌شده','Converted')+'</th><th>'+T('نرخ تبدیل','Conversion')+'</th></tr></thead><tbody>';
      var entAcc=0;
      P.vals.forEach(function(v,i2){
        var isLast=i2===P.vals.length-1;
        var ent=isLast?F.counts[0]-entAcc:Math.round(F.counts[0]*v[2]); if(!isLast) entAcc+=ent;
        var rate=Math.min(95, overall*(0.72+0.55*jit(hstr(bd+v[1])+3)));
        var conv=Math.round(ent*rate/100);
        var best=rate>=overall;
        hh+='<tr><td>'+T(v[0],v[1])+'</td><td>'+faN(ent)+'</td><td>'+faN(conv)+'</td>'+
          '<td><span class="'+(best?'rb-keep':'rb-drop')+'">'+pc1(rate)+'</span></td></tr>';
      });
      segTbl.innerHTML=hh+'</tbody>';
      var segNote=byId('fuSegNote');
      if(segNote) segNote.textContent=T('نرخ هر سگمنت نسبت به واردشدگان همان سگمنت به قدم ۱ است؛ سبز = بالاتر از نرخ کل ('+pc1(overall)+')',
        'Each segment’s rate is relative to its own step-1 entrants; green = above the overall rate ('+pc1(overall)+')');
    }
  }
}

/* ═════════ RETENTION ═════════ */
var RET_R1 = { 'discount_code_applied>purchase':0.38, 'video_started>video_started':0.44, 'purchase>purchase':0.27 };
function retData(){
  var birth=evById(Q.ret.birth), pair=Q.ret.birth+'>'+Q.ret.ret;
  var weekly=Q.ret.gran==='week';
  var C=8, P=8; /* cohorts × periods */
  var r1=RET_R1[pair]||0;
  if(!r1) r1=0.2+0.18*jit(hstr(pair));
  var decay=0.72+0.12*jit(hstr(pair)+7);
  if(!weekly){ r1*=0.55; decay=Math.max(0.6,decay-0.08); }
  var cohorts=[], ci, pi;
  var baseSize=Math.round(sum(series(birth,7,true))*(weekly?1:1/7));
  var wkFa=['۸ خرداد','۱۵ خرداد','۲۲ خرداد','۲۹ خرداد','۵ تیر','۱۲ تیر','۱۹ تیر','۲۶ تیر'];
  var wkEn=['May 29','Jun 5','Jun 12','Jun 19','Jun 26','Jul 3','Jul 10','Jul 17'];
  var dyFa=['۲۹ تیر','۳۰ تیر','۳۱ تیر','۱ مرداد','۲ مرداد','۳ مرداد','۴ مرداد','۵ مرداد'];
  var dyEn=['Jul 20','Jul 21','Jul 22','Jul 23','Jul 24','Jul 25','Jul 26','Jul 27'];
  for(ci=0;ci<C;ci++){
    var size=Math.round(baseSize*(0.82+0.4*jit(hstr(pair)+ci*13)));
    var complete=C-1-ci; /* newest cohort: only period 0 complete */
    var cells=[];
    for(pi=0;pi<P;pi++){
      if (pi>complete){ cells.push(null); continue; }
      var v;
      if (pi===0) v=100;
      else {
        v=r1*Math.pow(decay,pi-1)*100*(0.9+0.2*jit(hstr(pair)+ci*31+pi));
        if (Q.ret.crit==='on') v=v*(0.52-0.025*pi);
      }
      cells.push(Math.max(1,Math.round(v)));
    }
    cohorts.push({ labFa:(weekly?wkFa:dyFa)[ci], labEn:(weekly?wkEn:dyEn)[ci], size:size, cells:cells });
  }
  return { cohorts:cohorts, P:P };
}
function renderRetention(){
  var R=retData(), TH=thm(), rtl=L()==='fa';
  /* KPIs — weighted averages over complete cells only */
  function wavg(p){
    var num=0, den=0;
    R.cohorts.forEach(function(c){ if(c.cells[p]!==null){ num+=c.cells[p]*c.size; den+=c.size; } });
    return den?num/den:null;
  }
  var sizes=R.cohorts.map(function(c){return c.size;});
  setText('kReSize', faN(Math.round(sum(sizes)/sizes.length)));
  setText('kReSizeSub', T('کاربر در هر کوهورت','users per cohort'));
  var p1=wavg(1), p4=wavg(4);
  setText('kReP1', p1===null?'—':pc0(p1));
  setText('kReP1Sub', T('میانگین وزنی کوهورت‌های کامل','weighted, complete cohorts only'));
  setText('kReP4', p4===null?'—':pc0(p4));
  setText('kReP4Sub', T('میانگین وزنی کوهورت‌های کامل','weighted, complete cohorts only'));
  setText('reNote', T('شروع: '+Q.ret.birth+' · بازگشت: '+Q.ret.ret+' · خانهٔ خالی = دورهٔ ناتمام',
                      'Birth: '+Q.ret.birth+' · return: '+Q.ret.ret+' · blank cell = incomplete period')+
                      (filterLabel()?' · '+filterLabel():''));

  var unitFa=Q.ret.gran==='week'?'هفتهٔ':'روز', unitEn=Q.ret.gran==='week'?'Week':'Day';
  var xcats=[], p;
  for(p=0;p<R.P;p++){ xcats.push(unitFa+' '+faN(p)); }
  if(L()!=='fa'){ xcats=[]; for(p=0;p<R.P;p++){ xcats.push(unitEn+' '+p); } }
  var ycats=[], heat=[];
  R.cohorts.forEach(function(c,ci){
    ycats.push(T(c.labFa,c.labEn)+' · n='+faN(c.size));
    c.cells.forEach(function(v,pi){
      if(v!==null) heat.push([pi,ci,v]);
    });
  });
  var inst=ch('ecRetHeat');
  if(inst) inst.setOption({
    animationDuration:300,
    grid:{left:rtl?8:120,right:rtl?120:8,top:6,bottom:26,containLabel:!0},
    tooltip:Object.assign(tipStyle(TH),{formatter:function(pt){
      var c=R.cohorts[pt.value[1]];
      return '<b>'+T('کوهورت ','Cohort ')+T(c.labFa,c.labEn)+'</b> · n='+faN(c.size)+'<br>'+
        xcats[pt.value[0]]+' : '+pc0(pt.value[2]);
    }}),
    xAxis:{type:'category', data:xcats, position:'bottom', inverse:rtl,
      axisLabel:{color:TH.m2,fontSize:10,fontFamily:TH.font}, axisLine:{show:false}, axisTick:{show:false},
      splitArea:{show:false}},
    yAxis:{type:'category', data:ycats, inverse:true, position:rtl?'right':'left',
      axisLabel:{color:TH.t2,fontSize:10.5,fontFamily:TH.font}, axisLine:{show:false}, axisTick:{show:false}},
    visualMap:{ show:false, min:0, max:60, inRange:{ color:[TH.neutral, mix(TH.brand,TH.neutral,0.55), TH.brand] } },
    series:[{ type:'heatmap', data:heat,
      label:{show:true, color:TH.text, fontSize:10, fontFamily:TH.font,
        formatter:function(pt){ return pt.value[0]===0?faN(100)+'٪'.replace('٪',L()==='fa'?'٪':'%'):pc0(pt.value[2]); }},
      itemStyle:{borderColor:TH.surf, borderWidth:2, borderRadius:4},
      emphasis:{itemStyle:{shadowBlur:6,shadowColor:'rgba(0,0,0,.25)'}} }]
  }, true);

  /* average curve — complete cells only, weighted */
  var curve=[], pts=[];
  for(p=0;p<R.P;p++){ var w=wavg(p); curve.push(w===null?null:Math.round(w*10)/10); }
  var inst2=ch('ecRetCurve');
  if(inst2) inst2.setOption({
    animationDuration:300,
    grid:{left:rtl?8:120,right:rtl?120:8,top:26,bottom:8,containLabel:true},
    title:{ text:T('میانگین بازگشت (فقط خانه‌های کامل)','Average retention (complete cells only)'),
      left:rtl?'right':'left', textStyle:{color:TH.muted,fontSize:11,fontFamily:TH.font,fontWeight:'normal'} },
    tooltip:Object.assign(tipStyle(TH),{trigger:'axis',valueFormatter:function(v){ return v===null?'—':pc1(v); }}),
    xAxis:{type:'category', data:xcats, inverse:rtl,
      axisLabel:{color:TH.m2,fontSize:10,fontFamily:TH.font}, axisLine:{lineStyle:{color:TH.border}}, axisTick:{show:false}},
    yAxis:{type:'value', min:0, max:100, position:rtl?'right':'left',
      axisLabel:{color:TH.m2,fontSize:10,fontFamily:TH.font,formatter:function(v){return pc0(v);}},
      splitLine:{lineStyle:{color:TH.border}}},
    series:[{ type:'line', data:curve, connectNulls:false, smooth:0.3, symbolSize:5,
      lineStyle:{width:2,color:TH.brand}, itemStyle:{color:TH.brand} }]
  }, true);

  /* segment comparison (retention breakdown) — P1/P4 per property value */
  var segCard=byId('reSegCard');
  if(segCard){
    var bd=Q.ret.breakdown;
    segCard.style.display=bd?'':'none';
    if(bd){
      var segTbl=byId('reSegTable'), P=PROPS[bd];
      var avgSize=Math.round(sum(sizes)/sizes.length);
      var hh='<thead><tr><th>'+T(P.fa,P.en)+'</th><th>'+T('میانگین کوهورت','Avg cohort')+'</th>'+
        '<th>'+T('بازگشت دورهٔ ۱','Period-1')+'</th><th>'+T('بازگشت دورهٔ ۴','Period-4')+'</th></tr></thead><tbody>';
      P.vals.forEach(function(v){
        var nSeg=Math.round(avgSize*v[2]);
        var p1s=p1===null?null:p1*(0.78+0.45*jit(hstr(bd+v[1])+11));
        var p4s=p4===null?null:p4*(0.72+0.55*jit(hstr(bd+v[1])+29));
        hh+='<tr><td>'+T(v[0],v[1])+'</td><td>'+faN(nSeg)+'</td>'+
          '<td>'+(p1s===null?'—':pc0(Math.min(95,p1s)))+'</td>'+
          '<td>'+(p4s===null?'—':pc0(Math.min(90,p4s)))+'</td></tr>';
      });
      segTbl.innerHTML=hh+'</tbody>';
    }
  }
}


/* ═════════ FLOWS (path discovery — Mixpanel's fourth core report) ═════════
   Per-level aggregation: top-4 real events + «سایر» + an explicit «خروج» node,
   so every level's totals reconcile with the anchor (statistical honesty). */
var FLOW_NEXT = {
  discount_code_applied:[['purchase',0.52],['begin_checkout',0.15],['cart_viewed',0.10],['support_chat_opened',0.04]],
  cart_viewed:[['begin_checkout',0.28],['add_to_cart',0.22],['discount_code_applied',0.12],['page_view',0.11]],
  begin_checkout:[['payment_info_submitted',0.58],['cart_viewed',0.09],['support_chat_opened',0.05],['page_view',0.06]],
  payment_info_submitted:[['purchase',0.62],['support_chat_opened',0.06],['cart_viewed',0.05],['page_view',0.04]],
  video_started:[['video_completed',0.30],['search_submitted',0.14],['page_view',0.18],['podcast_played',0.06]],
  purchase:[['page_view',0.32],['video_started',0.08],['search_submitted',0.07],['support_chat_opened',0.05]]
};
function flowNext(evId, dir){
  var cands = dir==='after' && FLOW_NEXT[evId] ? FLOW_NEXT[evId].slice() : null;
  if(!cands){
    cands=[];
    EVENTS.forEach(function(e){ if(e.id!==evId&&e.id!=='experiment_viewed'&&!e.late) cands.push([e.id, 0.05+0.3*jit(hstr(evId+'>'+e.id+dir))]); });
    cands.sort(function(a,b){ return b[1]-a[1]; });
    cands=cands.slice(0,4);
  }
  var exit = 0.16+0.2*jit(hstr(evId+dir+'exit'));
  var sm=0; cands.forEach(function(c){ sm+=c[1]; });
  var out=cands.map(function(c){ return [c[0], c[1]/sm*(1-exit)]; });
  out.push(['__exit', exit]);
  return out;
}
function flowsData(){
  var anchor=Q.flows.anchor, dir=Q.flows.dir, depth=Q.flows.depth;
  var total=Math.round(rangeTotal(evById(anchor),false)*0.88); /* sessions containing the anchor */
  var levels=[{}], links={}, li;
  levels[0][anchor]=total;
  for(li=0; li<depth; li++){
    var cur=levels[li], nxt={};
    Object.keys(cur).forEach(function(ev){
      if(ev==='__exit'||ev==='__other') return;
      var cnt=cur[ev];
      if(cnt<total*0.02) return;
      flowNext(ev,dir).forEach(function(pair){
        var v=cnt*pair[1];
        nxt[pair[0]]=(nxt[pair[0]]||0)+v;
        var k=li+'|'+ev+'>'+(li+1)+'|'+pair[0];
        links[k]=(links[k]||0)+v;
      });
    });
    /* keep top-4 real events; everything else lumps into «سایر» */
    var reals=Object.keys(nxt).filter(function(k){ return k!=='__exit'; })
      .sort(function(a,b){ return nxt[b]-nxt[a]; });
    var kept=reals.slice(0,4), other=0;
    reals.slice(4).forEach(function(k){
      other+=nxt[k];
      Object.keys(links).forEach(function(lk){
        if(lk.indexOf('>'+(li+1)+'|'+k)!==-1){
          var src=lk.split('>')[0];
          var ok=src+'>'+(li+1)+'|__other';
          links[ok]=(links[ok]||0)+links[lk];
          delete links[lk];
        }
      });
      delete nxt[k];
    });
    if(other>0) nxt.__other=other;
    levels.push(nxt);
    if(!kept.length) break;
  }
  /* top paths — recursive top-3 expansion, exact per-path counts */
  var paths=[];
  (function walk(ev, prob, path, d){
    if(d>=depth){ paths.push({path:path.slice(), n:Math.round(total*prob)}); return; }
    var nx=flowNext(ev,dir).filter(function(pp){ return pp[0]!=='__exit'; }).slice(0,3);
    var exitP=flowNext(ev,dir).filter(function(pp){ return pp[0]==='__exit'; })[0][1];
    paths.push({path:path.concat(['__exit']), n:Math.round(total*prob*exitP)});
    nx.forEach(function(pp){ walk(pp[0], prob*pp[1], path.concat([pp[0]]), d+1); });
  })(anchor, 1, [anchor], 0);
  paths.sort(function(a,b){ return b.n-a.n; });
  var exitNow=flowNext(anchor,dir).filter(function(pp){ return pp[0]==='__exit'; })[0][1];
  return { total:total, levels:levels, links:links, paths:paths.slice(0,5), exitNow:exitNow, dir:dir };
}
function flowLabel(ev){
  if(ev==='__exit')  return T('خروج','Exit');
  if(ev==='__other') return T('سایر','Other');
  return ev;
}
function renderFlows(){
  if(!byId('ecFlows')) return;
  var F=flowsData(), TH=thm();
  setText('kFlTotal', faN(F.total));
  setText('kFlTotalSub', T('نشست شامل '+Q.flows.anchor, 'sessions containing '+Q.flows.anchor));
  var firstNext=Object.keys(F.levels[1]||{}).filter(function(k){ return k!=='__exit'&&k!=='__other'; })
    .sort(function(a,b){ return F.levels[1][b]-F.levels[1][a]; })[0];
  setText('kFlTop', firstNext||'—');
  setText('kFlTopSub', firstNext? pc0(F.levels[1][firstNext]/F.total*100)+' '+T('از نشست‌ها','of sessions') : '');
  setText('kFlExit', pc0(F.exitNow*100));
  setText('kFlExitSub', T('بدون هیچ ایونت بعدی','no further event'));
  setText('flNote', T((F.dir==='after'?'مسیرهای بعد از ':'مسیرهای قبل از ')+Q.flows.anchor+
      ' · هر سطح: ۴ ایونت برتر + سایر + خروج','Paths '+(F.dir==='after'?'after ':'before ')+Q.flows.anchor+
      ' · per level: top-4 events + Other + Exit')+(filterLabel()?' · '+filterLabel():''));

  var nodes=[], links=[], seen={};
  function nodeColor(ev, lvl){
    if(ev==='__exit') return TH.m2;
    if(ev==='__other') return TH.border;
    if(lvl===0) return TH.brand;
    var cols=[TH.c2,TH.c3,TH.c4,TH.c5,TH.c6];
    return cols[hstr(ev)%cols.length];
  }
  F.levels.forEach(function(lvl,i){
    Object.keys(lvl).forEach(function(ev){
      var id=i+'|'+ev;
      if(seen[id]) return;
      seen[id]=1;
      nodes.push({ name:id, itemStyle:{color:nodeColor(ev,i)},
        label:{ formatter:function(p){ var e=p.name.split('|')[1]; return flowLabel(e); },
          color:TH.t2, fontSize:10.5, fontFamily:TH.font } });
    });
  });
  Object.keys(F.links).forEach(function(k){
    var pr=k.split('>');
    links.push({ source:pr[0], target:pr[1], value:Math.round(F.links[k]) });
  });
  var inst=ch('ecFlows'); if(!inst) return;
  inst.setOption({
    animationDuration:350,
    tooltip:Object.assign(tipStyle(TH),{trigger:'item',formatter:function(p){
      if(p.dataType==='edge'){
        var a=p.data.source.split('|')[1], b=p.data.target.split('|')[1];
        return flowLabel(a)+' → '+flowLabel(b)+'<br>'+faN(p.data.value)+' · '+pc0(p.data.value/F.total*100)+
          ' '+T('از نشست‌های مبنا','of anchor sessions');
      }
      return flowLabel(p.name.split('|')[1]);
    }}),
    series:[{ type:'sankey', left:12, right:80, top:14, bottom:14,
      nodeWidth:14, nodeGap:14, nodeAlign:'left', draggable:false,
      emphasis:{focus:'adjacency'},
      data:nodes, links:links,
      lineStyle:{color:'gradient', opacity:0.32, curveness:0.5} }]
  }, true);

  /* top-paths table — exact numbers the sankey can't show */
  var tbl=byId('flTable'); if(!tbl) return;
  var h='<thead><tr><th>'+T('مسیر','Path')+'</th><th>'+T('نشست‌ها','Sessions')+'</th><th>'+T('سهم از مبنا','Share of anchor')+'</th></tr></thead><tbody>';
  F.paths.forEach(function(pp){
    var lbl=pp.path.map(flowLabel).join(' → ');
    h+='<tr><td><span class="en">'+lbl+'</span></td><td>'+faN(pp.n)+'</td><td>'+pc0(pp.n/F.total*100)+'</td></tr>';
  });
  tbl.innerHTML=h+'</tbody>';
}

/* per-event profile — every fact maps to a real collector column:
   sessions←CidSessionChecksum · new-user share←IsNewUser · engaged←IsEngagedSession
   time-to-event←Created−CidStdSessionTime · peak hour←Created · top page←PURL
   top source←SRefererURLExternalType */
var evProfOpen='';
function evProfile(ev){
  var h1=hstr(ev.id);
  var uniqTot=rangeTotal(ev,true), tot=rangeTotal(ev,false);
  var sessions=Math.round(uniqTot*(1.06+0.28*jit(h1+5)));
  var newShare=Math.round(16+42*jit(h1+9));
  var engaged=Math.round(46+38*jit(h1+13));
  var mins=Math.round((0.4+9*jit(h1+17))*10)/10;
  var peak=10+(h1%12);
  var pages=PROPS.page_path.vals, pg=pages[h1%4];
  var srcs=PROPS.referrer_type.vals, sr=srcs[h1%srcs.length];
  return { sessions:sessions, newShare:newShare, engaged:engaged, mins:mins,
           peakFa:faN(peak)+'–'+faN(peak+1), peakEn:peak+'–'+(peak+1),
           pageFa:pg[0], pageEn:pg[1], srcFa:sr[0], srcEn:sr[1] };
}
function profTilesHtml(ev){
  var P=evProfile(ev);
  function card(lFa,lEn,v,sFa,sEn,ltr){
    return '<div class="sh-card"><div class="sh-card-title">'+T(lFa,lEn)+'</div>'+
      '<div class="kpi-value"'+(ltr?' style="direction:ltr;unicode-bidi:embed"':'')+'>'+v+'</div>'+
      '<div class="sub">'+T(sFa,sEn)+'</div></div>';
  }
  return '<div class="rb-profgrid">'+
    card('نشست‌های دارای ایونت','Sessions with event', faN(P.sessions),'در بازهٔ انتخابی','in the selected range')+
    card('کاربران جدید','New users', pc0(P.newShare),'از انجام‌دهنده‌ها','of performers')+
    card('نشست‌های فعال','Engaged sessions', pc0(P.engaged),'از نشست‌های دارای ایونت','of sessions with it')+
    card('میانهٔ زمان تا وقوع','Median time to event', T(P.mins.toLocaleString('fa-IR')+' دقیقه',P.mins+' min'),'از شروع نشست','from session start')+
    card('ساعت اوج وقوع','Peak hour', T(P.peakFa,P.peakEn),'در شبانه‌روز','of the day')+
    card('پرتکرارترین صفحه','Top page', T(P.pageFa,P.pageEn),'محل وقوع','where it fires', true)+
    card('منبع برتر نشست‌ها','Top source', T(P.srcFa,P.srcEn),'ورودی نشست‌ها','session entry')+
  '</div>';
}
function evProfRow(ev, cols){
  return '<tr class="rb-evprofrow"><td colspan="'+cols+'">'+profTilesHtml(ev)+'</td></tr>';
}

/* ═════════ shared UI plumbing ═════════ */
function setText(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }
function byId(id){ return document.getElementById(id); }
function on(id,evt,fn){ var el=byId(id); if(el) el.addEventListener(evt,fn); }

function fillEventSelect(sel, placeholderFa, placeholderEn, skipIds){
  var h='<option value="">'+T(placeholderFa,placeholderEn)+'</option>';
  if(VIRTUALS.length){
    h+='<optgroup label="'+T(GRP.virtual.fa,GRP.virtual.en)+'">';
    VIRTUALS.forEach(function(v){
      if(skipIds && skipIds.indexOf(v.id)!==-1) return;
      h+='<option value="'+v.id+'">'+v.id+' · '+T(v.fa,v.en)+'</option>';
    });
    h+='</optgroup>';
  }
  ['custom','media','ecom','video','auto'].forEach(function(g){
    h+='<optgroup label="'+T(GRP[g].fa,GRP[g].en)+'">';
    EVENTS.forEach(function(ev){
      if(ev.grp!==g) return;
      if(skipIds && skipIds.indexOf(ev.id)!==-1) return;
      h+='<option value="'+ev.id+'">'+evLabel(ev)+'</option>';
    });
    h+='</optgroup>';
  });
  sel.innerHTML=h;
}
function fillRange(){
  var sel=byId('rbRange'); if(!sel) return;
  sel.innerHTML='<option value="7d">'+T('۷ روز اخیر','Last 7 days')+'</option>'+
    '<option value="30d">'+T('۳۰ روز اخیر','Last 30 days')+'</option>';
  sel.value=rangeInfo().mode==='30d'?'30d':'7d';
}
function fillWindow(){
  var sel=byId('rbWindow'); if(!sel) return;
  sel.innerHTML='<option value="session">'+T('در همان نشست','Same session')+'</option>'+
    '<option value="1d">'+T('۱ روز','1 day')+'</option>'+
    '<option value="7d">'+T('۷ روز (پیش‌فرض)','7 days (default)')+'</option>'+
    '<option value="30d">'+T('۳۰ روز','30 days')+'</option>';
  sel.value=Q.funnel.win;
}
function fillBreak(){
  if(byId('rbBreakChips')) return fillBreakChips();
  return fillBreakLegacy();
}
/* chip-based breakdown (v4): mirrors the events-chip pattern right above it —
   active breakdowns as removable chips (second one visually nested), numeric
   ones carry their auto-bucket badge, one add-select that hides when full. */
function fillBreakChips(){
  var box=byId('rbBreakChips'), add=byId('rbBreakAdd'), hint=byId('rbBreakHint');
  var single=Q.trend.events.length===1;
  if(hint) hint.style.display=single?'none':'';
  if(!single){ Q.trend.breakdown=''; Q.trend.breakdown2=''; }
  var bds=[Q.trend.breakdown,Q.trend.breakdown2].filter(Boolean);
  box.innerHTML=bds.map(function(pid,i){
    var P=PROPS[pid];
    return '<div class="rb-bdchip'+(i===1?' nest':'')+'">'+
      (i===1?'<span class="arr">↳</span>':'')+
      '<span class="nm">'+T(P.fa,P.en)+'</span>'+
      (P.num?'<span class="rb-mark bucket">'+T('گروه‌بندی خودکار','Auto-grouped')+'</span>':'')+
      '<button class="x" data-rmbd="'+i+'" aria-label="حذف / remove">✕</button></div>';
  }).join('');
  box.style.display=bds.length?'':'none';
  if(add){
    var canAdd=single&&bds.length<2;
    add.style.display=canAdd?'':'none';
    if(canAdd){
      var ph=bds.length?T('+ افزودن تفکیک دوم…','+ Add a second breakdown…'):T('+ افزودن تفکیک…','+ Add a breakdown…');
      var h='<option value="">'+ph+'</option>';
      var ev=evById(Q.trend.events[0]);
      if(ev.props.length){
        h+='<optgroup label="'+T('ویژگی‌های این ایونت','This event’s properties')+'">';
        ev.props.forEach(function(pid){
          if(bds.indexOf(pid)!==-1) return;
          h+='<option value="'+pid+'">'+T(PROPS[pid].fa,PROPS[pid].en)+'</option>';
        });
        h+='</optgroup>';
      }
      PROP_GROUPS.forEach(function(g){
        var items=GLOBAL_PROPS.filter(function(pid){ return PROPS[pid].grp===g[0]&&bds.indexOf(pid)===-1; });
        if(!items.length) return;
        h+='<optgroup label="'+T(g[1],g[2])+'">';
        items.forEach(function(pid){ h+='<option value="'+pid+'">'+T(PROPS[pid].fa,PROPS[pid].en)+'</option>'; });
        h+='</optgroup>';
      });
      add.innerHTML=h;
      add.value='';
    }
  }
  box.querySelectorAll('[data-rmbd]').forEach(function(btn){
    btn.addEventListener('click', function(){
      if(btn.getAttribute('data-rmbd')==='0'){ Q.trend.breakdown=Q.trend.breakdown2||''; Q.trend.breakdown2=''; }
      else Q.trend.breakdown2='';
      fillBreak(); renderActive();
    });
  });
}
function fillBreakLegacy(){

  var sel=byId('rbBreak'), hint=byId('rbBreakHint'); if(!sel) return;
  var single=Q.trend.events.length===1;
  if(hint) hint.style.display=single?'none':'';
  sel.disabled=!single;
  var h='<option value="">'+T('— بدون تفکیک','— No breakdown')+'</option>';
  if(single){
    var ev=evById(Q.trend.events[0]);
    if(ev.props.length){
      h+='<optgroup label="'+T('ویژگی‌های این ایونت','This event’s properties')+'">';
      ev.props.forEach(function(pid){ h+='<option value="'+pid+'">'+T(PROPS[pid].fa,PROPS[pid].en)+'</option>'; });
      h+='</optgroup>';
    }
    PROP_GROUPS.forEach(function(g){
      var items=GLOBAL_PROPS.filter(function(pid){ return PROPS[pid].grp===g[0]; });
      if(!items.length) return;
      h+='<optgroup label="'+T(g[1],g[2])+'">';
      items.forEach(function(pid){ h+='<option value="'+pid+'">'+T(PROPS[pid].fa,PROPS[pid].en)+'</option>'; });
      h+='</optgroup>';
    });
  }
  sel.innerHTML=h;
  sel.value=single?(Q.trend.breakdown||''):'';
  /* second (hierarchical) breakdown — enabled once the first is set */
  var sel2=byId('rbBreak2');
  if(sel2){
    var can2=single&&!!Q.trend.breakdown;
    sel2.disabled=!can2;
    var h2='<option value="">'+T('— بدون تفکیک دوم','— No second breakdown')+'</option>';
    if(can2){
      var ev2=evById(Q.trend.events[0]);
      ev2.props.concat(GLOBAL_PROPS).forEach(function(pid){
        if(pid===Q.trend.breakdown) return;
        h2+='<option value="'+pid+'">'+T(PROPS[pid].fa,PROPS[pid].en)+'</option>';
      });
    }
    sel2.innerHTML=h2;
    sel2.value=can2?(Q.trend.breakdown2||''):'';
  }
  /* auto-bucketing hint for numeric properties (Mixpanel parity) */
  var bh=byId('rbBucketHint');
  if(bh){
    var isNum=Q.trend.breakdown&&PROPS[Q.trend.breakdown]&&PROPS[Q.trend.breakdown].num;
    var isNum2=Q.trend.breakdown2&&PROPS[Q.trend.breakdown2]&&PROPS[Q.trend.breakdown2].num;
    bh.style.display=(isNum||isNum2)?'':'none';
  }
}
function fillExclude(){
  var sel=byId('rbExclude'); if(!sel) return;
  fillEventSelect(sel,'— بدون گام حذفی','— No exclusion', Q.funnel.steps);
  sel.value=Q.funnel.exclude||'';
}
function fillHold(){
  var sel=byId('rbHold'); if(!sel) return;
  /* only properties shared by every step make sense to hold constant */
  var steps=Q.funnel.steps.filter(Boolean), shared=null;
  steps.forEach(function(id){
    var ps=propsFor(evById(id));
    shared=shared===null?ps.slice():shared.filter(function(p){ return ps.indexOf(p)!==-1; });
  });
  var h='<option value="">'+T('— آزاد','— Free')+'</option>';
  (shared||[]).forEach(function(pid){ h+='<option value="'+pid+'">'+T(PROPS[pid].fa,PROPS[pid].en)+'</option>'; });
  sel.innerHTML=h;
  sel.value=Q.funnel.hold||'';
}
function fillRet(){
  var b=byId('rbBirth'), r=byId('rbReturn'); if(!b||!r) return;
  fillEventSelect(b,'انتخاب ایونت شروع…','Pick the birth event…');
  fillEventSelect(r,'انتخاب ایونت بازگشت…','Pick the return event…');
  b.value=Q.ret.birth; r.value=Q.ret.ret;
}
function fillSaved(){
  var sel=byId('rbSaved'); if(!sel) return;
  var h='<option value="">'+T('— گزارش من','— My report')+'</option>';
  SAVED.forEach(function(s,i){ h+='<option value="'+i+'">'+T(s.fa,s.en)+'</option>'; });
  sel.innerHTML=h;
}

function renderTrendChips(){
  var box=byId('rbTrendChips'), TH=thm(); if(!box) return;
  var colors=[TH.c1,TH.c2,TH.c3,TH.c4,TH.c5,TH.c6];
  box.innerHTML=Q.trend.events.map(function(id,i){
    var ev=evById(id);
    return '<div class="rb-chip"><span class="sw" style="background:'+colors[i%6]+'"></span>'+
      '<span class="en">'+ev.id+'</span>'+
      (ev.grp==='custom'?'<span class="rb-mark custom">'+T('اختصاصی','Custom')+'</span>':'')+
      '<button class="x" data-rmev="'+id+'" aria-label="حذف / remove">✕</button></div>';
  }).join('');
  box.querySelectorAll('[data-rmev]').forEach(function(btn){
    btn.addEventListener('click', function(){
      Q.trend.events=Q.trend.events.filter(function(x){ return x!==btn.getAttribute('data-rmev'); });
      if(Q.trend.events.length!==1) Q.trend.breakdown='';
      refreshPanel(); renderActive();
    });
  });
  var add=byId('rbTrendAdd');
  if(add){
    var full=Q.trend.events.length>=5;
    add.style.display=full?'none':'';
    if(!full) fillEventSelect(add,'+ افزودن ایونت…','+ Add an event…', Q.trend.events);
  }
  var cap=byId('rbEvCap');
  if(cap){
    var nEv=Q.trend.events.length;
    cap.innerHTML='<span class="cnt">'+faN(nEv)+' '+T('از','of')+' '+faN(5)+'</span> '+
      (nEv>=5?T('ظرفیت مقایسه پر است — برای ایونت جدید، یکی را با ✕ بردارید.','Comparison is full — remove one with ✕ to add another.')
             :T('ایونت هم‌زمان قابل مقایسه','events compared at once'));
    cap.classList.toggle('full', nEv>=5);
  }
}
function renderSteps(){
  var box=byId('rbSteps'); if(!box) return;
  box.innerHTML='';
  Q.funnel.steps.forEach(function(id,i){
    var row=document.createElement('div'); row.className='rb-step';
    row.innerHTML='<span class="n">'+faN(i+1)+'</span><select class="sh-select" data-step="'+i+'"></select>'+
      (Q.funnel.steps.length>2?'<button class="x" data-rmstep="'+i+'" aria-label="حذف / remove">✕</button>':'');
    box.appendChild(row);
    var sel=row.querySelector('select');
    fillEventSelect(sel,'انتخاب ایونت…','Pick an event…');
    sel.value=id||'';
    sel.addEventListener('change', function(){
      Q.funnel.steps[i]=sel.value;
      refreshPanel(); renderActive();
    });
  });
  box.querySelectorAll('[data-rmstep]').forEach(function(btn){
    btn.addEventListener('click', function(){
      Q.funnel.steps.splice(Number(btn.getAttribute('data-rmstep')),1);
      refreshPanel(); renderActive();
    });
  });
  var addStep=byId('rbAddStep'); if(addStep) addStep.style.display=Q.funnel.steps.length>=5?'none':'';
}
function fillPropSelect(id, cur){
  var sel=byId(id); if(!sel) return;
  var h='<option value="">'+T('— بدون تفکیک','— No breakdown')+'</option>';
  PROP_GROUPS.forEach(function(g){
    var items=GLOBAL_PROPS.filter(function(pid){ return PROPS[pid].grp===g[0]; });
    if(!items.length) return;
    h+='<optgroup label="'+T(g[1],g[2])+'">';
    items.forEach(function(pid){ h+='<option value="'+pid+'">'+T(PROPS[pid].fa,PROPS[pid].en)+'</option>'; });
    h+='</optgroup>';
  });
  sel.innerHTML=h;
  sel.value=cur||'';
}
function fillFlows(){
  var a=byId('rbFlowAnchor'); if(!a) return;
  fillEventSelect(a,'انتخاب ایونت مبنا…','Pick the anchor event…');
  a.value=Q.flows.anchor;
}
function fillSumProp(){
  var wrap=byId('rbSumWrap'); if(!wrap) return;
  var can=Q.trend.count==='sum';
  wrap.style.display=can?'':'none';
  if(!can) return;
  var single=Q.trend.events.length===1;
  var sp=single?sumPropOf(evById(Q.trend.events[0])):'';
  var msg=byId('rbSumMsg');
  if(msg) msg.textContent=!single?T('مجموع فقط با یک ایونت','Sum needs a single event')
    :(sp?T('ویژگی: '+PROPS[sp].fa,'Property: '+PROPS[sp].en)
        :T('این ایونت ویژگی عددی جمع‌پذیر ندارد','This event has no summable numeric property'));
}
function fillFilter(){
  var box=byId('rbFilterBox'); if(!box) return;
  var h='';
  function opOpt(v,fa,en,cur){ return '<option value="'+v+'"'+(cur===v?' selected':'')+'>'+T(fa,en)+'</option>'; }
  if(Q.filters.length<3){
    h+='<select class="sh-select" id="rbFilterAdd"><option value="">'+
      (Q.filters.length?T('+ افزودن شرط دیگر…','+ Add another condition…'):T('+ افزودن فیلتر…','+ Add a filter…'))+'</option>';
    PROP_GROUPS.forEach(function(g){
      var items=GLOBAL_PROPS.filter(function(pid){ return PROPS[pid].grp===g[0]; });
      if(!items.length) return;
      h+='<optgroup label="'+T(g[1],g[2])+'">';
      items.forEach(function(pid){ h+='<option value="'+pid+'">'+T(PROPS[pid].fa,PROPS[pid].en)+'</option>'; });
      h+='</optgroup>';
    });
    h+='</select>';
  }
  Q.filters.forEach(function(f,idx){
    var P=PROPS[f.prop];
    h+='<div class="rb-fbox"><div class="rb-fbox-h"><span class="nm">'+T(P.fa,P.en)+'</span>'+
      '<select class="sh-select" data-fop="'+idx+'" style="max-width:120px">'+
        opOpt('in','است','is',f.op)+opOpt('not_in','نیست','is not',f.op)+
        opOpt('contains','شامل','contains',f.op)+
        opOpt('set','ثبت شده','is set',f.op)+opOpt('not_set','ثبت نشده','is not set',f.op)+
      '</select>'+
      '<button class="x" data-rmf="'+idx+'" aria-label="حذف / remove">✕</button></div>';
    if(f.op==='in'||f.op==='not_in'){
      h+='<input class="sh-input rb-fsearch" data-fsearch="'+idx+'" placeholder="'+T('جستجو کنید یا مقدار خودتان را بنویسید و Enter بزنید…','Search, or type your own value and press Enter…')+'"/>';
      h+='<div class="rb-fvals">';
      P.vals.forEach(function(v){
        var on=f.vals.indexOf(v[1])!==-1;
        h+='<button class="rb-fval'+(on?' on':'')+'" data-fidx="'+idx+'" data-fval="'+v[1]+'">'+T(v[0],v[1])+'</button>';
      });
      /* values the user typed herself (not in the suggested list) */
      f.vals.forEach(function(v){
        var known=P.vals.some(function(pv){ return pv[1]===v; });
        if(!known) h+='<button class="rb-fval on custom" data-fidx="'+idx+'" data-fval="'+v+'">'+v+'</button>';
      });
      h+='</div>';
      if(!f.vals.length) h+='<span class="rb-hint">'+T('از پیشنهادها انتخاب کنید یا مقدار دلخواهتان را تایپ کنید — تا آن موقع این شرط اثری ندارد.','Pick from the suggestions or type your own value — until then this condition has no effect.')+'</span>';
    }
    if(f.op==='contains'){
      h+='<input class="sh-input" data-fcontains="'+idx+'" value="'+(f.text||'')+'" placeholder="'+T('بخشی از مقدار — مثلا SUMMER','Part of the value — e.g. SUMMER')+'"/>';
      if(!f.text) h+='<span class="rb-hint">'+T('متنی بنویسید؛ هر مقداری که آن را در خود داشته باشد می‌ماند.','Type text; any value containing it stays.')+'</span>';
    }
    h+='</div>';
  });
  if(Q.filters.length>=2){
    h+='<div class="rb-flogic"><span class="rb-hint">'+T('ترکیب شرط‌ها:','Combine conditions:')+'</span>'+
      '<span class="sh-seg">'+
      '<button class="sh-seg-opt'+(Q.filterLogic!=='or'?' on':'')+'" data-flogic="and">'+T('همهٔ شرط‌ها (و)','All (and)')+'</button>'+
      '<button class="sh-seg-opt'+(Q.filterLogic==='or'?' on':'')+'" data-flogic="or">'+T('هر کدام (یا)','Any (or)')+'</button>'+
      '</span></div>';
  }
  box.innerHTML=h;
  var add=byId('rbFilterAdd');
  if(add) add.addEventListener('change', function(){
    if(!this.value) return;
    Q.filters.push({ prop:this.value, op:'in', vals:[] });
    fillFilter();
  });
  box.querySelectorAll('[data-rmf]').forEach(function(btn){
    btn.addEventListener('click', function(){
      Q.filters.splice(Number(btn.getAttribute('data-rmf')),1);
      fillFilter(); renderActive();
    });
  });
  box.querySelectorAll('[data-fop]').forEach(function(sel){
    sel.addEventListener('change', function(){
      var f=Q.filters[Number(sel.getAttribute('data-fop'))];
      f.op=sel.value;
      if(f.op==='set'||f.op==='not_set'){ f.vals=[]; f.text=''; }
      if(f.op==='contains') f.vals=[];
      fillFilter(); renderActive();
    });
  });
  box.querySelectorAll('[data-fsearch]').forEach(function(inp){
    inp.addEventListener('input', function(){
      var qtxt=inp.value.trim().toLowerCase();
      var wrap=inp.parentElement.querySelector('.rb-fvals');
      if(wrap) wrap.querySelectorAll('.rb-fval').forEach(function(c){
        c.style.display = !qtxt || c.textContent.toLowerCase().indexOf(qtxt)!==-1 ? '' : 'none';
      });
    });
    inp.addEventListener('keydown', function(e){
      if(e.key!=='Enter') return;
      e.preventDefault();
      var val=inp.value.trim();
      if(!val) return;
      var f=Q.filters[Number(inp.getAttribute('data-fsearch'))];
      if(f.vals.indexOf(val)===-1) f.vals.push(val);
      fillFilter(); renderActive();
    });
  });
  box.querySelectorAll('[data-fcontains]').forEach(function(inp){
    inp.addEventListener('change', function(){
      var f=Q.filters[Number(inp.getAttribute('data-fcontains'))];
      f.text=inp.value.trim();
      fillFilter(); renderActive();
    });
    inp.addEventListener('keydown', function(e){
      if(e.key==='Enter'){ e.preventDefault(); inp.dispatchEvent(new Event('change',{bubbles:true})); }
    });
  });
  box.querySelectorAll('[data-fval]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var f=Q.filters[Number(btn.getAttribute('data-fidx'))];
      var v=btn.getAttribute('data-fval'), i=f.vals.indexOf(v);
      if(i===-1) f.vals.push(v); else f.vals.splice(i,1);
      fillFilter(); renderActive();
    });
  });
  box.querySelectorAll('[data-flogic]').forEach(function(btn){
    btn.addEventListener('click', function(){
      Q.filterLogic=btn.getAttribute('data-flogic');
      fillFilter(); renderActive();
    });
  });
}
function refreshPanel(){
  fillRange(); fillFilter(); renderTrendChips(); fillBreak(); fillSumProp(); fillWindow(); renderSteps(); fillExclude(); fillHold(); fillPropSelect('rbFunnelBreak',Q.funnel.breakdown); fillRet(); fillPropSelect('rbRetBreak',Q.ret.breakdown); fillFlows(); fillSaved();
}

function setType(t){
  Q.type=t;
  /* phase 4c: realtime windows are for trends and data tables; any other report falls back to the last 7 days */
  if(['trend','table'].indexOf(t)<0 && /^m\d+$|^today_sofar$/.test(String(Q.range))) Q.range='7d';
  document.querySelectorAll('#rbType .sh-seg-opt').forEach(function(o){ o.classList.toggle('on', o.getAttribute('data-rbtype')===t); });
  document.querySelectorAll('.rb-pane').forEach(function(p){ p.classList.toggle('show', p.getAttribute('data-pane')===t); });
  document.querySelectorAll('.rb-view').forEach(function(v){ v.classList.toggle('show', v.getAttribute('data-view')===t); });
  renderActive();
}
/* M1 parity (2026-11-16): a page that loads the engine without the builder's panes (the template gallery) has nothing to draw */
function hasPanes(){ return !!document.getElementById('trEmpty'); }
function renderActive(){
  if(!hasPanes()) return;
  if(Q.type==='trend') renderTrend();
  else if(Q.type==='funnel') renderFunnel();
  else if(Q.type==='flows') renderFlows();
  else if(['table','mex','stick','life','comp','emx','impact','compass','personas','exp'].indexOf(Q.type)>-1) return;   /* v12: the Data Table and Metric Explorer live only in the Amplitude builder */
  else renderRetention();
}
function renderAll(){ if(!hasPanes()) return; refreshPanel(); renderTrend(); renderFunnel(); renderRetention(); renderFlows(); }

/* ── wiring ── */
document.querySelectorAll('#rbType .sh-seg-opt').forEach(function(o){
  o.addEventListener('click', function(){ setType(o.getAttribute('data-rbtype')); });
});
function segWire(id, apply){
  document.querySelectorAll('#'+id+' .sh-seg-opt').forEach(function(o){
    o.addEventListener('click', function(){
      document.querySelectorAll('#'+id+' .sh-seg-opt').forEach(function(x){ x.classList.remove('on'); });
      o.classList.add('on');
      apply(o.getAttribute('data-val'));
      renderActive();
    });
  });
}
segWire('rbTrendCount', function(v){ Q.trend.count=v; fillSumProp(); });
segWire('rbTrendKind',  function(v){ Q.trend.kind=v; });
segWire('rbCompare',    function(v){ Q.trend.compare=v==='on'; });
segWire('rbFunnelCount',function(v){ Q.funnel.count=v; });
segWire('rbGran',       function(v){ Q.ret.gran=v; });
segWire('rbCrit',       function(v){ Q.ret.crit=v; });
segWire('rbFlowDir',    function(v){ Q.flows.dir=v; });
segWire('rbFlowDepth',  function(v){ Q.flows.depth=Number(v); });

on('rbRange','change', function(){ Q.range=this.value; renderActive(); });
on('rbTrendAdd','change', function(){
  if(!this.value) return;
  Q.trend.events.push(this.value);
  if(Q.trend.events.length!==1) Q.trend.breakdown='';
  refreshPanel(); renderActive();
});
on('rbBreak','change', function(){
  Q.trend.breakdown=this.value;
  if(!this.value||this.value===Q.trend.breakdown2) Q.trend.breakdown2='';
  fillBreak(); renderActive();
});
on('rbBreak2','change', function(){ Q.trend.breakdown2=this.value; fillBreak(); renderActive(); });
on('rbBreakAdd','change', function(){
  if(!this.value) return;
  if(!Q.trend.breakdown) Q.trend.breakdown=this.value;
  else if(!Q.trend.breakdown2&&this.value!==Q.trend.breakdown) Q.trend.breakdown2=this.value;
  fillBreak(); renderActive();
});
on('rbWindow','change', function(){ Q.funnel.win=this.value; renderActive(); });
on('rbExclude','change', function(){ Q.funnel.exclude=this.value; renderActive(); });
on('rbHold','change', function(){ Q.funnel.hold=this.value; renderActive(); });
on('rbBirth','change', function(){ if(this.value){ Q.ret.birth=this.value; renderActive(); } });
on('rbReturn','change', function(){ if(this.value){ Q.ret.ret=this.value; renderActive(); } });
on('rbFlowAnchor','change', function(){ if(this.value){ Q.flows.anchor=this.value; renderActive(); } });
on('rbFunnelBreak','change', function(){ Q.funnel.breakdown=this.value; renderActive(); });
on('rbRetBreak','change', function(){ Q.ret.breakdown=this.value; renderActive(); });
on('rbAddStep','click', function(){
  if(Q.funnel.steps.length>=5) return;
  Q.funnel.steps.push('');
  renderSteps();
});
on('trEmptyCta','click', function(){ var a=byId('rbTrendAdd'); if(a) a.focus(); });
on('fuEmptyCta','click', function(){
  if(Q.funnel.steps.length<2){ while(Q.funnel.steps.length<2) Q.funnel.steps.push(''); renderSteps(); }
  var s=document.querySelector('#rbSteps select'); if(s) s.focus();
});

/* saved reports */
on('rbSaved','change', function(){
  if(this.value==='') return;
  var s=SAVED[Number(this.value)];
  if(s.q.trend)  Q.trend=JSON.parse(JSON.stringify(s.q.trend));
  if(s.q.funnel) Q.funnel=JSON.parse(JSON.stringify(s.q.funnel));
  if(s.q.ret)    Q.ret=JSON.parse(JSON.stringify(s.q.ret));
  if(s.q.flows)  Q.flows=JSON.parse(JSON.stringify(s.q.flows));
  Q.filters=s.q.filters?JSON.parse(JSON.stringify(s.q.filters)):[];
  Q.filterLogic=s.q.filterLogic||'and';
  var nameEl=byId('rbName'); if(nameEl) nameEl.value=T(s.fa,s.en);
  refreshPanel();
  setType(s.type);
  if(window.Shahin) Shahin.toast('گزارش «'+s.fa+'» باز شد','Opened “'+s.en+'”');
});
on('rbSave','click', function(){
  var nameEl=byId('rbName'); if(!nameEl) return;
  var name=nameEl.value.trim();
  if(!name){
    nameEl.focus();
    if(window.Shahin) Shahin.toast('برای ذخیره، اول به گزارش نام بدهید','Give the report a name first');
    return;
  }
  SAVED.push({ fa:name, en:name, type:Q.type, q:{ trend:Q.trend, funnel:Q.funnel, ret:Q.ret, flows:Q.flows, filters:Q.filters, filterLogic:Q.filterLogic } });
  fillSaved();
  var savedSel=byId('rbSaved'); if(savedSel) savedSel.value=String(SAVED.length-1);
  if(window.Shahin) Shahin.toast('ذخیره شد — «'+name+'» برای همهٔ اعضای پروژه در دسترس است','Saved — “'+name+'” is available to every project member');
});

/* lang / theme reactivity */
document.addEventListener('shahin:lang', function(){ setTimeout(renderAll, 30); });
new MutationObserver(function(){ setTimeout(renderActive, 30); })
  .observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
var rsT=null;
window.addEventListener('resize', function(){
  clearTimeout(rsT);
  rsT=setTimeout(function(){ Object.keys(CH).forEach(function(k){ if(CH[k]&&!CH[k].isDisposed()) CH[k].resize(); }); },160);
});

/* ── boot: loading skeleton, deep-links ── */
var qs=new URLSearchParams(location.search);
var wantType=qs.get('type');
if(wantType&&['trend','funnel','retention','flows','table','mex','stick','life','comp','emx','impact','exp'].indexOf(wantType)!==-1) Q.type=wantType;   /* PM 2026-10-28, AC-11: Compass and Personas left the demo, so ?type= no longer opens them */
var grid=byId('rbGrid'), skel=byId('rbSkel');
function boot(){
  if(skel) skel.classList.remove('show');
  if(grid) grid.style.display='';
  refreshPanel();
  setType(Q.type);
  document.dispatchEvent(new CustomEvent('rb:boot'));
}
if(grid) grid.style.display='none';
if(skel) skel.classList.add('show');
if(qs.get('state')==='loading'){ /* stays skeletal — QA hook */ }
else { /* boot after every parser-inserted script has run (the page's own RBH lives in v12.html's inline script): a fixed 450 ms
         from this file's load raced it under load, e.g. a bridge card opening before RBH existed (QA md4a, 2026-10-20) */
  var goBoot=function(){ setTimeout(boot, 450); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', goBoot); else goBoot(); }
/* ── phase 4: a project's profile is applied once, before anything reads the catalog (Chakavak: no-op) ── */
var PROFILES={};
/* ── phase 4: project profiles (spec: research-notes/…/34-project-profiles.md) ──
   Each profile rescales the catalog it shares with Chakavak, swaps the value lists that differ for its kind of site, and brings
   its own sample reports. Chakavak (0) is the original data and has no entry here. */
function wset(E, id, w){ var e=E.filter(function(x){ return x.id===id; })[0]; if(e) e.w=w; }
function wscale(E, grp, k){ E.forEach(function(e){ if(e.grp===grp) e.w=Math.round(e.w*k); }); }
function pvals(P, prop, v, ev){ if(P[prop]){ P[prop].vals=v; if(ev!==undefined) P[prop].ev=ev; } }
var AMPTR=function(ev, o){ return Object.assign({ events:[{ id:ev, filters:[], groupBy:(o&&o.gb)||'' }], measure:(o&&o.m)||'uniques', viz:(o&&o.viz)||'line', interval:'auto' }, o&&o.extra||{}); };
PROFILES[1]={ name:['پلیکان','Pelikan'], kind:'video', apply:function(X){ var E=X.EVENTS, P=X.PROPS;
    /* a video-first site: plays ~120k/week on ~180k page views; no store; a VOD subscription */
    wscale(E,'auto',4.4); wscale(E,'video',4.2); if(P.video_title) P.video_title.card=1260; wscale(E,'ecom',0); E.forEach(function(e){ if(e.grp==='custom') e.w=0; });
    wset(E,'subscription_started',400); wset(E,'support_chat_opened',520);
    pvals(P,'page_path',[['/watch/*','/watch/*',0.52],['/','/',0.18],['/category/*','/category/*',0.14],['/search','/search',0.06],['سایر','Other',0.10]]);
    pvals(P,'entity_module',[['صفحهٔ ویدیو','Video page',0.56],['خانه','Home',0.18],['دسته','Category',0.14],['کانال','Channel',0.06],['سایر','Other',0.06]]);
    pvals(P,'breadcrumb_1_name',[['سرگرمی','Entertainment',0.31],['ورزش','Sport',0.22],['آموزش','Learning',0.16],['خبر','News',0.14],['کودک','Kids',0.09],['سایر','Other',0.08]]);
    pvals(P,'device_type',[['موبایل','Mobile',0.66],['دسکتاپ','Desktop',0.22],['تبلت','Tablet',0.05],['تلویزیون هوشمند','Smart TV',0.07]], null);
    X.SAVED.length=0;
    [{ fa:'شروع پخش به تفکیک دستگاه', en:'Plays by device', type:'trend', q:{ range:'30d', amp:AMPTR('video_started',{ gb:'device_type' }) } },
     { fa:'قیف تماشا تا پایان', en:'Watch-to-end funnel', type:'funnel', q:{ range:'30d', amp:{ events:[{ id:'video_started', filters:[], groupBy:'' },{ id:'video_progress', filters:[], groupBy:'' },{ id:'video_completed', filters:[], groupBy:'' }], funnel:{ count:'uniques' } } } },
     { fa:'اتمام آگهی', en:'Ad completion', type:'trend', q:{ range:'30d', amp:{ events:[{ id:'ads_video_started', filters:[], groupBy:'' },{ id:'ads_video_completed', filters:[], groupBy:'' }], measure:'totals', viz:'line', interval:'auto' } } },
     { fa:'شروع اشتراک', en:'Subscriptions started', type:'trend', q:{ range:'30d', amp:AMPTR('subscription_started',{ m:'totals' }) } }
    ].forEach(function(r){ X.SAVED.push(r); });
    X.ANNOT.length=0; X.ANNOT.push({ p:0.62, fa:'انتشار فصل جدید سریال', en:'New season released' });
  } };
PROFILES[2]={ name:['بامداد','Bamdad'], kind:'media', apply:function(X){ var E=X.EVENTS, P=X.PROPS;
    /* a news publisher: ~184k article views in ~235k page views a week; news videos; a paywall; no store */
    wscale(E,'auto',5.7); wscale(E,'video',0.9); if(P.video_title) P.video_title.card=420; wscale(E,'ecom',0); E.forEach(function(e){ if(e.grp==='custom'&&e.id!=='experiment_viewed') e.w=0; });
    wset(E,'subscription_started',300);
    wset(E,'article_read_started',150000); wset(E,'article_read_depth',410000); wset(E,'article_read_completed',58000); wset(E,'article_engagement_time',150000);
    pvals(P,'page_path',[['/news/*','/news/*',0.78],['/','/',0.09],['/section/*','/section/*',0.07],['/search','/search',0.02],['سایر','Other',0.04]]);
    pvals(P,'entity_module',[['مقاله','Article',0.78],['صفحهٔ اول','Home',0.09],['صفحهٔ سکشن','Section index',0.07],['جستجو','Search',0.02],['سایر','Other',0.04]]);
    /* phase 4a-2b: the Media dashboard's own lists (PM: the engine takes the page's lists) */
    pvals(P,'breadcrumb_1_name',[['سیاست','Politics',0.28],['حوادث','Incidents',0.21],['اقتصاد','Economy',0.19],['ورزش','Sports',0.14],['فرهنگ','Culture',0.10],['بین‌الملل','World',0.08]]);
    var SRC=[['ناوبری داخلی','Internal',0.34],['مستقیم و پیام‌رسان','Direct & messengers',0.27],['جستجو','Search',0.21],['شبکه اجتماعی','Social',0.11],['لینک سایت‌های دیگر','External links',0.07]];
    pvals(P,'referrer_type',SRC);
    pvals(P,'search_term',[['قیمت دلار','Dollar rate',0.081],['نتیجه بازی امروز','Today’s match result',0.064],['قطعی برق تهران','Tehran power cuts',0.047],['سهمیه بنزین','Fuel quota',0.038],['ثبت‌نام یارانه','Subsidy registration',0.035],['سایر','Other',0.735]]);
    if(P.hour_of_day) P.hour_of_day.ev=Object.assign({}, P.hour_of_day.ev, { page_view:[0.04,0.01,0.01,0.04,0.08,0.09,0.09,0.10,0.11,0.12,0.18,0.13] });   /* news peaks after the evening bulletin */
    /* article age in hours since publishing (the page's six buckets) plus views with no publish date, which the age chart sets aside */
    pvals(P,'article_age',[['۰ تا ۳ ساعت','0–3 h',0.283],['۳ تا ۶ ساعت','3–6 h',0.208],['۶ تا ۱۲ ساعت','6–12 h',0.184],['۱۲ تا ۲۴ ساعت','12–24 h',0.148],['۲۴ تا ۴۸ ساعت','24–48 h',0.086],['بیش از ۴۸ ساعت','48 h+',0.048],['بدون تاریخ انتشار','No publish date',0.043]]);
    /* the 18 articles of the page's table (share of article views) + the long tail; source = each article's top source */
    var ART=[['قیمت ارز در بازار امروز','Currency market today',6.8,'Direct & messengers',0.80],['جزئیات حادثه بامداد تهران','Overnight Tehran incident: details',5.1,'Direct & messengers',0.95],
      ['نتیجه دیدار تیم ملی','National team match result',4.4,'Search',0.85],['واکنش‌ها به مصوبه جدید مجلس','Reactions to the new parliament bill',3.7,'Direct & messengers',1.05],
      ['پیش‌بینی هوای آخر هفته','Weekend weather outlook',3.2,'Search',0.75],['جزئیات سهمیه‌بندی جدید بنزین','New fuel-quota details',3.0,'Direct & messengers',1.0],
      ['حواشی جلسه امروز دولت','Cabinet session highlights',2.6,'Internal',0.95],['گزارش بورس امروز؛ شاخص کل','Today’s stock market report',2.3,'Search',0.85],
      ['گفت‌وگو با برنده جایزه کتاب','Interview: book-award winner',2.1,'Search',1.30],['راهنمای ثبت‌نام دانشگاه','University enrolment guide',2.0,'Search',1.20],
      ['توقف واردات خودروهای کارکرده','Used-car import halt',1.9,'Social',1.0],['زلزله بامداد در جنوب کرمان','Overnight quake in southern Kerman',1.8,'Direct & messengers',0.90],
      ['برنامه بازی‌های هفته لیگ برتر','This week’s league fixtures',1.6,'Internal',0.80],['نرخ اجاره مسکن در پاییز','Autumn housing-rent rates',1.4,'Search',1.10],
      ['تحلیل پیامدهای توافق منطقه‌ای','Analysis: the regional deal’s fallout',1.2,'Internal',1.35],['منتخب فیلم‌های جشنواره امسال','This year’s festival picks',1.0,'Social',1.15],
      ['دستور پخت آش رشته','Ash-e reshteh recipe',0.9,'Search',1.25],['جدول قطعی برق استان‌ها','Provincial power-cut schedule',0.8,'Search',0.90]];
    var rest=1-ART.reduce(function(a,r){ return a+r[2]/100; },0), given={}, depth={}, eng={};
    pvals(P,'article_title',ART.map(function(r){ return [r[0],r[1],r[2]/100]; }).concat([['سایر','Other',rest]]));
    ART.forEach(function(r){ var sh=SRC.map(function(v){ return v[2]+(v[1]===r[3]?0.22:0); }), t=sh.reduce(function(a,b){ return a+b; },0); given[r[1]]=sh.map(function(x){ return +(x/t).toFixed(4); });
      depth[r[1]]=r[4]; eng[r[1]]=+(0.9+0.2*r[4]).toFixed(2); });
    if(P.referrer_type) P.referrer_type.given={ article_title:given };
    if(P.article_title){ P.article_title.num={ depth_percent:depth, active_time_sec:eng }; P.article_title.card=1900;
      /* the most-shared list isn't the most-read list */
      P.article_title.ev=Object.assign({}, P.article_title.ev, { share:ART.map(function(r,i){ return [0.09,0.058,0.05,0,0,0.038,0,0,0,0,0,0,0,0,0,0,0,0][i]||r[2]/200; }).concat([null]) });
      P.article_title.ev.share[4]=0.026; }
    E.forEach(function(e){ if(e.id==='page_view') e.props=(e.props||[]).concat(['article_title','article_age','hour_of_day']); if(e.id==='share') e.props=(e.props||[]).concat(['article_title']); });
    /* phase 4c-2: content tags on page views and article reads (the tags page's own list) */
    pvals(P,'tags',[['ترامپ','Trump',0.182],['انتخابات','Elections',0.122],['بورس','Stock market',0.084],['تنگه هرمز','Strait of Hormuz',0.057],['یارانه','Subsidy',0.048],
      ['قیمت دلار','USD rate',0.044],['هوش مصنوعی','Artificial intelligence',0.042],['تیم ملی','National team',0.037],['سینمای ایران','Iranian cinema',0.027],['آلودگی هوا','Air pollution',0.025],
      ['تحلیل بازار','Market analysis',0.022],['گرانی مرغ','Chicken prices',0.010],['مجلس','Parliament',0.11],['اقتصاد','Economy',0.16],['ورزش','Sports',0.12],['حوادث','Incidents',0.13]]);
    E.forEach(function(e){ if(['page_view','article_read_started','article_read_completed'].indexOf(e.id)>-1) e.props=(e.props||[]).concat(['tags']); });
    pvals(P,'device_type',[['موبایل','Mobile',0.74],['دسکتاپ','Desktop',0.22],['تبلت','Tablet',0.04]], null);
    pvals(P,'is_new_user',[['بازگشتی','Returning',0.43],['جدید','New',0.57]]);
    X.SAVED.length=0;
    [{ fa:'بازدید مقاله به تفکیک سکشن', en:'Article views by section', type:'trend', q:{ range:'7d', amp:AMPTR('page_view',{ gb:'breadcrumb_1_name', m:'totals' }) } },
     { fa:'خوانندگان بازگشتی', en:'Returning readers', type:'trend', q:{ range:'30d', amp:AMPTR('page_view',{ gb:'is_new_user' }) } },
     { fa:'قیف بازدید تا اشتراک', en:'Visit to subscription funnel', type:'funnel', q:{ range:'30d', amp:{ events:[{ id:'page_view', filters:[], groupBy:'' },{ id:'article_read_completed', filters:[], groupBy:'' },{ id:'subscription_started', filters:[], groupBy:'' }], funnel:{ count:'uniques' } } } },
     { fa:'خواندن تا پایان', en:'Read to the end', type:'trend', q:{ range:'7d', amp:{ events:[{ id:'article_read_started', filters:[], groupBy:'' },{ id:'article_read_completed', filters:[], groupBy:'' }], measure:'totals', viz:'line', interval:'auto' } } }
    ].forEach(function(r){ X.SAVED.push(r); });
    X.ANNOT.length=0; X.ANNOT.push({ p:0.48, fa:'پوشش زندهٔ انتخابات', en:'Live election coverage' });
  } };
PROFILES[3]={ name:['سارگپه','Starchap'], kind:'new', apply:function(X){
    /* a new project: the snippet is installed, nothing has arrived yet */
    X.EVENTS.forEach(function(e){ e.w=0; }); X.SAVED.length=0; X.ANNOT.length=0; } };

function applyProfile(p){ var P=PROFILES[p]; if(!p||!P) return; if(P.apply) P.apply({ EVENTS:EVENTS, PROPS:PROPS, SAVED:SAVED, ANNOT:ANNOT, SUM_AVG:SUM_AVG, FLOW_NEXT:typeof FLOW_NEXT!=='undefined'?FLOW_NEXT:null }); }
/* phase 4b: a channel's own referring domains (Organic → search engines, Social → social sites; Direct and Mail have no referring
   domain). Only a query that pins the channel sees this — unfiltered breakdowns are unchanged. */
if(PROPS.referrer_domain) PROPS.referrer_domain.given={ referrer_type:{ Organic:[0.86,0,0,0.11,0.03], Social:[0,0.58,0.38,0,0.04], Direct:[0,0,0,0,1], Mail:[0,0,0,0,1], Other:[0.05,0.05,0.05,0.02,0.83] } };
applyProfile(PROJECT);
/* switching project in the topbar reloads the page on the new project (the nav itself only stores the choice) */
/* PM 2026-10-25, WS-15: when the shell guards unsaved changes (SHAHIN_PROJECT_RELOAD), shahin-nav.js reloads after the dialog instead */
document.addEventListener('click', function(e){ if(window.SHAHIN_PROJECT_RELOAD) return; if(e.target&&e.target.closest&&e.target.closest('[data-proj-opt]')) setTimeout(function(){ location.reload(); }, 60); });
/* v12 fork of rb-engine-v9.js: adds periodUniques + jit/hstr/oneFilterFactor for the Amplitude builder. v9 fork note: also exposes rangeInfo/seriesR/axisLabels/filterFactor for board tiles */
/* expose the engine surface for version-specific layouts (v2 hub / v3 sentence) */
window.RB={ ORG:ORG, ID_SHARE:ID_SHARE, USER_DEF:USER_DEF, personK:personK, Q:Q, EVENTS:EVENTS, PROPS:PROPS, PROP_GROUPS:PROP_GROUPS, GLOBAL_PROPS:GLOBAL_PROPS, GRP:GRP, SAVED:SAVED,
  evById:evById, propsFor:propsFor, series:series, sum:sum, uf:uf,
  T:T, faN:faN, pc0:pc0, pc1:pc1,
  refreshPanel:refreshPanel, renderActive:renderActive, renderAll:renderAll, setType:setType,
  granAllowed:granAllowed, measureLabel:measureLabel, addAnnotation:addAnnotation,
  fillEventSelect:fillEventSelect, fillSaved:fillSaved, funnelData:funnelData, retData:retData, flowsData:flowsData, addVirtual:addVirtual, removeVirtual:removeVirtual, VIRTUALS:VIRTUALS,
  rangeInfo:rangeInfo, seriesR:seriesR, axisLabels:axisLabels, filterFactor:filterFactor,
  /* PM 2026-10-25, RB-12: the demo clock and the picked-range codecs, for the Jalali calendar and the cohort page */
  DEMO_NOW:DEMO_NOW, customRange:customRange, sinceRange:sinceRange, pickedRange:pickedRange, ymd:ymd,
  jit:jit, hstr:hstr, oneFilterFactor:oneFilterFactor, periodUniques:periodUniques, sharesFor:sharesFor,
  PROJECT:PROJECT, PROJECTS:[['چکاوک','Chakavak','store'],['پلیکان','Pelikan','video'],['بامداد','Bamdad','media'],['سارگپه','Starchap','new']] };
})();
